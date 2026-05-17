/**
 * visu3.js — Graphique en barres horizontales des temps de trajet
 *
 * – Barres côte à côte par destination (une barre = une année)
 * – Axe X : 0 → max arrondi
 * – Pas de labels ni d'indicateurs de diff dans le graphe
 * – Tooltip au survol : durée + évolutions année par année
 *   (delta toujours de l'année N-1 vers N)
 */

import * as d3 from 'd3';

// ─── Constantes ────────────────────────────────────────────────

const YEAR_COLORS = { 2006: '#00b4d8', 2016: '#52b788', 2026: '#c5e003' };

const MARGIN     = { top: 24, right: 40, bottom: 28, left: 130 };
const BAR_H      = 10;   // hauteur d'une barre individuelle
const BAR_GAP    = 3;    // gap entre barres du même groupe
const GROUP_PAD  = 10;   // espace entre groupes de destinations
const BAR_RX     = 3;    // arrondi extrémité droite

// ─── Classe principale ─────────────────────────────────────────

export class TravelTimes {
  constructor({ container, data }) {
    this.container   = container;
    this.data        = data;
    this.activeYears = new Set();
    this._svgWrap    = null;
    this._tooltip    = null;
    this._buildDOM();
  }

  setActiveYears(yearsSet) {
    this.activeYears = new Set(yearsSet);
    this._render();
  }

  init(initialYears = new Set([2006])) { this.setActiveYears(initialYears); }
  destroy() {}

  // ─── DOM ─────────────────────────────────────────────────────

  _buildDOM() {
    this.container.innerHTML = '';
    this.container.classList.add('visu3-container');

    this._svgWrap = document.createElement('div');
    this._svgWrap.className = 'visu3-svg-wrap';
    this.container.appendChild(this._svgWrap);

    this._tooltip = document.createElement('div');
    this._tooltip.className = 'visu3-tooltip';
    this._tooltip.style.display = 'none';
    this.container.appendChild(this._tooltip);

    const sourceBar = document.createElement('div');
    sourceBar.className = 'visu-source-bar';
    sourceBar.innerHTML = `Sources : <a href="https://www.tp-info.ch/fr/horaire-actuel/archives-des-horaires" target="_blank" rel="noopener">Archives horaires OFT</a>&nbsp;·&nbsp;Archives horaires Travys (lignes urbaines)`;
    this.container.appendChild(sourceBar);
  }

  // ─── Rendu ───────────────────────────────────────────────────

  _render() {
    this._svgWrap.innerHTML = '';

    const years = [...this.activeYears].sort((a, b) => a - b);
    if (years.length === 0) return;

    // Destinations présentes dans au moins une année active
    const destSet = new Set();
    for (const year of years) {
      const yd = this.data.find(d => d.year === year);
      if (!yd) continue;
      yd.travel_times.forEach(t => destSet.add(t.destination));
    }
    const destinations = [...destSet].sort((a, b) => _avgDuration(this.data, a) - _avgDuration(this.data, b));
    const nYears = years.length;
    const nDest  = destinations.length;

    // Max de l'axe X
    let maxDur = 0;
    for (const year of years) {
      const yd = this.data.find(d => d.year === year);
      if (!yd) continue;
      yd.travel_times.forEach(t => { if (t.duration_minutes > maxDur) maxDur = t.duration_minutes; });
    }
    maxDur = Math.ceil(maxDur / 10) * 10;

    // Hauteur d'un groupe (toutes les barres d'une destination)
    const groupH   = nYears * (BAR_H + BAR_GAP) - BAR_GAP + GROUP_PAD;
    const innerH   = nDest * groupH;
    const innerW   = 500;
    const W        = MARGIN.left + innerW + MARGIN.right;
    const H        = MARGIN.top  + innerH + MARGIN.bottom;

    const svg = d3.create('svg')
      .attr('width', '100%')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('class', 'visu3-svg');

    const g = svg.append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // ── Échelle X ──
    const xScale = d3.scaleLinear().domain([0, maxDur]).range([0, innerW]);

    // ── Grille et axe X ──
    const xTicks = xScale.ticks(6);
    xTicks.forEach(tick => {
      g.append('line')
        .attr('x1', xScale(tick)).attr('x2', xScale(tick))
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', '#e5e7eb').attr('stroke-width', 0.5);

      g.append('text')
        .attr('x', xScale(tick)).attr('y', innerH + 16)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Inter Tight, sans-serif')
        .attr('font-size', 11).attr('fill', '#6b7280')
        .text(`${tick} min`);
    });

    g.append('line')
      .attr('x1', 0).attr('x2', innerW)
      .attr('y1', innerH).attr('y2', innerH)
      .attr('stroke', '#e5e7eb').attr('stroke-width', 1);

    // ── Groupes de barres ──
    destinations.forEach((dest, di) => {
      const groupY = di * groupH;

      // Fond alterné
      if (di % 2 === 0) {
        g.append('rect')
          .attr('x', -MARGIN.left).attr('y', groupY - GROUP_PAD / 2)
          .attr('width', W).attr('height', groupH)
          .attr('fill', '#f8f9fa');
      }

      // Label destination
      g.append('text')
        .attr('x', -8).attr('y', groupY + (nYears * (BAR_H + BAR_GAP) - BAR_GAP) / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'central')
        .attr('font-family', 'Inter Tight, sans-serif')
        .attr('font-size', 12).attr('font-weight', 500).attr('fill', '#1a1a1a')
        .text(dest);

      // Durées par année pour cette destination
      const durMap = new Map();
      for (const year of years) {
        const yd  = this.data.find(d => d.year === year);
        const dur = yd?.travel_times.find(t => t.destination === dest)?.duration_minutes;
        if (dur != null) durMap.set(year, dur);
      }
      // Barres — une par année, empilées verticalement
      years.forEach((year, yi) => {
        const dur = durMap.get(year);
        if (dur == null) return;

        const barY  = groupY + yi * (BAR_H + BAR_GAP);
        const barW  = xScale(dur);
        const color = YEAR_COLORS[year];

        const barGrp = g.append('g')
          .attr('class', 'visu3-bar-group')
          .attr('cursor', 'pointer');

        barGrp.append('path')
          .attr('d', _barPath(0, barY, barW, BAR_H, BAR_RX))
          .attr('fill', color)
          .attr('class', 'visu3-bar');

        // Interactions
        barGrp
          .on('mouseenter', (event) => {
            barGrp.selectAll('.visu3-bar').attr('filter', 'brightness(1.18)');
            this._showTooltip(event, dest, year, durMap, years);
          })
          .on('mousemove', (event) => { this._moveTooltip(event); })
          .on('mouseleave', () => {
            barGrp.selectAll('.visu3-bar').attr('filter', null);
            this._tooltip.style.display = 'none';
          });
      });
    });

    this._svgWrap.appendChild(svg.node());
  }

