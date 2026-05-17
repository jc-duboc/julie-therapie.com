#!/usr/bin/env node
/**
 * Discover and refresh the Vidéos page from the YouTube channel.
 *
 *   1. Scrape the channel's /playlists page to enumerate every public playlist
 *      (title + ID). Falls back to manual entries only when this fails.
 *   2. Merge the discovered list with manual overrides in
 *      content/ressources/videos/_playlists.yml (pin order, custom slug,
 *      description, `hidden: true`).
 *   3. For each kept playlist, fetch the RSS feed and write
 *      content/ressources/videos/videos_<slug>.yml.
 *   4. Regenerate content/ressources/videos/index.qmd (Quarto page) with one
 *      `listing:` entry and one section per playlist.
 *   5. Remove stale videos_<slug>.yml for playlists no longer present.
 *
 * Pure Node 18+ (uses global fetch, no npm packages). Designed to run inside
 * the GitHub Actions build before `quarto render`, and locally on any machine
 * with Node 18+ (including the Node runtime bundled with Claude Desktop).
 *
 * Knobs (env vars):
 *   YT_CHANNEL_ID       Override the channel ID (default: Julie's channel)
 *   YT_SKIP_DISCOVERY=1 Skip channel scraping (use _playlists.yml as the only
 *                       source -- useful for offline / sandboxed builds)
 *
 * Flags:
 *   --quiet         Suppress progress output on stderr
 *   --allow-empty   Empty playlists don't count as failures
 *   --no-cleanup    Don't delete stale videos_<slug>.yml files
 *
 * Channel discovery is the deliberately-fragile path the user chose over the
 * YouTube Data API: it parses `ytInitialData` JSON embedded in the channel
 * HTML. If YouTube ever changes that structure the discovery step will fail
 * loudly, fall back to manual entries, and the daily cron will keep working
 * with whatever is pinned in _playlists.yml. To recover quickly: either
 * add a new line to _playlists.yml, or update extractPlaylistsFromHtml below.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const VIDEOS_DIR = join(ROOT, "content", "ressources", "videos");
const PLAYLISTS_FILE = join(VIDEOS_DIR, "_playlists.yml");
const INDEX_QMD = join(VIDEOS_DIR, "index.qmd");

const DEFAULT_CHANNEL_ID = "UCyU1pMTkUbKs0dfjNg8aGjg";
const CHANNEL_ID = process.env.YT_CHANNEL_ID || DEFAULT_CHANNEL_ID;
const SKIP_DISCOVERY = process.env.YT_SKIP_DISCOVERY === "1";

const FEED_URL = (pid) => `https://www.youtube.com/feeds/videos.xml?playlist_id=${pid}`;
const CHANNEL_URL = (cid) => `https://www.youtube.com/channel/${cid}/playlists`;

// Consent + locale cookies that make YouTube serve the public HTML instead of
// redirecting to the EU consent wall. Picked so the fetch works from EU
// runners too.
const CHANNEL_FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    "Cookie": "CONSENT=YES+1; SOCS=CAI",
};

const args = new Set(process.argv.slice(2));
const QUIET = args.has("--quiet");
const ALLOW_EMPTY = args.has("--allow-empty");
const NO_CLEANUP = args.has("--no-cleanup");

const log = (...m) => { if (!QUIET) console.error(...m); };
const errlog = (...m) => console.error(...m);

// ---------------------------------------------------------------------------
// Manual playlist overrides (line-based YAML reader so we don't pull a YAML lib).
// ---------------------------------------------------------------------------

function readManualPlaylists() {
    if (!existsSync(PLAYLISTS_FILE)) return [];
    const text = readFileSync(PLAYLISTS_FILE, "utf8");
    const entries = [];
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/\s+$/, "");
        if (!line || line.trimStart().startsWith("#")) continue;
        if (line.startsWith("- ")) {
            if (current) entries.push(current);
            current = {};
            const rest = line.slice(2).trim();
            if (rest) parseKV(rest, current);
        } else if (current) {
            parseKV(line.trim(), current);
        }
    }
    if (current) entries.push(current);
    // Coerce hidden into a bool.
    for (const e of entries) {
        if (typeof e.hidden === "string") e.hidden = /^(true|yes|1)$/i.test(e.hidden);
    }
    return entries;
}

function parseKV(s, dst) {
    const idx = s.indexOf(":");
    if (idx < 0) return;
    const key = s.slice(0, idx).trim();
    let val = s.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    dst[key] = val;
}

// ---------------------------------------------------------------------------
// Channel scraping
// ---------------------------------------------------------------------------

async function discoverPlaylistsFromChannel(channelId) {
    const res = await fetch(CHANNEL_URL(channelId), {
        headers: CHANNEL_FETCH_HEADERS,
        redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${CHANNEL_URL(channelId)}`);
    const finalUrl = res.url || "";
    if (finalUrl.includes("consent.youtube.com")) {
        throw new Error(`Redirected to consent wall: ${finalUrl}`);
    }
    const html = await res.text();
    return extractPlaylistsFromHtml(html);
}

/**
 * Extract { id, title } pairs from the channel HTML.
 *
 * YouTube's channel page embeds `ytInitialData` JSON in a <script> tag. Each
 * playlist tile is a `lockupViewModel` with:
 *   "contentId": "PL..."
 *   "contentType": "LOCKUP_CONTENT_TYPE_PLAYLIST"
 *   "metadata": {"lockupMetadataViewModel": {"title": {"content": "Playlist Title"}}}
 *
 * We split on `"lockupViewModel":` and pattern-match inside each chunk -- robust
 * to small DOM tweaks since we don't depend on tree shape, just nearby JSON keys.
 */
