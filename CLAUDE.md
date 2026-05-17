# Guidelines

Take your time before answering. Depth and genuine engagement matter more than speed. Treat every question as worth thinking through slowly and with maximum effort. The thinking is not preparation for the answer, the thinking IS the answer finding its shape.

## Communication

- Brutal honesty. Realistic takes over maybes. Be skeptical. Criticism welcome.
- Answer concisely. No fluff. Keep explanations short.
- Ask questions when intent is unclear. Don't guess.
- Don't mimic user's tone or emotional undertone.

## Workflow

- Always read the project's local `CLAUDE.md` if one exists.
- When a project contains `.claude/skills/*/SKILL.md`, list those skills before starting work and read the relevant skill when the task matches it.
- Use `date` command before web searches to know the precise current date.
- Limit actions to what's required for the user's request.
- Keep reasoning private; present conclusions and key steps.
- Remind user to reload/re-source/re-install modified files before running dependent code. Do it yourself if you can.

## Context Engineering

You are a CONTEXT ENGINEER. Every irrelevant token degrades response quality. Trim context to precisely what's needed.
- If you don't care about the output of a command, pipe it to /dev/null
- If there might be information you need in the output, pipe it to a /tmp/ file and grep it with relevnt filters/regex to get only what you need.
- Avoid reading entire files, unless they are small. Always grep first to explore.
- When a command has a 'quiet' flag, use it.
- Use `| tail` when only the last outputs/lines are relevant.

## Subagent Discipline

- Prefer inline work for tasks under ~5 tool calls. Subagents have overhead — don't delegate trivially.
- When using subagents, include output rules: "Final response under 2000 characters. List outcomes, not process."
- Never call TaskOutput twice for the same subagent. If it times out, increase the timeout — don't re-read.

## File Reading

- Read files with purpose. Before reading a file, know what you're looking for.
- Use Grep to locate relevant sections before reading entire large files.
- Never re-read a file you've already read in this session, unless it has changed.
- For files over 500 lines, use offset/limit to read only the relevant section.

## Responses

- Don't echo back file contents you just read, the user can see them.
- Don't narrate tool calls ("Let me read the file..." / "Now I'll edit..."). Just do it.
- Keep explanations proportional to complexity. Simple changes need one sentence, not three paragraphs.
- Do not try to estimate cost and time required to implement a project/feature, unless explicitely asked.

# This project

Site du **cabinet de psychothérapie de Julie-Christine Duboc**, psychologue clinicienne (Master psychologie clinique Paris 8, 2016 ; DU Victimologie Paris 5, 2020)

## Stack

- **Quarto 1.9+** (site type `website`), engine `knitr` mais pas de code à exécuter pour l'instant
- **Thème :** custom via `_brand.yml` (palette bleu marine -> bleu glace + accent ambré pour les
  avertissements) + `libs/styles.scss`
- **Extensions :** `quarto-ext/fontawesome` (shortcode `{{< fa ... >}}`) et `mcanouil/iconify`
  (shortcode `{{< iconify ... >}}`) -- déjà installées dans `_extensions/`
- **Polices :** Lora (titres, serif), Inter (corps, sans)
- **Hébergement :** GitHub Pages, déploiement via GitHub Actions sur push vers `main` (repo: jc-duboc/julie-therapie.com, public)
- **Domaine :** `julie-therapie.com` (CNAME en racine)

## Conventions

- **Tout le contenu visiteur est en français.** Les commentaires internes (README, CLAUDE.md,
  noms de fichiers) peuvent rester en français aussi -- c'est cohérent et lisible pour elle.
- **Pas d'emojis dans le contenu rendu.** Utiliser `{{< fa nom-icone >}}` pour les pictos.
- **Pas de cookies analytiques ni de traceurs** (secret professionnel, public sensible).
- **Liens internes :** chemins relatifs (`../prise-de-rdv/index.qmd`) ou absolus depuis la racine
  (`/content/...`).
- **Images :** dans `res/img/`. Placeholders SVG en attendant les vraies (photo de profil, logo,
  og-image).
- **Sections marquées `<!-- TODO ... -->`** ou avec des callouts « à venir / en construction » :
  remplir au fil de l'eau, ne pas inventer de contenu factuel (publications, tarifs précis non
  confirmés, etc.).

## Fichiers clés

- `_quarto.yml` -- configuration site, navbar (avec dropdown Ressources), footer, bandeau
  d'annonce
- `_brand.yml` -- couleurs (palette bleu marine -> bleu glace + cream + amber) et typographie
- `libs/styles.scss` -- styles personnalisés (cards, tags, tariff-table, contact-grid,
  video-card...)
