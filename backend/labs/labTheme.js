const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeTitle(s) {
  return String(s || "Lab").replace(/</g, "");
}

/** Deterministic seed from ObjectId hex for stable theming per challenge. */
function seedFromChallengeId(challengeId) {
  if (!challengeId || typeof challengeId !== "string") return 0xdeadbeef;
  let h = 2166136261;
  for (let i = 0; i < challengeId.length; i++) {
    h ^= challengeId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) >>> 0;
}

const PALETTES = [
  { bg: "#0c0e1a", surface: "#15182b", border: "#2d3f6b", text: "#e8ecff", muted: "#9aa8d4", accent: "#7c9dff", accent2: "#b794f6" },
  { bg: "#0a1210", surface: "#102218", border: "#1d4a3a", text: "#d8f5e8", muted: "#7cb89f", accent: "#34d399", accent2: "#6ee7b7" },
  { bg: "#140a12", surface: "#22101c", border: "#5b2744", text: "#ffe8f4", muted: "#d4a0bc", accent: "#f472b6", accent2: "#fb7185" },
  { bg: "#0f0a14", surface: "#1a1224", border: "#4c1d95", text: "#f3e8ff", muted: "#c4b5fd", accent: "#a78bfa", accent2: "#818cf8" },
  { bg: "#0a1018", surface: "#0f1c2e", border: "#155e75", text: "#e0f2fe", muted: "#7dd3fc", accent: "#38bdf8", accent2: "#22d3ee" },
  { bg: "#120c08", surface: "#1f140a", border: "#78350f", text: "#fff7ed", muted: "#fdba74", accent: "#fb923c", accent2: "#fbbf24" },
  { bg: "#080c12", surface: "#0e1520", border: "#334155", text: "#f1f5f9", muted: "#94a3b8", accent: "#60a5fa", accent2: "#94a3b8" },
  { bg: "#0a1414", surface: "#102020", border: "#0f766e", text: "#ccfbf1", muted: "#5eead4", accent: "#2dd4bf", accent2: "#14b8a6" },
  { bg: "#140808", surface: "#241010", border: "#991b1b", text: "#fee2e2", muted: "#fca5a5", accent: "#f87171", accent2: "#fb7185" },
  { bg: "#0c1008", surface: "#161f0d", border: "#3f6212", text: "#ecfccb", muted: "#a3e635", accent: "#84cc16", accent2: "#65a30d" },
  { bg: "#100818", surface: "#1a0f2e", border: "#6b21a8", text: "#fae8ff", muted: "#d8b4fe", accent: "#c084fc", accent2: "#a855f7" },
  { bg: "#081012", surface: "#0d1a1f", border: "#0e7490", text: "#cffafe", muted: "#67e8f9", accent: "#06b6d4", accent2: "#0891b2" },
  { bg: "#10100c", surface: "#1c1c14", border: "#57534e", text: "#fafaf9", muted: "#a8a29e", accent: "#eab308", accent2: "#d6d3d1" },
  { bg: "#0e0a16", surface: "#18122b", border: "#4338ca", text: "#e0e7ff", muted: "#a5b4fc", accent: "#6366f1", accent2: "#818cf8" },
  { bg: "#100a0e", surface: "#1c1218", border: "#9d174d", text: "#fce7f3", muted: "#f9a8d4", accent: "#ec4899", accent2: "#f472b6" },
  { bg: "#0a120e", surface: "#0f1f18", border: "#166534", text: "#dcfce7", muted: "#86efac", accent: "#22c55e", accent2: "#4ade80" },
  { bg: "#120e0a", surface: "#201a12", border: "#b45309", text: "#ffedd5", muted: "#fdba74", accent: "#ea580c", accent2: "#f97316" },
  { bg: "#080a14", surface: "#0d1224", border: "#1d4ed8", text: "#dbeafe", muted: "#93c5fd", accent: "#3b82f6", accent2: "#2563eb" },
  { bg: "#0c1214", surface: "#141f22", border: "#0d9488", text: "#ccfbf1", muted: "#5eead4", accent: "#14b8a6", accent2: "#2dd4bf" },
  { bg: "#100812", surface: "#1a0f1f", border: "#86198f", text: "#fae8ff", muted: "#e879f9", accent: "#d946ef", accent2: "#c026d3" },
  { bg: "#0a0e12", surface: "#111827", border: "#374151", text: "#f9fafb", muted: "#9ca3af", accent: "#8b5cf6", accent2: "#a78bfa" },
  { bg: "#120a0c", surface: "#1f1215", border: "#be123c", text: "#ffe4e6", muted: "#fda4af", accent: "#f43f5e", accent2: "#fb7185" },
  { bg: "#08100c", surface: "#0d1a14", border: "#047857", text: "#d1fae5", muted: "#6ee7b7", accent: "#059669", accent2: "#10b981" },
  { bg: "#0e0c10", surface: "#18141f", border: "#5b21b6", text: "#ede9fe", muted: "#c4b5fd", accent: "#7c3aed", accent2: "#8b5cf6" },
];

