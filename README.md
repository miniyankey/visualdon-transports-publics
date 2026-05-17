# Transports publics à Yverdon-les-Bains — Évolution 2006 · 2016 · 2026

Visualisation interactive de l'évolution de l'offre de transports publics dans la région d'Yverdon-les-Bains sur trois décennies.

**Site publié :** [tp-yverdon-les-bains.netlify.app](https://tp-yverdon-les-bains.netlify.app)

---

## Lancer le projet en développement

**Prérequis :** Node.js ≥ 18

```bash
# 1. Cloner le dépôt
git clone https://github.com/miniyankey/visualdon-transports-publics.git
cd visualdon-transports-publics/TransportPublic

# 2. Installer les dépendances
npm install

# 3. Démarrer le serveur de développement
npm run dev
```

Le site est alors accessible à l'adresse indiquée dans le terminal (par défaut `http://localhost:5173`).

```bash
# Construire la version de production
npm run build

# Prévisualiser le build de production localement
npm run preview
```

---

## Structure du projet

```
TransportPublic/
├── public/
│   └── data/
│       └── data_example.json   # Données des 3 années (2006, 2016, 2026)
├── src/
│   ├── app.js                  # Point d'entrée — scrollytelling et orchestration
│   ├── lib/
│   │   ├── Relations.js        # Visualisation 1 — Carte animée des relations
│   │   ├── Departures.js       # Visualisation 2 — Carte des départs
│   │   ├── TravelTimes.js      # Visualisation 3 — Temps de trajet
│   │   └── YearManager.js      # Gestion des boutons d'année dans le header
│   └── styles/
│       ├── tokens.css          # Variables CSS (couleurs, typographie, espacements)
│       ├── base.css
│       ├── header.css
│       ├── main.css            # Layout scrollytelling
│       ├── relations.css
│       ├── departures.css
│       ├── travel_time.css
│       └── footer.css
├── index.html
├── vite.config.js
└── package.json
```

---

## Les trois visualisations

### 1. Relations — Carte animée du réseau

Chaque ligne de transport est représentée par un véhicule animé qui circule entre Yverdon et sa destination. Les véhicules apparaissent et disparaissent derrière des masques, sans effet de "pop". Une pastille colorée par côté du label indique l'année de référence.

### 2. Départs — Carte des lignes depuis la gare

Toutes les lignes partent d'un nœud central représentant la gare d'Yverdon. Chaque bras est orienté à gauche ou à droite selon le sens de la ligne. La **longueur du bras est proportionnelle à la distance de la destination** selon une **échelle logarithmique**. Les lignes sont triées du plus proche au plus éloigné dans chaque colonne.

Un clic sur une ligne (trait ou label) ouvre une infobox affichant l'évolution de la ligne sur les trois années, avec les destinations et leurs distances, indépendamment des années actuellement affichées.

### 3. Temps de trajet — Barres horizontales

Graphique en barres horizontales comparant les temps de trajet vers chaque destination selon l'année. Les destinations sont triées par **temps moyen croissant** sur les trois années. Un survol affiche un tooltip avec les durées et les évolutions année par année.

---

## Données

Toutes les données sont stockées dans `public/data/data_example.json`. Le fichier contient un tableau de trois objets, un par année (2006, 2016, 2026), chacun structuré ainsi :

```json
{
  "year": 2026,
  "comments": {
    "relations":    { "visu_name": "Relations",     "title": "...", "content": "..." },
    "departures":   { "visu_name": "Départs",       "title": "...", "content": "..." },
    "travel_times": { "visu_name": "Temps de trajet", "title": "...", "content": "..." }
  },
  "relations": [
    {
      "title": "Lausanne",
      "courses": [
        { "type": "train", "departure": "05:28", "arrival": "05:50" },
        { "type": "train", "departure": "06:28", "arrival": "06:50" }
      ]
    }
  ],
  "departures": [
    {
      "id": "IR15",
      "name": "IR 15",
      "color": "#e84545",
      "isYverdonTerminus": false,
      "destinations": [
        { "name": "Lausanne", "side": "left",  "distance": 29 },
        { "name": "Berne",    "side": "right", "distance": 85 }
      ]
    }
  ],
  "travel_times": [
    { "destination": "Lausanne", "duration_minutes": 22 }
  ]
}
```

Les distances (`distance`) sont exprimées en kilomètres depuis la gare d'Yverdon-les-Bains.

---

## Technologies

| Outil | Usage |
|-------|-------|
| [Vite](https://vitejs.dev) | Bundler et serveur de développement |
| [D3.js v7](https://d3js.org) | Rendu SVG (visualisations 2 et 3) |
| SVG natif | Rendu animé (visualisation 1) |
| CSS custom properties | Thème, couleurs d'années, typographie |

---

## Sources de données

- **[Archives horaires OFT](https://www.tp-info.ch/fr/horaire-actuel/archives-des-horaires)** — évolution des horaires et cadences
- **Archives horaires Travys** — lignes urbaines (obtenues par contact direct)

---

## Auteur

Projet réalisé par Yannis Rochat et Etienne Bergeon dans le cadre du cours **VisualDon** à la HEIG-VD.
