# Contexte Projet — Scrollytelling Transports Publics Yverdon-les-Bains

## Vue d'ensemble

Page web interactive en **scrollytelling** sur l'évolution des transports publics dans la région d'Yverdon-les-Bains (Vaud, Suisse). L'objectif est de montrer l'évolution (ou la régression) des transports publics sur trois décennies pour sensibiliser le public et les décideurs politiques.

**Stack technique :**
- JavaScript (vanilla ou Vue si nécessaire)
- D3.js (visualisations)
- HTML / SVG / CSS
- Vite (serveur de développement)
- NPM

---

## Structure générale de la page

### Header fixe
Un header toujours visible permettant à l'utilisateur d'activer/désactiver les années à afficher : **2006**, **2016**, **2026** (et potentiellement **2036** en projection).

- Plusieurs années peuvent être actives simultanément.
- Si l'utilisateur n'interagit pas avec le header, les années s'ajoutent **automatiquement dans l'ordre chronologique au fil du scroll** puis descend dans la page pour afficher les autres visualisations après avoir affiché toutes les années.

### Layout de chaque section
Chaque section de visualisation est divisée en **deux colonnes** :
- **1/3 gauche** → texte explicatif, commentaires sur les changements visibles
- **2/3 droite** → visualisation D3/SVG interactive

---

## Données

### Structure JSON principale

```json
[
  {
    "year": 2006,
    "relations": [],
    "departures": [],
    "travel_times": []
  },
  {
    "year": 2016,
    "relations": [],
    "departures": [],
    "travel_times": []
  },
  {
    "year": 2026,
    "relations": [],
    "departures": [],
    "travel_times": []
  }
]
```

---

## Visualisations

### 1. Diagramme des liaisons (animations de véhicules)

**Concept :** Représentation animée d'une journée type (00h00 → 23h59) pour plusieurs liaisons au départ d'Yverdon-les-Bains. Les véhicules (bus ou train) circulent de gauche à droite, proportionnellement à la durée réelle du trajet.

**Échelle de temps :** 24h = 48 secondes d'animation, en boucle.

**Liaisons disponibles :**
- Yverdon → Orbe
- Yverdon → Thierrens
- Yverdon → Echallens
- Yverdon → Ste-Croix


**Disposition verticale :** Les liaisons les plus longues sont placées en bas, les plus courtes en haut (effet parallaxe sans jouer sur la taille).

**Couleur des véhicules :** Selon l'année active (voir charte graphique).

**Structure JSON `relations` :**

> La durée du trajet n'est pas stockée — elle se calcule à la volée depuis `departure` et `arrival`.

```json
{
  "relations": [
    {
      "title": "Neuchâtel",
      "courses": [
        { "type": "train", "departure": "06:03", "arrival": "06:51" },
        { "type": "train", "departure": "07:03", "arrival": "07:51" },
        { "type": "bus",   "departure": "08:15", "arrival": "09:05" }
      ]
    },
    {
      "title": "Orbe",
      "courses": [
        { "type": "bus", "departure": "06:10", "arrival": "06:32" },
        { "type": "bus", "departure": "07:10", "arrival": "07:32" }
      ]
    }
  ]
}
```

---

### 2. Carte des départs depuis la gare d'Yverdon

**Concept :** Vue stylisée de type carte de réseau Mobilis/CFF centrée sur la gare d'Yverdon. Affiche toutes les lignes (bus et train) passant par la gare, avec leur direction (gauche ou droite du point central).

**Comportement visuel :**
- Le nœud central est un point qui se transforme en rectangle à bords 100% arrondis quand plusieurs lignes y sont connectées.
- Les lignes **nouvelles** (par rapport à l'année précédente) sont affichées avec une couleur vive.
- Les lignes **supprimées** (présentes avant, absentes maintenant) sont affichées en **pointillés grisés**.
- Au **survol d'une ligne** → tooltip avec nom de la ligne et destinations.
- Une **liste déroulante** (repliée par défaut) affiche la légende complète.

**Structure JSON `departures` :**

> `departures` est un **tableau plat** (plus d'objet wrapper). L'`id` est un entier unique et stable qui identifie la ligne à travers les années, indépendamment des changements de nom. Il n'y a pas de champ `type` ni `operator` au niveau de la ligne — seuls les champs nécessaires à la visualisation sont conservés.

```json
{
  "departures": [
    {
      "id": 23065,
      "name": "R2",
      "color": "#EB0000",
      "isYverdonTerminus": false,
      "destinations": [
        { "name": "Grandson / Murten", "side": "left" },
        { "name": "Lausanne",          "side": "right" }
      ]
    },
    {
      "id": 56103,
      "name": "613",
      "color": "#EF0247",
      "isYverdonTerminus": true,
      "destinations": [
        { "name": "Vallorbe / Le Brassus", "side": "right" },
        { "name": "Yverdon, Gymnase",      "side": "left" }
      ]
    }
  ]
}
```

---

### 3. Graphique des temps de trajet

**Concept :** Graphique à barres horizontales. Axe X = durée (0 à 90 min). Chaque arrêt/destination est une ligne. Pour chaque destination, les barres des différentes années se **superposent**, triées de la plus longue (dessous) à la plus courte (dessus).

**Interactivité :**
- Au survol d'une barre → tooltip affichant : année, durée, et différence par rapport à 2006.

**Structure JSON `travel_times` :**
```json
{
  "travel_times": [
    {
      "destination": "Neuchâtel",
      "duration_minutes": 43
    },
    {
      "destination": "Vallorbe",
      "duration_minutes": 28
    },
    {
      "destination": "Orbe",
      "duration_minutes": 22
    },
    {
      "destination": "Grandson",
      "duration_minutes": 12
    },
    {
      "destination": "Thierrens",
      "duration_minutes": 35
    }
  ]
}
```

---

## Comportement scrollytelling

1. L'utilisateur arrive sur la page → seule l'année **2006** est visible.
2. En scrollant → **2016** s'ajoute avec une transition animée sur toutes les visualisations.
3. En scrollant encore → **2026** s'ajoute de même.
4. Le header permet à tout moment de forcer l'affichage d'une ou plusieurs années.
5. Chaque changement dans la visualisation est accompagné d'un texte explicatif dans la colonne gauche.

---

## Points d'attention pour le développement

- Toutes les visualisations doivent gérer **plusieurs années simultanément** sans re-render complet (mise à jour D3 avec `enter/update/exit`).
- L'animation des liaisons (viz 1) tourne en **boucle continue** indépendamment du scroll.
- Les transitions entre états d'années doivent être **fluides** (durée suggérée : 600–800ms ease-in-out).
- Le projet doit rester **responsive** pour les présentations sur grand écran (1440px+).
- Prévoir un fallback si aucune donnée n'est disponible pour une année sur une liaison donnée.