const FONT_STACKS = [
  { body: '"IBM Plex Sans"', heading: '"IBM Plex Sans"', g: "IBM+Plex+Sans:wght@400;600;700" },
  { body: '"Source Sans 3"', heading: '"Source Serif 4"', g: "Source+Sans+3:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,600" },
  { body: '"Outfit"', heading: '"Outfit"', g: "Outfit:wght@400;600;700" },
  { body: '"DM Sans"', heading: '"DM Serif Display"', g: "DM+Sans:wght@400;600;700&family=DM+Serif+Display:ital@0;1" },
  { body: '"Manrope"', heading: '"Syne"', g: "Manrope:wght@400;600;700&family=Syne:wght@600;700" },
  { body: '"Work Sans"', heading: '"Fraunces"', g: "Work+Sans:wght@400;600;700&family=Fraunces:opsz,wght@9..144,600" },
  { body: '"Nunito Sans"', heading: '"Nunito Sans"', g: "Nunito+Sans:wght@400;600;700" },
  { body: '"Rubik"', heading: '"Rubik"', g: "Rubik:wght@400;600;700" },
  { body: '"Karla"', heading: '"Karla"', g: "Karla:wght@400;600;700" },
  { body: '"Mulish"', heading: '"Mulish"', g: "Mulish:wght@400;600;700" },
  { body: '"Sora"', heading: '"Sora"', g: "Sora:wght@400;600;700" },
  { body: '"Figtree"', heading: '"Figtree"', g: "Figtree:wght@400;600;700" },
];

function pickRadius(seed) {
  const r = ["10px", "4px", "0px", "20px", "8px", "14px", "18px", "6px"];
  return r[seed % r.length];
}

function bodyBackgroundExtra(seed, pal) {
  const v = seed % 8;
  const a = `${pal.accent}18`;
  const b = `${pal.accent2}12`;
  switch (v) {
    case 0:
      return `background-image: radial-gradient(ellipse 80% 50% at 50% -20%, ${a}, transparent), radial-gradient(ellipse 60% 40% at 100% 100%, ${b}, transparent);`;
    case 1:
      return `background-image: linear-gradient(165deg, ${pal.bg} 0%, ${pal.surface} 45%, ${pal.bg} 100%);`;
    case 2:
      return `background-image: repeating-linear-gradient(90deg, transparent, transparent 40px, ${a} 40px, ${a} 41px);`;
    case 3:
      return `background-image: conic-gradient(from 180deg at 50% 120%, ${a}, transparent 40%, ${b}, transparent 70%);`;
    case 4:
      return `background-image: linear-gradient(90deg, ${pal.bg} 0%, ${pal.surface} 50%, ${pal.bg} 100%);`;
    case 5:
      return `background-image: radial-gradient(circle at 20% 30%, ${a}, transparent 35%), radial-gradient(circle at 80% 70%, ${b}, transparent 40%);`;
    case 6:
      return `background-image: linear-gradient(135deg, ${pal.bg} 25%, ${pal.surface} 25%, ${pal.surface} 50%, ${pal.bg} 50%, ${pal.bg} 75%, ${pal.surface} 75%); background-size: 24px 24px;`;
    default:
      return `background-image: linear-gradient(180deg, ${pal.surface} 0%, ${pal.bg} 100%);`;
  }
}

function missionVariantClass(seed) {
  return `lab-mission-v${seed % 6}`;
}

async function fetchChallengeForLab(challengeId) {
  if (!challengeId || !mongoose.Types.ObjectId.isValid(challengeId)) return null;
  return Challenge.findById(challengeId).select("title domain category difficulty description").lean();
}

/**
 * Shared visual shell: unique per challenge (palette, fonts, layout, mission copy).
 * @param {string} challengeId
 * @param {object|null} ch - lean challenge or null
 * @param {{ routeLabel: string, objective?: string }} opts
 */
