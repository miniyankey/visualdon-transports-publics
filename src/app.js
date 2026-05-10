/**
 * app.js — Point d'entrée principal
 * Transports Publics · Yverdon-les-Bains
 */

import { YearManager } from './lib/YearManager.js';
import { Relations }   from './lib/Relations.js';
import { Departures }  from './lib/Departures.js';
import { TravelTimes } from './lib/TravelTimes.js';

// ─── Données ───────────────────────────────────────────────────

const data = await fetch('/data/data_example.json').then(r => r.json());

// ─── Séquence des 9 étapes ─────────────────────────────────────

const YEARS    = [2006, 2016, 2026];
const VIZ_KEYS = ['relations', 'departures', 'travel_times'];

const STEPS = VIZ_KEYS.flatMap(vizKey =>
  YEARS.map((_, i) => ({ vizKey, years: YEARS.slice(0, i + 1) }))
);

// ─── DOM ───────────────────────────────────────────────────────

document.querySelector('#main-content').innerHTML = `
  <div class="scroll-stage">

    <div class="scroll-sticky section-layout">
      <div class="section-text-col">
        <button class="step-nav step-nav--prev" id="step-prev" aria-label="Étape précédente" disabled>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 10 L8 6 L12 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="section-text">
          <span class="section-text__label" id="comment-label"></span>
          <h2   class="section-text__title" id="comment-title"></h2>
          <div  class="section-text__body"  id="comment-content"></div>
        </div>
        <button class="step-nav step-nav--next" id="step-next" aria-label="Étape suivante">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6 L8 10 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="section-viz">
        <div id="visu-relations"></div>
        <div id="visu-departures"    hidden></div>
        <div id="visu-travel_times"  hidden></div>
      </div>
    </div>

    <div class="scroll-spacers" aria-hidden="true">
      ${Array.from({ length: STEPS.length - 1 }, (_, i) =>
        `<div class="scroll-sentinel" data-step="${i + 1}"></div>`
      ).join('\n      ')}
    </div>

  </div>
`;

const btnPrev = document.getElementById('step-prev');
const btnNext = document.getElementById('step-next');
const textEl  = document.querySelector('.section-text');
const vizEl   = document.querySelector('.section-viz');

// ─── État ──────────────────────────────────────────────────────

let currentStep          = 0;
let currentVizKey        = STEPS[0].vizKey;
let activeYears          = new Set(STEPS[0].years);
let userHasInteracted    = false;
let isProgrammaticScroll = false;

const TRANS_MS = 200;
let commentTimer = null;
let vizTimer     = null;

// ─── Instances de visualisation ────────────────────────────────

const vizInstances = {
  relations:    new Relations   ({ container: document.querySelector('#visu-relations'),    data }),
  departures:   new Departures  ({ container: document.querySelector('#visu-departures'),   data }),
  travel_times: new TravelTimes ({ container: document.querySelector('#visu-travel_times'), data }),
};

// ─── Commentaire ───────────────────────────────────────────────

function updateComment(animate = true) {
  const maxYear  = Math.max(...activeYears);
  const yearData = data.find(d => d.year === maxYear);
  const comment  = yearData?.comments?.[currentVizKey];
  if (!comment) return;

  const applyText = () => {
    document.getElementById('comment-label'  ).textContent = comment.visu_name ?? '';
    document.getElementById('comment-title'  ).textContent = comment.title     ?? '';
    document.getElementById('comment-content').textContent = comment.content   ?? '';
  };

  if (!animate) { applyText(); return; }

  clearTimeout(commentTimer);
  textEl.classList.add('is-updating');
  commentTimer = setTimeout(() => {
    applyText();
    textEl.classList.remove('is-updating');
  }, TRANS_MS);
}

// ─── Application d'une étape ───────────────────────────────────

function applyStep(stepIndex) {
  const step       = STEPS[stepIndex];
  const vizChanged = step.vizKey !== currentVizKey;

  if (vizChanged) {
    clearTimeout(vizTimer);
    vizEl.classList.add('is-updating');
    const fromKey = currentVizKey;
    currentVizKey     = step.vizKey;
    userHasInteracted = false;
    vizTimer = setTimeout(() => {
      document.querySelector(`#visu-${fromKey}`).hidden = true;
      document.querySelector(`#visu-${currentVizKey}`).hidden = false;
      vizEl.classList.remove('is-updating');
    }, TRANS_MS);
  }

  if (!userHasInteracted || vizChanged) {
    activeYears = new Set(step.years);
    vizInstances[currentVizKey].setActiveYears(activeYears);
    manager.syncButtons(activeYears);
  }

  currentStep = stepIndex;
  updateComment();
  updateNavButtons();
}

// ─── Navigation par boutons ────────────────────────────────────

function updateNavButtons() {
  btnPrev.disabled = currentStep === 0;
  btnNext.disabled = currentStep === STEPS.length - 1;
}

function navigateStep(target) {
  if (target < 0 || target >= STEPS.length) return;
  applyStep(target);

  // Bloquer le scroll handler pendant le scroll programmé
  isProgrammaticScroll = true;
  if (target === 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    sentinels[target - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  setTimeout(() => { isProgrammaticScroll = false; }, 700);
}

btnPrev.addEventListener('click', () => navigateStep(currentStep - 1));
btnNext.addEventListener('click', () => navigateStep(currentStep + 1));

// ─── Scroll ────────────────────────────────────────────────────

const sentinels = document.querySelectorAll('.scroll-sentinel');

window.addEventListener('scroll', () => {
  if (isProgrammaticScroll) return;
  let newStep = 0;
  sentinels.forEach(el => {
    if (el.getBoundingClientRect().top <= window.innerHeight / 2) {
      newStep = parseInt(el.dataset.step);
    }
  });
  if (newStep !== currentStep) applyStep(newStep);
}, { passive: true });

// ─── Gestionnaire d'années (header) ────────────────────────────

const manager = new YearManager({
  onYearsChange: yearsSet => {
    userHasInteracted = true;
    activeYears       = new Set(yearsSet);
    vizInstances[currentVizKey].setActiveYears(activeYears);
    updateComment();
  },
});

manager.init();

// ─── Initialisation ────────────────────────────────────────────

vizInstances.relations   .init(activeYears);
vizInstances.departures  .init(new Set());
vizInstances.travel_times.init(new Set());

updateComment(false); // pas d'animation au chargement
updateNavButtons();