- `index.qmd` -- page d'accueil avec layout `about: trestles`
- `content/*/index.qmd` -- pages de contenu
- `content/ressources/videos/` -- listing-driven : `index.qmd` + `video-card.ejs` (template
  Quarto, **doit** être enveloppé dans ```` ```{=html} ```` pour éviter que Pandoc traite
  les lignes indentées comme un code block) + `videos_*.yml` (auto-générés par le script Node)
- `scripts/fetch-youtube-playlists.mjs` -- récupère les flux RSS YouTube et écrit les YAML
  consommés par le listing. Node 18+, zéro dépendance.
- `.github/workflows/publish.yml` -- déploiement automatique sur push + cron quotidien
  04:17 UTC pour rafraîchir la liste des vidéos sans commit.

## Mode encryption (phase pre-launch)

Tant que le site n'est pas officiellement ouvert, l'intégralité de `_site/` est chiffrée par
[`staticrypt`](https://github.com/robinmoisson/staticrypt) directement dans la pipeline GitHub
Actions (inspiré de `robjhyndman/quarto-password`). Conséquences :

- Le mot de passe est stocké dans le secret GitHub Actions `SITE_PASSWORD` (Settings > Secrets and
  variables > Actions). Rotation : modifier le secret puis relancer le workflow.
- `publish.yml` neutralise tous les fichiers non-HTML qui fuiteraient du contenu avant le
  chiffrement, parce que staticrypt ne chiffre que les fichiers HTML :
  - **suppression** de `search.json`, `listings.json`, `sitemap.xml`, `llms.txt` ;
  - **réécriture** de `robots.txt` en `Disallow: /` pour empêcher Google d'indexer les pages
    de mot de passe staticrypt (sinon pollution durable de l'index, survit au lancement).
- La recherche Quarto est donc cassée tant que le mode encryption est actif -- c'est volontaire.
- Pour retirer la protection au lancement public : supprimer toutes les étapes entre
  `Render Quarto site` et `Upload artifact` dans `publish.yml`, puis retirer aussi le secret du
  repo et le bandeau « site en construction » dans `_quarto.yml`. **Tout le reste** (robots.txt
  final, llms.txt, JSON-LD, sitemap auto-généré) s'active alors automatiquement, voir la
  section SEO et Découvrabilité plus bas.

## SEO

Le site est instrumenté pour être trouvable par les moteurs de recherche et par les assistants
IA dès la levée de l'encryption. Ce qui est déjà en place :

- **`robots.txt`** (racine) : version finale « allow all » + liste explicite des bots LLM
  autorisés (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.). Référence la sitemap.
  **Pendant l'encryption**, `publish.yml` l'écrase par `Disallow: /` ; la version finale
  réapparaît dès que l'étape `Strip content-leaking artefacts` est supprimée.
- **`llms.txt`** (racine, spec [llmstxt.org](https://llmstxt.org)) : sommaire structuré du
  site (titre + résumé en blockquote + liens vers les pages principales et secondaires) destiné
  aux crawlers LLM. Supprimé pendant l'encryption, servi en clair après.
- **`libs/jsonld.html`** : Schema.org JSON-LD de type `Psychologist` injecté dans le `<head>`
  de chaque page via `format.html.include-in-header` dans `_quarto.yml`. Contient identité,
  RPPS, coordonnées, adresse régionale, horaires, langues, spécialités, diplômes et
  credentials. **Chiffré avec le reste du HTML pendant l'encryption**, devient lisible dès la
  levée. À mettre à jour si Julie change ses tarifs, sa zone d'activité, ses formations.
- **`description-meta` par page** : chaque `*.qmd` a un `description-meta` dans son front
  matter, qui devient `<meta name="description">` dans le HTML rendu. La page Vidéos est
  auto-générée -- la ligne est ajoutée par `scripts/fetch-youtube-playlists.mjs`.
- **OpenGraph / Twitter Card** : déjà configurés dans `_quarto.yml`, image à
  `/res/img/og-image.png`.
- **Sitemap** : Quarto la génère automatiquement (`_site/sitemap.xml`), supprimée pendant
  l'encryption, présente dès la levée.

## Découvrabilité

Le SEO on-site ci-dessus pèse beaucoup moins que la présence locale pour un cabinet de
psychothérapie. Pour Julie, l'impact réel proviendra de :

1. **Google Business Profile**: ce qui apparaît dans Google Maps et dans le panneau de droite des recherches « psychologue [ville] ».
2. **Doctolib**, même sans système de réservation en ligne (Julie utilise virement + téléphone).
   Une fiche profil sur Doctolib remonte presque toujours en première page Google pour les recherches santé. Backlink à très forte autorité.
3. **Psychologue.net, Therapeutes.com, Annuaire des thérapeutes**: annuaires français spécialisés, gratuit ou freemium. Backlinks supplémentaires.
4. **Google Search Console**: une fois le site lancé, ajouter `julie-therapie.com`, soumettre le sitemap (`https://julie-therapie.com/sitemap.xml`) pour accélérer l'indexation initiale.
5. **Bing Webmaster Tools**: même chose pour Bing (et donc indirectement pour ChatGPT Search, qui utilise l'index Bing).

A vérifier quand le site sera lancé/décrypté.

## Installer le projet sur un nouvel ordinateur

### Audit au premier contact

À la première session sur une machine, vérifier les outils disponibles et installer ceux qui manquent:

```powershell
git --version          # >= 2.40
node --version         # >= 18 (idéalement LTS 20+)
quarto --version       # >= 1.9
gh auth status         # doit indiquer "Logged in"
```

Installer **sans poser de question** (sauf pour `gh auth login` qui ouvre un navigateur et requiert son action).
Tous les outils ci-dessous sont disponibles via `winget` (préinstallé sur Windows 10/11) :

| Outil | Commande d'installation | Rôle |
|---|---|---|
| Git | `winget install --id Git.Git -e --source winget` | Cloner, commit, push |
| Node.js LTS | `winget install --id OpenJS.NodeJS.LTS -e --source winget` | Script YouTube |
| Quarto | `winget install --id Quarto.Quarto -e --source winget` | Aperçu / rendu local |
| GitHub CLI | `winget install --id GitHub.cli -e --source winget` | Auth Git + push |

**Après une installation winget, fermer puis rouvrir le terminal** pour rafraîchir le PATH. Si
Claude Code tourne dans un terminal intégré qui ne peut pas être rouvert, lancer un nouveau
shell explicitement (`pwsh` ou `cmd`) plutôt que d'insister sur celui en cours.

### Configuration Git (une seule fois)

```powershell
git config --global user.name "Julie-Christine Duboc"
git config --global user.email "76654041+jc-duboc@users.noreply.github.com"
gh auth login
# Choisir : GitHub.com -> HTTPS -> Authenticate Git with GitHub credentials -> Login with browser
```

L'email est l'adresse proxy GitHub (« noreply ») de l'utilisateur : elle apparaît dans le
`git log` public à la place de sa vraie adresse, tout en attribuant correctement les commits à
son profil. **Ne jamais remplacer cette adresse par son email personnel** -- ce dépôt est
public et tout commit pousserait l'adresse en clair pour les scrapers.

`gh auth login` configure aussi le credential helper Git, donc `git push` ne demandera plus de
mot de passe ensuite.

### Premier clone

Cloner dans un dossier facile à retrouver :

```powershell
cd $HOME\Documents # Par défaut. Demander confirmation a l'utilisateur
git clone https://github.com/jc-duboc/julie-therapie.com.git
cd julie-therapie.com
```

### Cycle de modification

1. Si il y a des modifications non-commit/pushed au démarrage d'une nouvelle session, le signaler a l'utilisateur et proposer de publier/mettre a jour le site avant de commencer une nouvelle session de modifications.
2. Toujours effectuer un `git pull` en début de session/chat.
3. Toujours lancer `quarto preview` en arrière-plan et donner l'URL locale (typiquement `http://localhost:4444`) pour que l'utilisateur voie le rendu des changements effectués en temps réel.
4. Si les instructions sont claires, faire les modifications demandées sans demander confirmation.

### Publication (à la demande de l'utilisateur, sans confirmation supplémentaire)

Quand l'utilisateur demande de **publier / synchroniser / mettre à jour / envoyer en ligne** le
site (peu importe les mots exacts -- « publie », « synchronise », « envoie en ligne », « mets
à jour le site », « pousse »...), exécuter d'une traite, **sans redemander confirmation** :

1. `git status` puis `git add <fichiers>`
2. `git commit -m "..."` avec un message descriptif, sans co-author Claude (c'est un site professionnel maintenu par une seule personne, pas un projet collaboratif).
3. `git push`.
4. **Vérifier le déploiement** (i.e. status de la pipeline CI/CD) pour pouvoir confirmer qu'il n'y a pas eu de soucis. Si il y en a, les corriger automatiquement.
```powershell
gh run watch --exit-status
# ou si plusieurs runs concurrents :
gh run list --workflow=publish.yml --limit 3
gh run view <run-id> --log-failed   # uniquement si le run a échoué
```

### Règles d'interaction

- **Pas de jargon technique** non expliqué : « le terminal » plutôt que « PowerShell », « la
  navbar » avec une parenthèse « (le menu en haut) » la première fois, etc.
- **Confirmation avant toute action destructive** : suppression de fichier, `git reset`, force push, ...
- Si une commande échoue : **traduire l'erreur en une phrase claire** et proposer une action. Ne pas coller la stack trace brute.
- Ne jamais toucher au secret GitHub Actions `SITE_PASSWORD` sans demande explicite de l'utilisateur.

## Anti-patterns à éviter

- **Ne pas** ajouter Google Analytics ou tout autre tracker (le `_quarto.yml` ne doit pas le faire
  -- public sensible, RGPD strict pour les professions de santé).
- **Ne pas** insérer de contenu médical ou de diagnostic dans les pages : on parle de ce qu'elle
  accompagne, pas de définir ou traiter telle ou telle pathologie.
- **Ne pas** inventer de publications, formations, partenariats. Si l'info n'est pas connue,
  marquer « à venir » ou demander.
- **Ne pas** supprimer le bandeau « site en construction » sans validation explicite -- il évite
  qu'un visiteur attribue à un cabinet ouvert des infos provisoires.