function extractPlaylistsFromHtml(html) {
    const out = [];
    const seen = new Set();
    const chunks = html.split('"lockupViewModel":');
    for (let i = 1; i < chunks.length; i++) {
        const c = chunks[i].slice(0, 8000);
        const idM = c.match(/"contentId":"(PL[A-Za-z0-9_-]{16,40})"[\s\S]{0,200}?"contentType":"LOCKUP_CONTENT_TYPE_PLAYLIST"/);
        if (!idM) continue;
        if (seen.has(idM[1])) continue;
        seen.add(idM[1]);
        const titleM = c.match(/"metadata":\{"lockupMetadataViewModel":\{"title":\{"content":"([^"]+)"/);
        out.push({ id: idM[1], title: titleM ? decodeJsonString(titleM[1]) : `Playlist ${idM[1]}` });
    }
    return out;
}

function decodeJsonString(s) {
    return s
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
}

// ---------------------------------------------------------------------------
// Merge logic: manual entries take precedence; discovered-only entries get
// appended with an auto-derived slug.
// ---------------------------------------------------------------------------

function mergePlaylists(manual, discovered) {
    const discoveredById = new Map(discovered.map((p) => [p.id, p]));
    const usedSlugs = new Set(manual.map((p) => p.slug).filter(Boolean));
    const merged = [];

    // First pass: keep manual order, enrich title from discovered when available.
    const manualIds = new Set();
    for (const m of manual) {
        if (!m.id) continue;
        manualIds.add(m.id);
        const d = discoveredById.get(m.id);
        merged.push({
            id: m.id,
            slug: m.slug || uniqueSlug(slugify(m.title || d?.title || m.id), usedSlugs),
            title: m.title || d?.title || `Playlist ${m.id}`,
            description: m.description || "",
            hidden: m.hidden === true,
            source: "manual",
        });
    }

    // Second pass: append discovered playlists not present in manual.
    for (const d of discovered) {
        if (manualIds.has(d.id)) continue;
        merged.push({
            id: d.id,
            slug: uniqueSlug(slugify(d.title), usedSlugs),
            title: d.title,
            description: "",
            hidden: false,
            source: "discovered",
        });
    }
    return merged;
}

function slugify(s) {
    const cleaned = String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return cleaned || "playlist";
}

function uniqueSlug(base, used) {
    if (!used.has(base)) {
        used.add(base);
        return base;
    }
    let i = 2;
    while (used.has(`${base}-${i}`)) i++;
    const out = `${base}-${i}`;
    used.add(out);
    return out;
}

// ---------------------------------------------------------------------------
// Per-playlist RSS feed -> videos_<slug>.yml
// ---------------------------------------------------------------------------

async function fetchFeed(playlistId) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
        const res = await fetch(FEED_URL(playlistId), {
            headers: { "User-Agent": "julie-therapie-fetcher/1.0" },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
    } finally {
        clearTimeout(timer);
    }
}

function parseFeed(xml) {
    const videos = [];
    const re = /<entry>([\s\S]*?)<\/entry>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        const entry = m[1];
        videos.push({
            videoId:     extract(entry, "yt:videoId"),
            title:       extract(entry, "title"),
            url:         extractAttr(entry, "link", "href"),
            published:   extract(entry, "published"),
            thumbnail:   extractAttr(entry, "media:thumbnail", "url"),
            description: extract(entry, "media:description"),
        });
    }
    return videos;
}

function extract(entryXml, tag) {
    const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
    const m = entryXml.match(re);
    return m ? decodeXmlEntities(m[1].trim()) : "";
}

function extractAttr(entryXml, tag, attr) {
    const re = new RegExp(`<${tag}\\b[^>]*\\b${attr}="([^"]*)"[^>]*\\/?>`);
    const m = entryXml.match(re);
    return m ? decodeXmlEntities(m[1]) : "";
}

function decodeXmlEntities(s) {
    return s
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&amp;/g, "&");
}

