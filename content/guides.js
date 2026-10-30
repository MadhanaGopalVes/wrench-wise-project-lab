'use strict';
const catalogue = require('./catalogue');

const GUIDES = {
  'ml-model-builder': require('./guides/ml-model-builder'),
  'pdf-chatbot': require('./guides/pdf-chatbot'),
  'support-agent': require('./guides/support-agent'),
  'churn-prediction': require('./guides/churn-prediction'),
  'image-classifier': require('./guides/image-classifier'),
  'recommendation-engine': require('./guides/recommendation-engine'),
};
const get = (id) => GUIDES[id] || null;

// Strip server-only data (correct answers). Used for everything sent to the browser.
function publicGuide(id) {
  const g = GUIDES[id]; if (!g) return null;
  const strip = (arr, keepId) => arr.map(({ answer, explain, ...rest }, i) => ({ ...rest, ...(keepId ? {} : { idx: i }) }));
  return { ...g, checks: strip(g.checks, true), quiz: strip(g.quiz) };
}

// Pre-unlock preview: no guide content, only what the landing page promises.
function preview(id) {
  const p = catalogue.byId(id); if (!p) return null;
  const g = GUIDES[id];
  return {
    ...catalogue.card(p), tagline: p.tagline, overview: p.overview || null, inside: p.inside || null, outcome: p.outcome,
    programme: p.programme,
    sections: g ? [
      { n: '01', title: 'Objective', teaser: g.objective[0] },
      { n: '02', title: 'Prerequisites', teaser: `${g.prerequisites.length} things to have ready` },
      { n: '03', title: 'Tools', teaser: g.tools.map((t) => t.name).join(' · ') },
      { n: '04', title: 'Steps', teaser: `${g.steps.length} guided build steps, e.g. "${g.steps[0].title}"` },
      { n: '05', title: 'Expected Result', teaser: g.expected.points[0] },
      { n: '06', title: 'Share Your Project', teaser: 'A prefilled LinkedIn post for your verified certificate' },
      { n: '07', title: 'Related Programme', teaser: p.programme.name },
    ] : [],
    handout: g ? { steps: g.steps.length, experiments: g.experiments.length, checks: g.checks.length, quiz: g.quiz.length, concepts: g.concepts.length } : null,
    architecturePreview: g ? g.architecture.nodes.map((n) => n.label) : [],
  };
}
module.exports = { get, publicGuide, preview };
