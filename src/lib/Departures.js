/**
 * visu2.js — Carte de réseau des départs depuis Yverdon-les-Bains
 *
 * Layout horizontal :
 * – Nœud central = rectangle pill vertical
 * – Toutes les lignes partent horizontalement (gauche ou droite)
 * – Terminus : répartis en deux colonnes (gauche / droite)
 * – Traversantes : un bras gauche + un bras droit indépendants,
 *   chacun placé dans sa colonne respective
 * – Clic → isole la ligne + tooltip flottant au curseur
 * – Clic fond SVG ou reclic ligne → désélectionne
 */

import * as d3 from "d3";

// ─── Constantes ────────────────────────────────────────────────

const LINE_STROKE = 3;
const LINE_NEW    = 3;
const BADGE_R     = 7;
const ARM_W       = 140;
const MIN_ARM_W   = 36;
const ROW_H       = 20;
const NODE_W      = 30;
const NUM_TEXT    = 6;
const LEG_TEXT    = 8;
const NODE_PAD    = 14;
const YEAR_COLORS = { 2006: "#00b4d8", 2016: "#52b788", 2026: "#c5e003" };
const COLOR_DIMMED = "#d1d5db";
const OPACITY_DIM  = 0.2;

// ─── buildSlots ───────────────────────────────────────────────

function buildSlots(data, activeYears) {
  const years   = [...activeYears].sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const byId    = new Map();

  for (const year of years) {
    const yd = data.find((d) => d.year === year);
    if (!yd) continue;
    for (const dep of yd.departures) {
      if (!byId.has(dep.id)) byId.set(dep.id, { byYear: new Map() });
      byId.get(dep.id).byYear.set(year, dep);
    }
  }

  const left  = [];
  const right = [];

  for (const [id, { byYear }] of byId) {
    const presentIn = years.filter((y) => byYear.has(y));
    const firstYear = presentIn[0];
    const lastYear  = presentIn[presentIn.length - 1];
    const isNew     = firstYear > minYear;
    const isRemoved = lastYear  < maxYear;
    const refLine   = byYear.get(lastYear);
    const base      = { id, byYear, presentIn, isNew, isRemoved, refLine };

    if (!refLine.isYverdonTerminus) {
      refLine.destinations.forEach((dest, di) => {
        const slot = { ...base, slotKey: `${id}-${di}`, destName: dest.name, destDistance: dest.distance ?? 0, isPass: true };
        if (dest.side === "left") left.push(slot);
        else right.push(slot);
      });
    } else {
      const d0   = refLine.destinations[0];
      const slot = { ...base, slotKey: `${id}`, destName: d0?.name ?? "", destDistance: d0?.distance ?? 0, isPass: false };
      if (left.length <= right.length) left.push(slot);
      else right.push(slot);
    }
  }

  return { left, right };
}

// ─── detectChanges ─────────────────────────────────────────────

function detectChanges(byYear, years) {
  const changes = [];
  for (let i = 1; i < years.length; i++) {
    const prev = byYear.get(years[i - 1]);
    const curr = byYear.get(years[i]);
    const period = `entre ${years[i - 1]} et ${years[i]}`;
    if (!prev && curr)  { changes.push({ type: "new",     desc: `Apparue ${period}` }); continue; }
    if (prev  && !curr) { changes.push({ type: "removed", desc: `Disparue ${period}` }); continue; }
    if (!prev || !curr) continue;
    if (prev.name !== curr.name)
      changes.push({ type: "rename", desc: `Renommée ${period} : ${prev.name} → ${curr.name}` });
    const pd = prev.destinations.map((d) => d.name).join(", ");
    const cd = curr.destinations.map((d) => d.name).join(", ");
    if (pd !== cd)
      changes.push({ type: "dest", desc: `Destinations modifiées ${period} : ${pd} → ${cd}` });
    if (prev.isYverdonTerminus !== curr.isYverdonTerminus)
      changes.push({ type: "terminus", desc: curr.isYverdonTerminus
        ? `Terminus à Yverdon ${period}`
        : `Ligne traversante ${period}` });
  }
  return changes;
}