function renderVideosYaml(videos, playlistTitle) {
    const lines = [
        "# Auto-generated by scripts/fetch-youtube-playlists.mjs.",
        `# Source: playlist "${playlistTitle}". Do not edit by hand.`,
        "",
    ];
    for (const v of videos) {
        lines.push(`- title: ${yamlEscape(v.title)}`);
        lines.push(`  path: ${yamlEscape(v.url)}`);
        lines.push(`  video-id: ${yamlEscape(v.videoId)}`);
        lines.push(`  image: ${yamlEscape(v.thumbnail)}`);
        lines.push(`  date: ${yamlEscape(toIsoDate(v.published))}`);
        lines.push(`  description: ${yamlEscape(firstLine(v.description))}`);
        lines.push(`  categories: [${yamlEscape(playlistTitle)}]`);
        lines.push("");
    }
    return lines.join("\n").trimEnd() + "\n";
}

function yamlEscape(s) {
    return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function firstLine(s, maxChars = 240) {
    let v = String(s).replace(/\r/g, "").trim().split(/\n\s*\n/)[0];
    v = v.split(/\s+/).join(" ");
    if (v.length > maxChars) v = v.slice(0, maxChars - 1).trimEnd() + "…";
    return v;
}

function toIsoDate(published) {
    if (!published) return "";
    const d = new Date(published);
    if (Number.isNaN(d.getTime())) return published.slice(0, 10);
    return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// index.qmd generation
// ---------------------------------------------------------------------------

const INTRO_MD = `::: {.section-intro}

Les vidéos ci-dessous sont chargées **automatiquement** depuis ma chaîne YouTube
[@juliechristineduboc](https://www.youtube.com/@juliechristineduboc). Cliquer sur la vignette
lance la lecture **dans la page** ; cliquer sur le titre ouvre la vidéo sur YouTube. La liste
est rafraîchie quotidiennement.

:::`;

const OUTRO_MD = `---

[→ Voir la chaîne YouTube complète](https://www.youtube.com/@juliechristineduboc){.btn .btn-outline-primary}`;

function renderIndexQmd(playlists) {
    const listingEntries = playlists.map((p) => `  - id: ${p.slug}
    contents: videos_${p.slug}.yml
    type: grid
    grid-columns: 3
    image-height: 180px
    sort: "date desc"
    fields: [image, title, description, date]
    categories: false
    sort-ui: false
    filter-ui: false
    feed: false
    template: video-card.ejs`).join("\n");

    const sections = playlists.map((p) => {
        const desc = p.description ? `\n*${p.description}*\n` : "";
        return `## ${p.title}\n${desc}\n::: {#${p.slug}}\n:::\n`;
    }).join("\n");

    return `---
# THIS FILE IS AUTO-GENERATED by scripts/fetch-youtube-playlists.mjs.
# Edit _playlists.yml to override slug/title/description/order, or to hide a
# playlist (hidden: true). The intro and outro live in the script.
title: "Vidéos"
subtitle: "Les vidéos de ma chaîne YouTube, groupées par playlist"

description-meta: "Vidéos de la chaîne YouTube de Julie-Christine Duboc, psychologue clinicienne et psychothérapeute, organisées par playlist (éducation, témoignages, émissions). Contenus en complément du travail thérapeutique."

listing:
${listingEntries}

page-layout: full

include-after-body:
  text: |
    <script src="/libs/play-video.js" defer></script>
---

${INTRO_MD}

${sections}
${OUTRO_MD}
`;
}

function cleanupStaleYamls(keepSlugs) {
    const keep = new Set(keepSlugs.map((s) => `videos_${s}.yml`));
    let removed = 0;
    for (const name of readdirSync(VIDEOS_DIR)) {
        if (!name.startsWith("videos_") || !name.endsWith(".yml")) continue;
        if (keep.has(name)) continue;
        unlinkSync(join(VIDEOS_DIR, name));
        log(`  ! removed stale ${name}`);
        removed++;
    }
    return removed;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const manual = readManualPlaylists();
    log(`manual entries in _playlists.yml: ${manual.length}`);

    let discovered = [];
    if (!SKIP_DISCOVERY) {
        try {
            discovered = await discoverPlaylistsFromChannel(CHANNEL_ID);
            log(`discovered ${discovered.length} playlist(s) on channel ${CHANNEL_ID}`);
        } catch (e) {
            errlog(`! channel discovery failed: ${e.message}`);
            errlog(`  falling back to manual _playlists.yml only`);
        }
    } else {
        log(`discovery skipped (YT_SKIP_DISCOVERY=1)`);
    }

    const merged = mergePlaylists(manual, discovered);
    const visible = merged.filter((p) => !p.hidden);
    if (visible.length === 0) {
        errlog("error: no playlists to render (manual list is empty and discovery failed)");
        process.exit(2);
    }

    let failures = 0;
    for (const pl of visible) {
        log(`fetch: ${pl.title} (${pl.id}) [${pl.source}]`);
        try {
            const xml = await fetchFeed(pl.id);
            const videos = parseFeed(xml);
            if (videos.length === 0 && !ALLOW_EMPTY) {
                errlog(`  ! no entries returned for ${pl.title}`);
                failures++;
                continue;
            }
            const outPath = join(VIDEOS_DIR, `videos_${pl.slug}.yml`);
            writeFileSync(outPath, renderVideosYaml(videos, pl.title), "utf8");
            log(`  -> ${relative(ROOT, outPath)} (${videos.length} video${videos.length === 1 ? "" : "s"})`);
        } catch (e) {
            errlog(`  ! ${e.message}`);
            failures++;
        }
    }

    writeFileSync(INDEX_QMD, renderIndexQmd(visible), "utf8");
    log(`wrote ${relative(ROOT, INDEX_QMD)} (${visible.length} section${visible.length === 1 ? "" : "s"})`);

    if (!NO_CLEANUP) cleanupStaleYamls(visible.map((p) => p.slug));

    process.exit(failures ? 1 : 0);
}

main().catch((e) => { errlog(e); process.exit(2); });