function buildLabSkin(challengeId, ch, opts) {
  const routeLabel = opts.routeLabel || "Lab";
  const objective =
    opts.objective ||
    "Complete the task in this environment. The flag you need is tied to this challenge only.";
  const seed = seedFromChallengeId(challengeId);
  const pal = PALETTES[seed % PALETTES.length];
  const fonts = FONT_STACKS[seed % FONT_STACKS.length];
  const radius = pickRadius(seed >> 3);
  const layoutClass = missionVariantClass(seed);
  const title = ch?.title || routeLabel;
  const desc = ch?.description ? String(ch.description).trim() : "";
  const shortDesc = desc.length > 220 ? `${desc.slice(0, 217)}…` : desc;

  const fontLink = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=${fonts.g}&display=swap" rel="stylesheet" />`;

  const bgExtra = bodyBackgroundExtra(seed, pal);

  const globalCss = `
    :root {
      --lab-bg: ${pal.bg};
      --lab-surface: ${pal.surface};
      --lab-border: ${pal.border};
      --lab-text: ${pal.text};
      --lab-muted: ${pal.muted};
      --lab-accent: ${pal.accent};
      --lab-accent2: ${pal.accent2};
      --lab-radius: ${radius};
      --lab-font: ${fonts.body}, system-ui, sans-serif;
      --lab-heading: ${fonts.heading}, ${fonts.body}, system-ui, sans-serif;
    }
    body.lab-skin {
      margin: 0;
      min-height: 100vh;
      background-color: var(--lab-bg);
      color: var(--lab-text);
      font-family: var(--lab-font);
      font-size: 15px;
      line-height: 1.5;
      ${bgExtra}
    }
    .lab-skin .lab-wrap { max-width: 960px; margin: 0 auto; padding: 20px 18px 40px; }
    .lab-skin .lab-mission {
      font-family: var(--lab-heading);
      margin-bottom: 20px;
      padding: 16px 18px;
      background: var(--lab-surface);
      border: 1px solid var(--lab-border);
      border-radius: var(--lab-radius);
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }
    .lab-skin .lab-mission-v0 { border-left: 5px solid var(--lab-accent); }
    .lab-skin .lab-mission-v1 { border-top: 5px solid var(--lab-accent2); }
    .lab-skin .lab-mission-v2 {
      border: 1px solid var(--lab-border);
      border-image: linear-gradient(135deg, var(--lab-accent), var(--lab-accent2)) 1;
    }
    .lab-skin .lab-mission-v3 {
      background: linear-gradient(145deg, var(--lab-surface), rgba(0,0,0,0.25));
      border-left: 6px double var(--lab-accent);
    }
    .lab-skin .lab-mission-v4 {
      clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
      border-bottom: 3px solid var(--lab-accent2);
    }
    .lab-skin .lab-mission-v5 {
      border-radius: var(--lab-radius);
      outline: 2px solid var(--lab-accent);
      outline-offset: 4px;
    }
    .lab-skin .lab-mission h1 {
      margin: 0 0 8px;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--lab-text);
      letter-spacing: -0.02em;
    }
    .lab-skin .lab-route-pill {
      display: inline-block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--lab-accent2);
      margin-bottom: 10px;
      font-family: var(--lab-font);
    }
    .lab-skin .lab-meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .lab-skin .lab-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--lab-border);
      color: var(--lab-muted);
      font-family: var(--lab-font);
    }
    .lab-skin .lab-badge.accent { color: var(--lab-accent); border-color: var(--lab-accent); }
    .lab-skin .lab-objective {
      margin: 0;
      color: var(--lab-muted);
      font-size: 14px;
      font-family: var(--lab-font);
    }
    .lab-skin .lab-desc-snippet {
      margin: 10px 0 0;
      font-size: 13px;
      color: var(--lab-muted);
      opacity: 0.95;
      font-family: var(--lab-font);
    }
    .lab-skin .lab-panel, .lab-skin .container {
      background: var(--lab-surface);
      border: 1px solid var(--lab-border);
      border-radius: var(--lab-radius);
      padding: 22px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    }
    .lab-skin .container h2, .lab-skin .lab-panel h2 {
      font-family: var(--lab-heading);
      color: var(--lab-text);
      margin-top: 0;
    }
    .lab-skin input, .lab-skin textarea, .lab-skin select {
      font-family: var(--lab-font);
      border-radius: calc(var(--lab-radius) * 0.6);
    }
    .lab-skin button, .lab-skin .btn-lab {
      border-radius: calc(var(--lab-radius) * 0.6);
    }
    .lab-skin .lab-info-box {
      padding: 14px 16px;
      margin-bottom: 18px;
      border-radius: calc(var(--lab-radius) * 0.55);
      border-left: 4px solid var(--lab-accent);
      background: color-mix(in srgb, var(--lab-surface) 92%, var(--lab-accent));
      color: var(--lab-muted);
      font-size: 14px;
    }
    .lab-skin label { color: var(--lab-text); }
    .lab-skin input[type="text"], .lab-skin input[type="password"], .lab-skin input[type="email"], .lab-skin textarea {
      padding: 10px 12px;
      border: 1px solid var(--lab-border);
      background: color-mix(in srgb, var(--lab-bg) 70%, var(--lab-surface));
      color: var(--lab-text);
    }
    .lab-skin button {
      padding: 10px 18px;
      border: none;
      cursor: pointer;
      background: var(--lab-accent);
      color: var(--lab-bg);
      font-weight: 600;
    }
    .lab-skin button:hover { filter: brightness(1.08); }
    .lab-skin .result {
      margin-top: 18px;
      padding: 14px;
      background: color-mix(in srgb, var(--lab-bg) 50%, var(--lab-surface));
      border-radius: calc(var(--lab-radius) * 0.5);
      border: 1px solid var(--lab-border);
      min-height: 48px;
    }
    .lab-skin .success, .lab-skin .lab-success-text { color: var(--lab-accent2); font-weight: 600; }
    .lab-skin .error, .lab-skin .lab-error-text { color: #f87171; }
    .lab-skin table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .lab-skin th, .lab-skin td { padding: 10px; border: 1px solid var(--lab-border); text-align: left; }
    .lab-skin th { background: color-mix(in srgb, var(--lab-surface) 80%, var(--lab-accent)); color: var(--lab-text); }
    .lab-skin tr:nth-child(even) { background: color-mix(in srgb, var(--lab-surface) 95%, var(--lab-bg)); }
  `;

  const cat = ch?.category ? escapeHtml(ch.category) : "";
  const diff = ch?.difficulty ? escapeHtml(ch.difficulty) : "";
  const dom = ch?.domain ? escapeHtml(ch.domain) : "";

  const missionBar = `
    <div class="lab-mission ${layoutClass}">
      <div class="lab-route-pill">${escapeHtml(routeLabel)}</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="lab-meta-row">
        ${cat ? `<span class="lab-badge accent">${cat}</span>` : ""}
        ${diff ? `<span class="lab-badge">${diff}</span>` : ""}
        ${dom ? `<span class="lab-badge">${dom}</span>` : ""}
      </div>
      <p class="lab-objective">${escapeHtml(objective)}</p>
      ${shortDesc ? `<p class="lab-desc-snippet">${escapeHtml(shortDesc)}</p>` : ""}
    </div>`;

  return {
    fontLink,
    globalCss,
    missionBar,
    docTitle: `${safeTitle(title)} — ${safeTitle(routeLabel)}`,
    bodyClass: `lab-skin ${layoutClass}`,
  };
}