// ─── Classe principale ─────────────────────────────────────────

export class Departures {
  constructor({ container, data }) {
    this.container   = container;
    this.data        = data;
    this.activeYears = new Set();
    this._selectedId = null;
    this._lineGroups = [];
    this._svgWrap    = null;
    this._tooltip    = null;
    this._legendEl   = null;
    this._buildDOM();
  }

  setActiveYears(yearsSet) {
    this.activeYears = new Set(yearsSet);
    this._selectedId = null;
    this._tooltip.hidden = true;
    this._render();
  }

  init(initialYears = new Set([2006])) { this.setActiveYears(initialYears); }
  destroy() {}

  // ─── DOM ─────────────────────────────────────────────────────

  _buildDOM() {
    this.container.innerHTML = "";
    this.container.classList.add("visu2-container");

    this._svgWrap = document.createElement("div");
    this._svgWrap.className = "visu2-svg-wrap";
    this.container.appendChild(this._svgWrap);

    // Légende statique sous le SVG (jamais dans le SVG = jamais superposée)
    this._legendEl = document.createElement("div");
    this._legendEl.className = "visu2-legend-bar";
    this._legendEl.innerHTML = `
      <span class="visu2-legend-item">
        <span class="visu2-legend-line visu2-legend-line--solid"></span>Active
      </span>
      <span class="visu2-legend-item">
        <span class="visu2-legend-line visu2-legend-line--dashed"></span>Supprimée
      </span>
      <span class="visu2-legend-note">Longueur proportionnelle à la distance (échelle logarithmique) · Cliquer sur une ligne pour voir son évolution</span>
    `;
    this.container.appendChild(this._legendEl);

    // Tooltip flottant positionné au curseur lors du clic
    this._tooltip = document.createElement("div");
    this._tooltip.className = "visu2-tooltip";
    this._tooltip.hidden = true;
    this.container.appendChild(this._tooltip);
  }

  // ─── Rendu ───────────────────────────────────────────────────

  _render() {
    this._svgWrap.innerHTML = "";
    this._lineGroups = [];

    const years = [...this.activeYears].sort((a, b) => a - b);
    const { left, right } = buildSlots(this.data, this.activeYears);
    left.sort((a, b)  => a.destDistance - b.destDistance);
    right.sort((a, b) => a.destDistance - b.destDistance);
    const nRows   = Math.max(left.length, right.length);
    // Échelle fixe sur l'ensemble des données — 100 % = distance max tous ans confondus
    const maxDist = Math.max(1, ...this.data.flatMap((yd) =>
      yd.departures.flatMap((dep) => dep.destinations.map((d) => d.distance ?? 0))
    ));

    const LABEL_W = 130;
    const W       = NODE_W * 2 + ARM_W * 2 + LABEL_W * 2 + 32;
    const nodeH   = nRows * ROW_H + NODE_PAD * 2;
    const H       = nodeH + 40; // marges top/bottom uniquement

    const cx      = W / 2;
    const topY    = (H - nodeH) / 2;
    const nodeX   = cx - NODE_W;
    const armEndL = nodeX - 8;
    const armEndR = cx + NODE_W + 8;

    const svg = d3.create("svg")
      .attr("width", "100%")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("class", "visu2-svg");

    const g = svg.append("g");

    // Fond : clic → désélectionner
    g.append("rect")
      .attr("width", W).attr("height", H)
      .attr("fill", "#f8f9fa")
      .on("click", () => this._deselect());

    // Lignes gauche
    left.forEach((slot, i) => {
      const y = topY + NODE_PAD + i * ROW_H + ROW_H / 2;
      this._drawArm(g, slot, "left", y, cx, nodeX, armEndL, ARM_W, LABEL_W, years, maxDist);
    });

    // Lignes droite
    right.forEach((slot, i) => {
      const y = topY + NODE_PAD + i * ROW_H + ROW_H / 2;
      this._drawArm(g, slot, "right", y, cx, cx + NODE_W, armEndR, ARM_W, LABEL_W, years, maxDist);
    });

    // Nœud central (pill)
    const nodeG = g.append("g").attr("class", "visu2-node");
    nodeG.append("rect")
      .attr("x", nodeX).attr("y", topY)
      .attr("width", NODE_W * 2).attr("height", nodeH)
      .attr("rx", NODE_W)
      .attr("fill", "#fff")
      .attr("stroke", "#2d327d")
      .attr("stroke-width", 2.5);
    nodeG.append("text")
      .attr("x", cx).attr("y", topY + nodeH / 2 - 6)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-family", "Inter Tight, sans-serif")
      .attr("font-size", 11).attr("font-weight", 600).attr("fill", "#000")
      .text("Yverdon");
    nodeG.append("text")
      .attr("x", cx).attr("y", topY + nodeH / 2 + 8)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-family", "Inter Tight, sans-serif")
      .attr("font-size", 8).attr("font-weight", 400).attr("fill", "rgba(0,0,0,.65)")
      .text("Gare");

    this._svgWrap.appendChild(svg.node());
  }