  // ─── Tooltip ──────────────────────────────────────────────────

  _showTooltip(event, dest, hoveredYear, durMap, years) {
    // Lignes : une par année avec delta depuis l'année précédente
    const rows = years.map((year, i) => {
      const dur   = durMap.get(year);
      const color = YEAR_COLORS[year];
      const badge = `<span class="visu3-tt-badge" style="background:${color};color:${_contrastColor(color)}">${year}</span>`;

      if (dur == null) {
        return `<div>${badge} <span class="visu3-tt-absent">—</span></div>`;
      }

      let deltaHtml = '';
      if (i > 0) {
        const prevDur = durMap.get(years[i - 1]);
        if (prevDur != null) {
          const diff = dur - prevDur;
          const sign = diff > 0 ? '+' : '';
          const cls  = diff > 0 ? 'visu3-tt-worse' : diff < 0 ? 'visu3-tt-better' : 'visu3-tt-same';
          deltaHtml  = `<span class="${cls}">${sign}${diff} min</span>`;
        }
      }

      const bold = year === hoveredYear ? 'font-weight:600' : '';
      return `<div style="${bold}">${badge} ${dur} min ${deltaHtml}</div>`;
    }).join('');

    this._tooltip.innerHTML = `
      <div class="visu3-tt-dest">${dest}</div>
      <div class="visu3-tt-rows">${rows}</div>
    `;
    this._tooltip.style.display = 'block';
    this._moveTooltip(event);
  }

  _moveTooltip(event) {
    const rect  = this.container.getBoundingClientRect();
    const x     = event.clientX - rect.left + 14;
    const y     = event.clientY - rect.top  - 10;
    const ttW   = this._tooltip.offsetWidth  || 200;
    const ttH   = this._tooltip.offsetHeight || 80;
    const safeX = x + ttW > rect.width  ? x - ttW - 28 : x;
    const safeY = y - ttH < 0           ? y + 20        : y - ttH;
    this._tooltip.style.left = `${safeX}px`;
    this._tooltip.style.top  = `${safeY}px`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function _barPath(x, y, w, h, rx) {
  const r = Math.min(rx, h / 2, Math.max(w, 0));
  if (w <= 0) return '';
  return [
    `M${x},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h - r}`,
    `Q${x + w},${y + h} ${x + w - r},${y + h}`,
    `H${x} Z`,
  ].join(' ');
}

function _avgDuration(data, dest) {
  const vals = [2006, 2016, 2026].flatMap(y => {
    const dur = data.find(d => d.year === y)?.travel_times.find(t => t.destination === dest)?.duration_minutes;
    return dur != null ? [dur] : [];
  });
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : Infinity;
}

function _contrastColor(hex) {
  if (!hex || hex.length < 7) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1a1a1a' : '#ffffff';
}