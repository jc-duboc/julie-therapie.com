# julie-therapie.com

Site web du cabinet de psychothérapie de **Julie-Christine Duboc** (Seine-Maritime). Bâti avec [Quarto](https://quarto.org) et publié sur GitHub Pages.

Production : <https://julie-therapie.com>

---

## Pour les agents IA

Avant d'éditer le site, lisez [`CLAUDE.md`](./CLAUDE.md) (contexte, ton, conventions, et
procédure de premier démarrage pour un utilisateur non technique).

## Démarrage assisté (Windows, sans installation manuelle)

1. Ouvrir l'application Claude (onglet Code).
2. Lui demander : « Aide-moi à installer tout ce qu'il faut pour le site `julie-therapie.com`,
   le dépôt est sur `https://github.com/jc-duboc/julie-therapie.com`. »
3. Autoriser les installations de Git, Quarto, Node et l'outil GitHub. Le projet sera cloné
   dans `Documents\julie-therapie.com` (par défaut).

Pour les modifications ensuite : ouvrir Claude Code dans le dossier `julie-therapie.com` et
lui dire ce qu'on veut changer (« remplace le tarif des consultations adultes par 70 euros »,
« ajoute une vidéo dans la page Ressources », etc.). Il s'occupe du reste, y compris la
publication.

## Démarrage rapide (utilisateur avancé)

Pour reprendre le projet manuellement sur un nouvel ordinateur :

