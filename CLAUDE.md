# CLAUDE.md

Contexte projet pour les agents IA. Lire avant toute modification.

## Pour qui

Site du **cabinet de psychothérapie de Julie-Christine Duboc** :

- Psychologue clinicienne (Master psychologie clinique Paris 8, 2016 ; DU Victimologie Paris 5, 2020)
- RPPS : 10009226225
- Nouveau cabinet à **St Vigor (Seine-Maritime, près du Havre)** -- adresse précise à confirmer
- Consultations majoritairement en **téléconsultation** ; présentiel possible pour la première
  séance à St Vigor
- **Toutes les séances sont hors conventionnement Sécurité sociale**, payables par anticipation
  par virement (pas de mention de *Mon soutien psy* / SS sur le site -- choix explicite de Julie)
- Langues : français, anglais, espagnol

## Ce qu'elle veut du site

Tiré du brouillon manuscrit (voir `TODO.md`) :

1. **Une page d'accueil** : photo, résumé biographique, formation, spécialités, problématiques
   prises en charge, langues, lien de prise de rendez-vous.
2. **Une page « Problèmes traités »** : catégories (trauma, anxiété, dépression, TSA, TDAH,
   couple, estime de soi...) avec résumé succinct et tags qui renvoient aux outils.
3. **Une page « Consultations & tarifs »** : 4 formats (psychothérapie verbale, psychocorporelle,
   séance mixte 1h30, couple 1h30) avec tarifs. **Aucun conventionnement Sécurité sociale** --
   ne pas réintroduire de mention SS / *Mon soutien psy* sans validation explicite.
4. **Une page « Prise de rendez-vous »** : téléphone, SMS, mail, WhatsApp, Messenger ; règle :
   créneau réservé uniquement après paiement par virement ; non-paiement à J-72h libère le
   créneau.
5. **Une section « Ressources »** avec dropdown nav :
   - *Vidéos* : listing automatique de la chaîne YouTube
     [@juliechristineduboc](https://www.youtube.com/@juliechristineduboc), groupé par playlist
     (alimenté par `scripts/fetch-youtube-playlists.mjs` à chaque build + cron quotidien dans
     GH Actions).
   - *Livres* : bibliographie thématique (stub à remplir).
   - *Outils* : fiches outils par thématique (Trauma, Estime de soi, etc. -- stub à remplir).
6. **Une page « À propos »** : CV, publications, réseaux sociaux (LinkedIn, FB, Insta).

Ton attendu : **professionnel, bienveillant, accessible** -- ni clinique sec, ni new age. Pas
d'emojis dans le corps de texte (les icônes FontAwesome sont OK).

Approche thérapeutique centrale, à mettre en avant : *« Tout symptôme est la résultante d'une
cause -- on traite la cause »*. Le **trauma** est l'angle d'entrée privilégié.

## Stack

- **Quarto 1.9+** (site type `website`), engine `knitr` mais pas de code à exécuter pour l'instant
- **Thème :** custom via `_brand.yml` (palette bleu marine -> bleu glace + accent ambré pour les
  avertissements) + `libs/styles.scss`
- **Extensions :** `quarto-ext/fontawesome` (shortcode `{{< fa ... >}}`) et `mcanouil/iconify`
  (shortcode `{{< iconify ... >}}`) -- déjà installées dans `_extensions/`
- **Polices :** Lora (titres, serif), Inter (corps, sans)
- **Hébergement :** GitHub Pages, déploiement via GitHub Actions sur push vers `main`
- **Domaine :** `julie-therapie.com` (CNAME en racine ; DNS Namecheap à configurer)

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

## Données qui restent à confirmer

À **demander à Julie** avant publication officielle :

- [ ] Adresse exacte du cabinet à St Vigor
- [ ] Téléphone définitif du nouveau cabinet (actuel temporaire : 02 77 16 11 18)
- [ ] Email professionnel (actuel temporaire : `contact@julie-therapie.com`)
- [ ] Numéro ADELI
- [ ] Photo de profil
- [ ] Logo (ou s'il faut en commander un)
- [ ] Liens Facebook, Instagram, YouTube (s'ils existent / quand ils existeront)
- [ ] Publications et formations à lister sur la page « À propos »
- [ ] Confirmer le compte / org GitHub qui hébergera le repo

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
- `publish.yml` supprime `search.json`, `listings.json` et `sitemap.xml` avant le chiffrement
  parce que staticrypt ne chiffre que les fichiers HTML : sans ce nettoyage, le contenu indexé
  fuiterait via ces fichiers en clair. La recherche Quarto est donc cassée tant que le mode
  encryption est actif -- c'est volontaire.
- Pour retirer la protection au lancement public : supprimer toutes les étapes entre
  `Render Quarto site` et `Upload artifact` dans `publish.yml`, puis retirer aussi le secret du
  repo et le bandeau « site en construction » dans `_quarto.yml`.

## Anti-patterns à éviter

- **Ne pas** ajouter Google Analytics ou tout autre tracker (le `_quarto.yml` ne doit pas le faire
  -- public sensible, RGPD strict pour les professions de santé).
- **Ne pas** insérer de contenu médical ou de diagnostic dans les pages : on parle de ce qu'elle
  accompagne, pas de définir ou traiter telle ou telle pathologie.
- **Ne pas** inventer de publications, formations, partenariats. Si l'info n'est pas connue,
  marquer « à venir » ou demander.
- **Ne pas** supprimer le bandeau « site en construction » sans validation explicite -- il évite
  qu'un visiteur attribue à un cabinet ouvert des infos provisoires.

## Inspiration / références

- Brouillon manuscrit dans `TODO.md` (à conserver tant que le site n'a pas convergé).
- Site cité par Julie comme exemple à regarder : **Outils-Psy.com**.
- Sites construits sur la même stack par le même auteur : `../adtc.no`, `../agalic-rd.com`.