/**
 * For theory lab: merge palette into existing :root (string replace or inject after first :root {)
 */
function buildTheoryRootOverride(challengeId, ch) {
  const seed = seedFromChallengeId(challengeId);
  const pal = PALETTES[seed % PALETTES.length];
  const fonts = FONT_STACKS[seed % FONT_STACKS.length];
  const radius = pickRadius(seed >> 3);
  const bgExtra = bodyBackgroundExtra(seed, pal);
  return `
    :root {
      --bg: ${pal.bg};
      --panel: ${pal.surface};
      --border: ${pal.border};
      --text: ${pal.text};
      --muted: ${pal.muted};
      --accent: ${pal.accent};
      --ok: ${pal.accent2};
      --err: #f87171;
      --amber: #fbbf24;
      --font: ${fonts.body}, "JetBrains Mono", monospace;
      --font-ui: ${fonts.body}, system-ui, sans-serif;
      --lab-radius-theory: ${radius};
    }
    body {
      ${bgExtra}
    }
    .topbar {
      background: linear-gradient(90deg, ${pal.surface}, ${pal.bg}) !important;
      border-bottom-color: var(--border) !important;
    }
    .brand {
      font-family: ${fonts.heading}, var(--font-ui) !important;
      color: var(--accent) !important;
    }
    .layout .sidebar, .layout .rightbar, .main .tabs {
      border-radius: 0 var(--lab-radius-theory) var(--lab-radius-theory) 0;
    }
  `;
}

module.exports = {
  escapeHtml,
  safeTitle,
  seedFromChallengeId,
  fetchChallengeForLab,
  buildLabSkin,
  buildTheoryRootOverride,
};
