---
name: Projet VisualDon Transports Publics
description: Contexte complet du projet de visualisation scrollytelling pour HEIG-VD
type: project
---

Page web scrollytelling sur l'évolution des transports publics à Yverdon-les-Bains (Vaud, Suisse) entre 2006 et 2026. Cours VisualDon, HEIG-VD. Auteurs : E. Bergeon, Y. Rochat.

**Répertoire projet :** `c:\Users\yanni\HEIG-VD\VisualDon\visualdon-transports-publics\TransportPublic\`
(Ne pas confondre avec `VisualDon TP/` qui est un autre répertoire avec une version différente)

**Stack :** JavaScript vanilla, D3.js, HTML/SVG/CSS, Vite, NPM

**Why:** Projet académique visant à sensibiliser le public et les décideurs sur l'évolution des TP régionaux.

## Structure du projet

### Specs de référence (STRUCTURE/)
- `STRUCTURE/PROJECT_CONTEXT.md` — Description complète du projet et des visualisations
- `STRUCTURE/DESIGN_SYSTEM.md` — DA graphique (Inter Tight, couleurs par année, layout)
- `STRUCTURE/data.example.json` — Données finales (à enrichir avec comments)

### Assets
- `public/icons/bus/` — 4 variantes de bus SVG (1bus.svg à 4bus.svg)
- `public/icons/train/` — 1 train SVG (1train.svg)

### Code source (déjà généré, conforme aux specs)
- `index.html` — Header fixe + boutons toggle années + footer (E. Bergeon, Y. Rochat)
- `src/app.js` — Orchestration, charge `/data/data_example.json`, injecte 3 sections
- `src/lib/YearManager.js` — Scroll + toggle multi-années
- `src/lib/Relations.js` — Viz liaisons animées (véhicules SVG, 120s = 1 journée)
- `src/lib/Departures.js` — Viz réseau départs (D3, lignes actives/nouvelles/supprimées)
- `src/lib/TravelTimes.js` — Viz temps de trajet (barres horizontales D3)
- `src/style.css` — Import principal (Inter Tight + tous les sous-CSS)
- `src/styles/` — tokens.css, base.css, header.css, main.css, footer.css, relations.css, departures.css, travel_time.css

## Points en suspens

### 1. Chemin des données
`app.js` charge `/data/data_example.json` mais le fichier est dans `STRUCTURE/data.example.json`.
Il faudra le placer dans `public/data/data_example.json` pour que Vite le serve.

### 2. Refactor JSON — ajout des comments (structure confirmée)
```json
{
  "year": 2006,
  "comments": {
    "relations": {
      "visu_name": "Relations journalières",
      "title": "...",
      "content": "..."
    },
    "departures": {
      "visu_name": "Lignes au départ d'Yverdon-les-Bains, gare",
      "title": "...",
      "content": "..."
    },
    "travel_times": {
      "visu_name": "Temps de parcours depuis Yverdon-les-Bains, gare",
      "title": "...",
      "content": "..."
    }
  },
  "relations": [...],
  "departures": [...],
  "travel_times": [...]
}
```
Mapping CSS dans main.css : visu_name → .section-text__label, title → .section-text__title, content → .section-text__body
Le texte des sections dans app.js est actuellement hardcodé (placeholder), sera remplacé par lecture des comments.

### 3. Textes des sections dans app.js
Les 3 sections ont toutes le même placeholder "Visualisation 1" — à mettre à jour avec les vrais titres et à lire depuis les comments du JSON.

## Design system (résumé)
- Typographie : Inter Tight 400/500/600
- Couleurs années : 2006 #00b4d8, 2016 #52b788, 2026 #c5e003
- Layout section : grid 1fr 2fr (texte | viz), padding 80px 60px
- Couleur primaire #2d327d, accent #eb0000

**How to apply:** Toutes les modifications doivent se conformer aux specs STRUCTURE/, les visualisations sont déjà alignées.
