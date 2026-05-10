/**
 * YearManager.js
 * Gère les boutons de sélection des années dans le header.
 * Le scroll scrollytelling est géré par app.js via applyStep().
 */

export class YearManager {
  constructor({ onYearsChange } = {}) {
    /** @type {Set<number>} */
    this.activeYears = new Set();

    /** @type {(years: Set<number>) => void} */
    this.onYearsChange = onYearsChange ?? (() => {});

    /** @type {NodeListOf<HTMLButtonElement>} */
    this.buttons = document.querySelectorAll('.year-btn[data-year]');
  }

  // ─── Cycle de vie ──────────────────────────────────────────────

  init() {
    this._bindButtons();
    // Activation initiale silencieuse (sans déclencher onYearsChange)
    this.activeYears.add(2006);
    this._updateButtonStates();
  }

  // ─── API publique ──────────────────────────────────────────────

  /** Retourne un tableau trié des années actives. */
  getActiveYears() {
    return [...this.activeYears].sort((a, b) => a - b);
  }

  /**
   * Synchronise l'état visuel des boutons depuis app.js
   * lors d'un changement d'étape scroll, sans déclencher onYearsChange.
   * @param {Set<number>} yearsSet
   */
  syncButtons(yearsSet) {
    this.activeYears = new Set(yearsSet);
    this._updateButtonStates();
  }

  // ─── Boutons header ────────────────────────────────────────────

  _bindButtons() {
    this.buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        this._toggle(Number(btn.dataset.year));
      });
    });
  }

  _toggle(year) {
    if (this.activeYears.has(year)) {
      if (this.activeYears.size === 1) return; // au moins une année toujours active
      this._deactivate(year);
    } else {
      this._activate(year);
    }
  }

  _activate(year) {
    if (this.activeYears.has(year)) return;
    this.activeYears.add(year);
    this._updateButtonStates();
    this.onYearsChange(new Set(this.activeYears));
  }

  _deactivate(year) {
    if (!this.activeYears.has(year)) return;
    this.activeYears.delete(year);
    this._updateButtonStates();
    this.onYearsChange(new Set(this.activeYears));
  }

  _updateButtonStates() {
    this.buttons.forEach(btn => {
      const year   = Number(btn.dataset.year);
      const active = this.activeYears.has(year);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }
}
