# Charte Graphique — Transports Publics Yverdon

## Identité visuelle

Le style graphique s'inspire directement des visuels de communication des **SBB CFF FFS** : sobre, fonctionnel, lisible. Pas d'effets décoratifs superflus. Chaque élément visuel a un rôle précis. La rigueur helvétique prime.

---

## Typographie

| Usage             | Famille              | Graisse(s)       |
|-------------------|----------------------|------------------|
| Tout le projet    | **Inter Tight**      | 400, 500, 600    |
| Titres principaux | Inter Tight          | 600              |
| Labels / axes     | Inter Tight          | 400              |
| Tooltips          | Inter Tight          | 400 / 500        |

**Import Google Fonts :**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
```

```css
font-family: 'Inter Tight', sans-serif;
```

---

## Palette de couleurs

### Couleurs de marque (fixes, tous contextes)

| Rôle                     | Nom         | Hex       | Usage                                      |
|--------------------------|-------------|-----------|---------------------------------------------|
| Couleur primaire         | Bleu CFF    | `#2d327d` | Header, textes importants, axes, bordures   |
| Couleur d'accent         | Rouge CFF   | `#eb0000` | Alertes, CTA, éléments critiques           |
| Fond principal           | Blanc       | `#ffffff` | Background général                          |
| Texte principal          | Noir doux   | `#1a1a1a` | Corps de texte                              |
| Texte secondaire         | Gris moyen  | `#6b7280` | Labels, annotations, légendes              |
| Lignes supprimées        | Gris clair  | `#c0c4cc` | Lignes en pointillés (disparues)           |

### Couleurs par année (différenciation temporelle)

| Année | Nom         | Hex       | Notes                                       |
|-------|-------------|-----------|---------------------------------------------|
| 2006  | Cyan        | `#00b4d8` | Bleu ciel vif, référence de départ         |
| 2016  | Vert        | `#52b788` | Vert nature, tonalité médiane              |
| 2026  | Vert-jaune  | `#c5e003` | Chartreuse, accent contemporain            |
| 2036  | Orange      | `#f4a261` | (optionnel, projection future)             |


**Variables CSS à déclarer globalement :**
```css
:root {
  /* Marque */
  --color-primary:   #2d327d;
  --color-accent:    #eb0000;
  --color-bg:        #ffffff;
  --color-text:      #1a1a1a;
  --color-muted:     #6b7280;
  --color-disabled:  #c0c4cc;

  /* Années */
  --color-2006: #00b4d8;
  --color-2016: #52b788;
  --color-2026: #c5e003;
  --color-2036: #f4a261;

  /* Typographie */
  --font-main: 'Inter Tight', sans-serif;

  /* Bords arrondis */
  --radius-card:    20px;
  --radius-pill:    9999px;
  --radius-small:   8px;
  --radius-medium:  12px;

  /* Transitions */
  --transition-default: 600ms ease-in-out;
  --transition-fast:    200ms ease;
}
```

---

## Arrondis (border-radius)

| Contexte                             | Valeur       | Variable           |
|--------------------------------------|--------------|---------------------|
| Cartes, panneaux, zones              | `20px`       | `--radius-card`    |
| Nœuds réseau (multi-lignes)          | `9999px`     | `--radius-pill`    |
| Boutons, tags, badges                | `9999px`     | `--radius-pill`    |
| Barres de graphique (extrémités)     | `4px`        | (inline)           |
| Tooltips                             | `12px`       | `--radius-medium`  |

---

## Layout de chaque section

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER FIXE — sélecteur d'années (2006 | 2016 | 2026)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────────┐ │
│  │              │  │                                      │ │
│  │  Explication │  │        Visualisation D3/SVG          │ │
│  │    (1/3)     │  │              (2/3)                   │ │
│  │              │  │                                      │ │
│  └──────────────┘  └──────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```css
.section-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 40px;
  align-items: start;
  padding: 80px 60px;
}
```

---

## Header fixe

- Fond blanc avec légère ombre portée vers le bas.
- Logo ou titre du projet à gauche.
- Boutons de sélection des années à droite, style **pill/toggle**.
- Bouton actif → fond de la couleur de l'année + texte blanc.
- Bouton inactif → bordure grise + texte gris.

```css
.year-btn {
  border-radius: var(--radius-pill);
  border: 2px solid var(--color-disabled);
  padding: 6px 18px;
  font-family: var(--font-main);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
}

.year-btn[data-year="2006"].active { background: var(--color-2006); border-color: var(--color-2006); color: white; }
.year-btn[data-year="2016"].active { background: var(--color-2016); border-color: var(--color-2016); color: white; }
.year-btn[data-year="2026"].active { background: var(--color-2026); border-color: var(--color-2026); color: #1a1a1a; }
```

---

## Visualisation 1 — Liaisons animées

- Fond : blanc ou gris très clair (`#f8f9fa`).
- Véhicule **train** : Couleur de l'année, sera fourni en SVG.
- Véhicule **bus** : Couleur de l'année, sera fourni en SVG avec plusieurs variantes qui seront choisies aléatoirement.
- Axe du temps : ligne horizontale fine (`#e5e7eb`), labels heures en Inter Tight 400 gris.
- Séparation des liaisons : fine ligne de séparation (`#e5e7eb`), label destination en 500.

---

## Visualisation 2 — Carte des départs

- Nœud central Yverdon : cercle → rectangle arrondi selon le nombre de lignes.
- Lignes **actives** : trait plein, couleur vive de l'opérateur (ou de l'année).
- Lignes **supprimées** : `stroke-dasharray: 6 4`, couleur `--color-disabled`.
- Lignes **nouvelles** : trait plein, couleur de l'année active, légèrement plus épaisse.
- Tooltip au survol : fond blanc, border-radius 12px, ombre `0 4px 12px rgba(0,0,0,0.1)`, Inter Tight.

---

## Visualisation 3 — Temps de trajet

- Barres horizontales : `border-radius` sur l'extrémité droite uniquement (`border-radius: 0 4px 4px 0`).
- Fond de la zone : blanc.
- Axe X : labels en Inter Tight 400, couleur muted, ligne `#e5e7eb`.
- Barre la plus longue toujours en dessous (z-index ou ordre de rendu).
- Couleur de chaque barre = couleur de son année.
- Tooltip au survol : fond `--color-primary` (`#2d327d`), texte blanc, Inter Tight.

---

## Tooltips (règle générale)

```css
.tooltip {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-medium);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
  padding: 10px 14px;
  font-family: var(--font-main);
  font-size: 13px;
  color: var(--color-text);
  pointer-events: none;
}
```

---

## Transitions et animations

| Contexte                            | Durée    | Easing         |
|-------------------------------------|----------|----------------|
| Apparition d'une année (scroll)     | `600ms`  | `ease-in-out`  |
| Hover sur éléments interactifs      | `200ms`  | `ease`         |
| Tooltip apparition                  | `150ms`  | `ease`         |
| Véhicules (boucle animation)        | Continu  | `linear`       |

---

## Ce qu'il ne faut pas faire

- ❌ Dégradés décoratifs ou effets de brillance
- ❌ Ombres fortes non fonctionnelles
- ❌ Plus de 4 couleurs simultanées dans une même visualisation
- ❌ Texte en italique (sauf annotation exceptionnelle)
- ❌ Taille de police inférieure à 11px
- ❌ Bordures > 2px sauf pour les nœuds sélectionnés
- ❌ Toute police autre qu'Inter Tight