  // ─── Désélection ─────────────────────────────────────────────

  _deselect() {
    this._selectedId = null;
    this._lineGroups.forEach((lg) => lg.setHighlight(false, false));
    this._tooltip.hidden = true;
  }

  // ─── Dessin d'un bras horizontal ─────────────────────────────

  _drawArm(g, slot, side, y, cx, nodeEdge, armEnd, armW, labelW, years, maxDist) {
    const color   = slot.isRemoved ? "#c0c4cc" : slot.refLine.color;
    const dashed  = slot.isRemoved;
    const thick   = slot.isNew ? LINE_NEW : LINE_STROKE;
    const isLeft  = side === "left";
    const scaled  = Math.max(MIN_ARM_W, armW * Math.log(1 + slot.destDistance) / Math.log(1 + maxDist));
    const armTip  = isLeft ? armEnd - scaled : armEnd + scaled;

    const grp = g.append("g")
      .attr("class", "visu2-line")
      .attr("data-id", slot.id)
      .attr("cursor", "pointer");

    grp.append("line")
      .attr("x1", armEnd).attr("y1", y)
      .attr("x2", armTip).attr("y2", y)
      .attr("stroke", color)
      .attr("stroke-width", thick)
      .attr("stroke-dasharray", dashed ? "8 5" : null)
      .attr("stroke-linecap", "round");

    const badgeX = isLeft ? armTip - BADGE_R - 2 : armTip + BADGE_R + 2;
    grp.append("circle")
      .attr("cx", badgeX).attr("cy", y).attr("r", BADGE_R)
      .attr("fill", color)
      .attr("opacity", slot.isRemoved ? 0.55 : 1);
    grp.append("text")
      .attr("x", badgeX).attr("y", y)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-family", "Inter Tight, sans-serif")
      .attr("font-size", slot.refLine.name.length > 2 ? NUM_TEXT : NUM_TEXT + 1)
      .attr("font-weight", 600)
      .attr("fill", _contrastColor(color))
      .attr("pointer-events", "none")
      .text(slot.refLine.name);

    if (slot.destName) {
      const labelX  = isLeft ? badgeX - BADGE_R - 5 : badgeX + BADGE_R + 5;
      const anchor  = isLeft ? "end" : "start";
      const dimFill = slot.isRemoved ? "#9ca3af" : "#1a1a1a";

      // Nom de la destination
      grp.append("text")
        .attr("x", labelX).attr("y", y)
        .attr("text-anchor", anchor)
        .attr("dominant-baseline", "central")
        .attr("font-family", "Inter Tight, sans-serif")
        .attr("font-size", LEG_TEXT).attr("font-weight", 500)
        .attr("fill", dimFill)
        .text(_short(slot.destName));

    }

    const setHighlight = (isSelected, someSelected) => {
      const base = slot.isRemoved ? "#c0c4cc" : slot.refLine.color;
      if (!someSelected || isSelected) {
        grp.attr("opacity", 1);
        grp.selectAll("line").attr("stroke", base);
        grp.selectAll("circle").attr("fill", base);
      } else {
        grp.attr("opacity", OPACITY_DIM);
        grp.selectAll("line").attr("stroke", COLOR_DIMMED);
        grp.selectAll("circle").attr("fill", COLOR_DIMMED);
      }
    };

    grp.on("click", (event) => {
      event.stopPropagation();
      if (this._selectedId === slot.id) {
        this._deselect();
      } else {
        this._selectedId = slot.id;
        this._lineGroups.forEach((lg) => lg.setHighlight(lg.slot.id === slot.id, true));
        this._showTooltip(slot, years, event);
      }
    });

    this._lineGroups.push({ slot, grp, setHighlight });
  }

