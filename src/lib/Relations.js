/**
 * visu1.js — Diagramme des liaisons animées
 * Transports Publics · Yverdon-les-Bains
 *
 * – 60 secondes = 1 journée simulée (de 04h30 à 23h59)
 * – Chaque liaison a une rangée principale.
 *   À l'intérieur, chaque année active occupe sa propre sous-rangée.
 * – Destination écrite à gauche
 * – Fondu latéral : les véhicules glissent derrière les colonnes avant d'apparaître/disparaître
 * – Badges année : cercles parfaits
 * – Responsive : en dessous du texte sur mobile
 */

// ─── Constantes ────────────────────────────────────────────────

const CYCLE_DURATION_MS = 120_000;

const DAY_START_MIN = 4 * 60 + 30; // 270 min
const DAY_END_MIN = 24 * 60; // 1440 min
const DAY_SPAN_MIN = DAY_END_MIN - DAY_START_MIN;

const YEAR_COLORS = {
  2006: "#00b4d8",
  2016: "#52b788",
  2026: "#c5e003",
};

const BUS_VARIANTS = 4;
const TRAIN_VARIANTS = 1;

// Layout SVG (viewBox 1000px large)
const COL_LEFT_W = 130; // colonne destination (gauche)
const RAIL_X0 = COL_LEFT_W + 8;
const RAIL_X1 = 980;
const RAIL_W = RAIL_X1 - RAIL_X0;

// Largeur de la zone de fondu de chaque côté (px viewBox)
// Les véhicules glissent dans cette zone masquée avant/après le rail visible
const FADE_W = 48;

// Badge année : cercle de rayon fixe
const BADGE_R = 10; // rayon
const BADGE_CX = RAIL_X0 - BADGE_R - 4; // centré juste avant le rail

// Hauteurs
const SUBROW_HEIGHT = 36;
const ROW_HEADER_H = 18;
const ROW_BOTTOM_PAD = 8;
const OUTER_PADDING_Y = 28;

const ICON_HEIGHT = 24;

// ─── Helpers ───────────────────────────────────────────────────

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minToFraction(minutes) {
  const clamped = Math.max(DAY_START_MIN, Math.min(DAY_END_MIN, minutes));
  return (clamped - DAY_START_MIN) / DAY_SPAN_MIN;
}

function stableVariant(relation, departure, max) {
  let hash = 0;
  const str = relation + departure;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return (Math.abs(hash) % max) + 1;
}

function avgDurationForRelation(yearData, title) {
  if (!yearData) return 0;
  const rel = yearData.relations.find((r) => r.title === title);
  if (!rel || rel.courses.length === 0) return 0;
  return (
    rel.courses.reduce(
      (sum, c) => sum + (toMinutes(c.arrival) - toMinutes(c.departure)),
      0,
    ) / rel.courses.length
  );
}

// ─── Classe principale ─────────────────────────────────────────

export class Relations {
  constructor({ container, data }) {
    this.container = container;
    this.data = data;
    this.activeYears = new Set();
    this.isPlaying = true;
    this.startTime = null;
    this.rafId = null;

    this._svg = null;
    this._defs = null;
    this._staticGrp = null;
    this._vehicleGrp = null;
    this._fadeGrp = null; // overlay de fondu, toujours au-dessus des véhicules
    this._clockEl = null;
    this._relations = [];
    this._vehicles = [];
    this._totalHeight = 0;

    this._buildDOM();
  }

  // ─── API publique ─────────────────────────────────────────────

  setActiveYears(yearsSet) {
    this.activeYears = new Set(yearsSet);
    this._rebuild();
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
  }

  init(initialYears = new Set([2006])) {
    this.setActiveYears(initialYears);
    this._play();
  }

  // ─── Construction DOM ─────────────────────────────────────────

  _buildDOM() {
    this.container.innerHTML = "";
    this.container.classList.add("visu1-container");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "visu1-svg");
    svg.setAttribute("width", "100%");
    this._svg = svg;

    // <defs> : clipPath + gradients de fondu
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    svg.appendChild(defs);
    this._defs = defs;

    // Groupe statique (fonds, rails, labels)
    const staticGrp = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    staticGrp.setAttribute("class", "visu1-static");
    svg.appendChild(staticGrp);
    this._staticGrp = staticGrp;

    // Groupe véhicules (clippé)
    const vehicleGrp = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    vehicleGrp.setAttribute("class", "visu1-vehicles");
    svg.appendChild(vehicleGrp);
    this._vehicleGrp = vehicleGrp;