1. [Installer les prérequis](#1-installer-les-prerequis)
2. [Cloner le dépôt](#2-cloner-le-depot)
3. [Lancer un aperçu local](#3-lancer-un-apercu-local)
4. [Modifier les pages](#4-modifier-les-pages)
5. [Publier la nouvelle version](#5-publier-la-nouvelle-version)

---

## 1. Installer les prérequis

Une seule fois, sur la machine.

### Git

- **Windows :** <https://git-scm.com/download/win>
- **macOS :** dans le Terminal, exécuter `xcode-select --install` (installe les outils Git)
- **Linux/WSL :** `sudo apt install git`

Vérifier :

```bash
git --version
```

### Quarto

Quarto est l'outil qui transforme les fichiers `.qmd` en site web HTML.

- Télécharger l'installateur pour votre système : <https://quarto.org/docs/get-started/>
- Suivre l'installation graphique (Suivant > Suivant > Terminer).

Vérifier :

```bash
quarto --version
```

> **Version minimale recommandée : 1.9.x**

### (Optionnel) Un éditeur de texte

[VS Code](https://code.visualstudio.com/) avec l'extension Quarto offre une bonne expérience pour
modifier les pages. RStudio fonctionne aussi.

---

## 2. Cloner le dépôt

Dans un terminal :

```bash
git clone https://github.com/jc-duboc/julie-therapie.com.git
cd julie-therapie.com
```

---

## 3. Lancer un aperçu local

Depuis le dossier du projet :

```bash
quarto preview
```

Cela ouvre automatiquement le navigateur sur `http://localhost:4444` (ou un port voisin). Le site
**se met à jour à chaque sauvegarde** d'un fichier `.qmd`.

Pour quitter l'aperçu : `Ctrl + C` dans le terminal.

### Rendu unique (sans serveur)

Si vous voulez seulement vérifier que tout se rend correctement :

```bash
quarto render
```

Le site final est généré dans le dossier `_site/`.

---

## 4. Modifier les pages

Toutes les pages sont des fichiers `.qmd` (markdown enrichi). La structure est la suivante :

```
.
├── _quarto.yml                  # Configuration du site (navbar, footer, thème...)
├── _brand.yml                   # Charte graphique (couleurs, polices, logos)
├── index.qmd                    # Page d'accueil
├── 404.qmd                      # Page d'erreur 404
├── libs/
│   └── styles.scss              # Styles personnalisés (CSS/SASS)
├── res/
│   └── img/                     # Images, logo, favicon, photo de profil
├── content/
│   ├── _metadata.yml            # Réglages communs à toutes les pages de contenu
│   ├── problemes-traites/       # « Problèmes traités »
│   ├── consultations/           # « Consultations & tarifs »
│   ├── prise-de-rdv/            # « Prendre rendez-vous »
│   ├── ressources/              # « Ressources »
│   │   ├── index.qmd            # hub : vidéos / livres / outils
│   │   ├── videos/              # listing des vidéos YouTube par playlist
│   │   ├── livres/              # bibliographie thématique
│   │   └── outils/              # fiches outils par thématique
│   └── a-propos/                # « À propos »
├── scripts/
│   └── fetch-youtube-playlists.mjs # récupère les vidéos YouTube avant chaque rendu
├── _extensions/                 # Extensions Quarto (fontawesome, iconify) - ne pas éditer
├── CNAME                        # Domaine personnalisé : julie-therapie.com
├── CLAUDE.md                    # Contexte du projet pour les agents IA
├── README.md                    # Ce fichier
└── .github/workflows/publish.yml # Déploiement automatique sur GitHub Pages
```

### Modifier un texte

Ouvrir le fichier `.qmd` correspondant, modifier, sauvegarder. L'aperçu se met à jour
automatiquement.

### Modifier les couleurs / la police

Éditer [`_brand.yml`](./_brand.yml). Les couleurs sont définies dans `color.palette`, puis assignées
à des rôles (`primary`, `secondary`, ...).

### Modifier la navbar / le footer

Éditer la section `website:` de [`_quarto.yml`](./_quarto.yml).

### Ajouter une page

1. Créer un nouveau dossier dans `content/`, par exemple `content/blog/`.
2. Y placer un fichier `index.qmd` avec un en-tête YAML :

   ```yaml
   ---
   title: "Mon nouveau titre"
   subtitle: "Un sous-titre court"
   ---
   ```

3. Ajouter une entrée dans la navbar de `_quarto.yml` :

   ```yaml
   navbar:
     left:
       - href: content/blog/index.qmd
         text: "Blog"
   ```

### Désactiver le bandeau « site en construction »

Dans `_quarto.yml`, section `website:`, supprimer (ou commenter avec `#` au début de chaque ligne)
le bloc :

```yaml
announcement:
  content: "**Site en construction** ..."
  ...
```

---

## 5. Publier la nouvelle version

Le site est **redéployé automatiquement** dès qu'un changement est poussé sur la branche `main`.
Workflow GitHub Actions : [`.github/workflows/publish.yml`](.github/workflows/publish.yml).

Cycle de modification typique :

```bash
git pull                          # récupère les changements distants
# ... éditer les fichiers ...
quarto preview                    # vérifier en local
git status                        # voir ce qui a changé
git add -A                        # ajouter tout
git commit -m "Mise à jour : ..." # créer un commit
git push                          # publier
```

Une fois le push effectué, l'onglet **Actions** sur GitHub montre l'avancement du déploiement
(2-4 minutes en général). Le site est ensuite disponible sur <https://julie-therapie.com>.

---

## Dépannage

| Symptôme                                  | Solution                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `quarto: command not found`               | Quarto n'est pas installé ou pas dans le `PATH`. Réinstaller.            |
| Aperçu ne se met pas à jour               | Fermer / relancer `quarto preview`. Vérifier la console.                 |
| Erreur de rendu YAML                      | Vérifier l'indentation (espaces, pas tabulations) et les guillemets.     |
| Le site ne se déploie pas après push      | Onglet **Actions** sur GitHub → cliquer sur le run rouge pour voir le log. |
| Le domaine julie-therapie.com ne pointe pas | Vérifier les DNS chez Namecheap et l'option **Custom domain** sur GitHub. |

---

## Licence

© 2026 Julie-Christine Duboc. Contenu du site (textes, images) : tous droits réservés.
Configuration technique : MIT.