  // ─── Tooltip flottant ────────────────────────────────────────

  _showTooltip(slot, years, event) {
    const ref      = slot.refLine;
    const allYears = [2006, 2016, 2026];

    // Reconstruit la map complète depuis toutes les données — indépendant des années actives
    const fullByYear = new Map();
    for (const yd of this.data) {
      const dep = yd.departures.find((d) => d.id === slot.id);
      if (dep) fullByYear.set(yd.year, dep);
    }

    const changes = detectChanges(fullByYear, allYears);

    const yearRows = allYears.map((y) => {
      const dep = fullByYear.get(y);
      const dotStyle = `background:${YEAR_COLORS[y]}`;
      if (!dep) return `
        <div class="visu2-year-row">
          <div class="visu2-year-cell"><span class="visu2-year-dot" style="${dotStyle}"></span>${y}</div>
          <div class="visu2-absent">Non présente</div>
        </div>`;
      const dests = dep.destinations.map((d) =>
        `<div class="visu2-dest-row">${d.name}${d.distance ? `<span class="visu2-dist">${d.distance} km</span>` : ""}</div>`
      ).join("");
      return `
        <div class="visu2-year-row">
          <div class="visu2-year-cell"><span class="visu2-year-dot" style="${dotStyle}"></span>${y}</div>
          <div class="visu2-year-content"><div class="visu2-line-label"><strong>${dep.name}</strong></div>${dests}</div>
        </div>`;
    }).join("");

    const changesHtml = changes.length
      ? `<div class="visu2-changes"><h4>Évolutions</h4><ul>
          ${changes.map((c) => `<li class="visu2-change visu2-change--${c.type}">${c.desc}</li>`).join("")}
         </ul></div>`
      : "";

    this._tooltip.innerHTML = `
      <div class="visu2-panel-header" style="border-left:4px solid ${ref.color}">
        <div class="visu2-line-badge" style="background:${ref.color};color:${_contrastColor(ref.color)}">${ref.name}</div>
        <div class="visu2-panel-title">${ref.destinations.map((d) => d.name).join(" ↔ ")}</div>
        <button class="visu2-close visu2-tooltip-close" aria-label="Fermer">✕</button>
      </div>
      <div class="visu2-years-list">${yearRows}</div>
      ${changesHtml}
    `;

    this._tooltip.querySelector(".visu2-tooltip-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this._deselect();
    });

    // Centré horizontalement, dans le tiers supérieur du conteneur
    const rect       = this.container.getBoundingClientRect();
    const tipW       = this._tooltip.offsetWidth  || 260;
    const tipH       = this._tooltip.offsetHeight || 240;
    const x = Math.max(4, Math.min((rect.width - tipW) / 2, rect.width - tipW - 4));
    const y = Math.max(4, Math.min(rect.height * 0.12, rect.height - tipH - 4));

    this._tooltip.style.left = `${x}px`;
    this._tooltip.style.top  = `${y}px`;
    this._tooltip.hidden = false;
  }
}

// ─── Utils ────────────────────────────────────────────────────

function _contrastColor(hex) {
  if (!hex || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? "#1a1a1a" : "#ffffff";
}

function _short(name) {
  return name && name.length > 20 ? name.slice(0, 18) + "…" : name;
}