    // Groupe de fondu (overlay au-dessus des véhicules, sous les labels)
    const fadeGrp = document.createElementNS("http://www.w3.org/2000/svg", "g");
    fadeGrp.setAttribute("class", "visu1-fade");
    fadeGrp.setAttribute("pointer-events", "none");
    svg.appendChild(fadeGrp);
    this._fadeGrp = fadeGrp;

    this.container.appendChild(svg);

    // Contrôles
    const controls = document.createElement("div");
    controls.className = "visu1-controls";

    this._playBtn = document.createElement("button");
    this._playBtn.className = "visu1-playbtn";
    this._playBtn.setAttribute("aria-label", "Pause");
    this._playBtn.innerHTML = this._iconPause();
    this._playBtn.addEventListener("click", () => this._togglePlayPause());
    controls.appendChild(this._playBtn);

    const clock = document.createElement("span");
    clock.className = "visu1-clock";
    clock.textContent = "04:30";
    this._clockEl = clock;
    controls.appendChild(clock);

    this.container.appendChild(controls);
  }

  // ─── Reconstruction ────────────────────────────────────────────

  _rebuild() {
    this._computeRelations();
    this._resizeSVG();
    this._updateDefs();
    this._drawStatic();
    this._drawFadeOverlay();
    this._buildVehicleElements();
  }

  _computeRelations() {
    const titleSet = new Set();
    for (const year of this.activeYears) {
      const yd = this.data.find((d) => d.year === year);
      if (!yd) continue;
      yd.relations.forEach((r) => titleSet.add(r.title));
    }

    const titles = [...titleSet].sort((a, b) => {
      const durA = [...this.activeYears].reduce(
        (sum, y) =>
          sum +
          avgDurationForRelation(
            this.data.find((d) => d.year === y),
            a,
          ),
        0,
      );
      const durB = [...this.activeYears].reduce(
        (sum, y) =>
          sum +
          avgDurationForRelation(
            this.data.find((d) => d.year === y),
            b,
          ),
        0,
      );
      return durA - durB;
    });

    const yearsSorted = [...this.activeYears].sort((a, b) => a - b);

    let currentY = OUTER_PADDING_Y;
    this._relations = titles.map((title) => {
      const groupY = currentY;
      currentY += ROW_HEADER_H;

      const groups = yearsSorted.map((year) => {
        const yd = this.data.find((d) => d.year === year);
        const rel = yd?.relations.find((r) => r.title === title);
        const subY = currentY;
        currentY += SUBROW_HEIGHT;
        return { year, subY, courses: rel?.courses ?? [] };
      });

      currentY += ROW_BOTTOM_PAD;
      return { title, groupY, groups, bottomY: currentY };
    });

    this._totalHeight = currentY + OUTER_PADDING_Y;
  }

  _resizeSVG() {
    this._svg.setAttribute("height", this._totalHeight);
    this._svg.setAttribute("viewBox", `0 0 1000 ${this._totalHeight}`);
  }

  // ─── Defs : clipPath + gradients ──────────────────────────────

  _updateDefs() {
    // clipPath élargi : les véhicules peuvent circuler dans la zone de fondu
    // sans jamais dépasser dans la colonne de texte
    this._defs.innerHTML = `
      <clipPath id="visu1-rail-clip">
        <rect
          x="${RAIL_X0 - FADE_W}"
          y="0"
          width="${RAIL_W + FADE_W * 2}"
          height="${this._totalHeight}"
        />
      </clipPath>

      <linearGradient id="visu1-fade-l" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%"   stop-color="#ffffff" stop-opacity="1"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="visu1-fade-r" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0%"   stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="1"/>
      </linearGradient>
    `;

    this._vehicleGrp.setAttribute("clip-path", "url(#visu1-rail-clip)");
  }

  // ─── Overlay de fondu (dessiné sur les bords du rail) ─────────

  _drawFadeOverlay() {
    this._fadeGrp.innerHTML = "";

    // Rectangle de fondu gauche : couvre la zone [RAIL_X0 - FADE_W .. RAIL_X0 + FADE_W]
    // Il masque progressivement les véhicules qui approchent du bord gauche
    const fadeL = this._svgEl("rect", {
      x: RAIL_X0 - FADE_W,
      y: 0,
      width: FADE_W * 2,
      height: this._totalHeight,
      fill: "url(#visu1-fade-l)",
    });
    this._fadeGrp.appendChild(fadeL);

    // Rectangle de fondu droit
    const fadeR = this._svgEl("rect", {
      x: RAIL_X1 - FADE_W,
      y: 0,
      width: FADE_W * 2,
      height: this._totalHeight,
      fill: "url(#visu1-fade-r)",
    });
    this._fadeGrp.appendChild(fadeR);

    // Colonne opaque gauche (cache totalement les véhicules derrière les labels)
    const maskL = this._svgEl("rect", {
      x: 0,
      y: 0,
      width: RAIL_X0 - FADE_W,
      height: this._totalHeight,
      fill: "#ffffff",
    });
    this._fadeGrp.appendChild(maskL);

    // Colonne opaque droite
    const maskR = this._svgEl("rect", {
      x: RAIL_X1 + FADE_W,
      y: 0,
      width: 1000 - RAIL_X1 - FADE_W,
      height: this._totalHeight,
      fill: "#ffffff",
    });
    this._fadeGrp.appendChild(maskR);
  }

  // ─── Dessin statique ──────────────────────────────────────────

  _drawStatic() {
    this._staticGrp.innerHTML = "";

    for (const [ri, rel] of this._relations.entries()) {
      // Fond alterné
      if (ri % 2 === 0) {
        this._staticGrp.appendChild(
          this._svgEl("rect", {
            x: 0,
            y: rel.groupY,
            width: 1000,
            height: rel.bottomY - rel.groupY,
            fill: "#f8f9fa",
          }),
        );
      }

      // Label destination — à gauche, centré verticalement sur le groupe
      const groupMidY = rel.groupY + (rel.bottomY - rel.groupY) / 2;
      this._svgText(this._staticGrp, {
        x: COL_LEFT_W - 8,
        y: groupMidY + 5,
        text: rel.title,
        anchor: "end",
        weight: 500,
        size: 13,
        fill: "#1a1a1a",
      });

      // Séparateur bas du groupe
      this._staticGrp.appendChild(
        this._svgEl("line", {
          x1: 0,
          x2: 1000,
          y1: rel.bottomY,
          y2: rel.bottomY,
          stroke: "#e5e7eb",
          "stroke-width": 0.5,
        }),
      );

      // Sous-rangées
      for (const grp of rel.groups) {
        const midY = grp.subY + SUBROW_HEIGHT / 2;

        // Rail pointillé coloré
        this._staticGrp.appendChild(
          this._svgEl("line", {
            x1: RAIL_X0,
            x2: RAIL_X1,
            y1: midY,
            y2: midY,
            stroke: YEAR_COLORS[grp.year] + "55",
            "stroke-width": 1,
            "stroke-dasharray": "4 3",
          }),
        );

        // Badge année : cercle parfait
        this._staticGrp.appendChild(
          this._svgEl("circle", {
            cx: BADGE_CX,
            cy: midY,
            r: BADGE_R,
            fill: YEAR_COLORS[grp.year],
          }),
        );
        this._svgText(this._staticGrp, {
          x: BADGE_CX,
          y: midY + 4,
          text: `'${String(grp.year).slice(2)}`,
          anchor: "middle",
          weight: 600,
          size: 9,
          fill: grp.year === 2026 ? "#1a1a1a" : "#ffffff",
        });
      }
    }

    // Séparation verticale gauche (destination | rail)
    this._staticGrp.appendChild(
      this._svgEl("line", {
        x1: COL_LEFT_W,
        x2: COL_LEFT_W,
        y1: OUTER_PADDING_Y,
        y2: this._totalHeight - OUTER_PADDING_Y,
        stroke: "#e5e7eb",
        "stroke-width": 1,
      }),
    );
  }

  // ─── Éléments véhicules ────────────────────────────────────────

  _buildVehicleElements() {
    this._vehicleGrp.innerHTML = "";
    this._vehicles = [];

    for (const rel of this._relations) {
      for (const grp of rel.groups) {
        const midY = grp.subY + SUBROW_HEIGHT / 2;

        for (const course of grp.courses) {
          const depMin = toMinutes(course.departure);
          const arrMin = toMinutes(course.arrival);

          if (arrMin <= DAY_START_MIN || depMin >= DAY_END_MIN) continue;

          const depFrac = minToFraction(depMin);
          const arrFrac = minToFraction(arrMin);

          const variant =
            course.type === "bus"
              ? stableVariant(rel.title, course.departure, BUS_VARIANTS)
              : stableVariant(rel.title, course.departure, TRAIN_VARIANTS);

          const iconPath = `/icons/${course.type}/${variant}${course.type}.svg`;

          const durationFrac = arrFrac - depFrac;
          const iconW = Math.max(32, durationFrac * RAIL_W * 3 + 32);

          const imgEl = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "image",
          );
          imgEl.setAttribute("href", iconPath);
          imgEl.setAttribute("width", iconW);
          imgEl.setAttribute("height", ICON_HEIGHT);
          imgEl.setAttribute("display", "none");
          imgEl.setAttribute("class", "visu1-vehicle");
          imgEl.style.filter = `drop-shadow(0 1px 3px ${YEAR_COLORS[grp.year]}99)`;

          const tip = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "title",
          );
          tip.textContent =
            `${grp.year} · ${course.type === "train" ? "Train" : "Bus"} ` +
            `${course.departure} → ${course.arrival} (${arrMin - depMin} min)`;
          imgEl.appendChild(tip);

          this._vehicleGrp.appendChild(imgEl);

          // Le véhicule commence sa course FADE_W px avant RAIL_X0 (dans la zone de fondu)
          // et termine FADE_W px après RAIL_X1 — l'icône apparaît et disparaît en douceur
          this._vehicles.push({
            el: imgEl,
            depFrac,
            arrFrac,
            midY,
            iconW,
          });
        }
      }
    }
  }

  // ─── Boucle d'animation ────────────────────────────────────────

  _startLoop() {
    const tick = (now) => {
      if (!this.isPlaying) return;
      if (this.startTime === null) this.startTime = now;
      const fraction =
        ((now - this.startTime) % CYCLE_DURATION_MS) / CYCLE_DURATION_MS;
      this._updateVehicles(fraction);
      this._updateClock(fraction);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  _updateVehicles(fraction) {
    // Rail étendu : les véhicules commencent et finissent dans la zone de fondu
    const extRailX0 = RAIL_X0 - FADE_W;
    const extRailW = RAIL_W + FADE_W * 2;

    for (const v of this._vehicles) {
      const visible = fraction >= v.depFrac && fraction < v.arrFrac;
      if (!visible) {
        v.el.setAttribute("display", "none");
        continue;
      }

      v.el.setAttribute("display", "");
      const progress = (fraction - v.depFrac) / (v.arrFrac - v.depFrac);
      // Le trajet complet va de extRailX0 à extRailX0 + extRailW - iconW
      v.el.setAttribute("x", extRailX0 + progress * (extRailW - v.iconW));
      v.el.setAttribute("y", v.midY - ICON_HEIGHT / 2);
    }
  }

  _updateClock(fraction) {
    const totalMin = DAY_START_MIN + Math.floor(fraction * DAY_SPAN_MIN);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    this._clockEl.textContent =
      String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  // ─── Play / Pause ──────────────────────────────────────────────

  _togglePlayPause() {
    this.isPlaying ? this._pause() : this._play();
  }

  _pause() {
    this.isPlaying = false;
    cancelAnimationFrame(this.rafId);
    this._playBtn.innerHTML = this._iconPlay();
    this._playBtn.setAttribute("aria-label", "Lecture");
  }

  _play() {
    this.isPlaying = true;
    const [h, m] = this._clockEl.textContent.split(":").map(Number);
    const fraction = Math.max(
      0,
      Math.min(1, (h * 60 + m - DAY_START_MIN) / DAY_SPAN_MIN),
    );
    this.startTime = performance.now() - fraction * CYCLE_DURATION_MS;
    this._playBtn.innerHTML = this._iconPause();
    this._playBtn.setAttribute("aria-label", "Pause");
    this._startLoop();
  }

  // ─── Helpers SVG ──────────────────────────────────────────────

  _svgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  _svgText(
    parent,
    { x, y, text, anchor = "start", weight = 400, size = 13, fill = "#1a1a1a" },
  ) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
    el.setAttribute("x", x);
    el.setAttribute("y", y);
    el.setAttribute("text-anchor", anchor);
    el.setAttribute("font-family", "Inter Tight, sans-serif");
    el.setAttribute("font-size", size);
    el.setAttribute("font-weight", weight);
    el.setAttribute("fill", fill);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  _iconPause() {
    return `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="3.5" height="12" rx="1"/>
      <rect x="9.5" y="2" width="3.5" height="12" rx="1"/>
    </svg>`;
  }

  _iconPlay() {
    return `<svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 2.5l10 5.5-10 5.5V2.5z"/>
    </svg>`;
  }
}
