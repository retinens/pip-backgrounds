import './style.css';
import { Engine } from './engine/Engine.js';
import { SCENES, sceneById } from './scenes/index.js';
import { Panel } from './ui/Panel.js';
import { LogoOverlay } from './ui/Logo.js';
import * as store from './presets/store.js';
import { createSync, openOnOtherScreen } from './sync.js';

const $ = (sel) => document.querySelector(sel);

const params = new URLSearchParams(window.location.search);
// output window: fullscreen render only, driven by the control window
const isOutput = params.get('output') === '1';

const state = store.loadInitialState();
const engine = new Engine($('#stage'));
const logo = new LogoOverlay($('#logo'));
logo.setData(store.loadLogoData());

let paused = false;
let preview = true;
let toastTimer = 0;
let panel = null;

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const common = () => ({
  colors: state.colors,
  bg: state.bg,
  intensity: state.intensity,
  scale: state.scale,
});

function applyScene(duration = 0) {
  app.sceneClass = sceneById(state.scene);
  state.scene = app.sceneClass.id;
  engine.setScene(app.sceneClass, {
    params: state.sceneParams[state.scene],
    common: common(),
    duration,
  });
}

/** Re-apply the whole state (after loading a preset / import / reset). */
function applyAll() {
  engine.setResolution(state.resolution);
  engine.setPost(state);
  applyScene(state.transition);
  logo.apply(state.logo);
  panel?.buildSceneFolder();
  panel?.refresh();
  app.persist();
}

function replaceState(next, logoData) {
  const normalized = store.normalize(next);
  // mutate in place: the panel controllers hold references to these objects
  Object.assign(state.logo, normalized.logo);
  state.colors.splice(0, 4, ...normalized.colors);
  for (const key of Object.keys(normalized)) {
    if (key !== 'logo' && key !== 'colors') state[key] = normalized[key];
  }
  if (logoData !== undefined) {
    logo.setData(logoData);
    store.saveLogoData(logoData);
  }
  applyAll();
}

const app = {
  state,
  sceneClass: sceneById(state.scene),
  stats: { fps: 0 },
  output: { preview: true, status: 'aucune' },
  presetNames: () => Object.keys(store.listPresets()).sort(),
  persist() {
    if (isOutput) return;
    store.persist(state);
    broadcast();
  },

  onSceneChange() {
    applyScene(state.transition);
    panel?.buildSceneFolder();
    app.persist();
  },
  onCommonChange() {
    engine.setCommon(common());
    app.persist();
  },
  onPostChange() {
    engine.setPost(state);
    app.persist();
  },
  onRenderChange() {
    engine.setResolution(state.resolution);
    app.persist();
  },
  onSceneParam(key, value, finished) {
    const def = app.sceneClass.params[key];
    if (def.rebuild && !finished) return;
    engine.current.setParams({ [key]: value });
    app.persist();
  },
  onLogoChange() {
    logo.apply(state.logo);
    app.persist();
  },

  actions: {
    togglePause() {
      paused = !paused;
      toast(paused ? 'Pause' : 'Lecture');
      broadcast();
    },
    shuffleColors() {
      const c = state.colors;
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [c[i], c[j]] = [c[j], c[i]];
      }
      panel.refresh();
      app.onCommonChange();
    },
    resetSceneParams() {
      delete state.sceneParams[state.scene];
      applyScene(0);
      panel.buildSceneFolder();
      app.persist();
    },
    async uploadLogo() {
      try {
        const data = await store.pickFile('image/png,image/svg+xml,image/jpeg,image/webp', 'dataUrl');
        logo.setData(data);
        state.logo.visible = true;
        panel.refresh();
        app.onLogoChange();
        if (!store.saveLogoData(data)) toast('Logo trop lourd pour être mémorisé — il sera perdu au rechargement');
      } catch {
        /* cancelled */
      }
    },
    removeLogo() {
      logo.setData('');
      store.saveLogoData('');
      app.onLogoChange();
    },
    savePreset(name) {
      name = name.trim();
      if (!name) return toast('Donne un nom au preset');
      const withLogo = store.savePreset(name, state, logo.data);
      panel.presetUi.selected = name;
      panel.refreshPresets();
      toast(withLogo ? `Preset « ${name} » enregistré` : `Preset « ${name} » enregistré sans le logo (stockage plein)`);
    },
    loadPreset(name) {
      const preset = store.listPresets()[name];
      if (!preset) return;
      replaceState(preset.state, preset.logoData || '');
      toast(`Preset « ${name} » chargé`);
    },
    deletePreset(name) {
      if (!name || !confirm(`Supprimer le preset « ${name} » ?`)) return;
      store.deletePreset(name);
      panel.refreshPresets();
    },
    exportJson() {
      const name = panel.presetUi.name.trim() || state.scene;
      store.downloadJson(`pip-background-${name.replace(/[^\w-]+/g, '_')}.json`, {
        app: 'pip-backgrounds',
        version: 1,
        state,
        logoData: logo.data,
      });
    },
    async importJson() {
      try {
        const data = JSON.parse(await store.pickFile('application/json,.json'));
        replaceState(data.state || data, data.logoData ?? undefined);
        toast('Configuration importée');
      } catch (e) {
        if (e instanceof SyntaxError) toast('Fichier JSON invalide');
      }
    },
    async copyLiveUrl() {
      const url = store.stateUrl(state, { hideUi: true });
      try {
        await navigator.clipboard.writeText(url);
        toast(logo.data ? 'URL copiée — le logo importé n’y est pas : utilise une URL de logo' : 'URL live copiée');
      } catch {
        prompt('URL live :', url);
      }
    },
    reset() {
      if (!confirm('Revenir aux réglages par défaut ?')) return;
      replaceState(store.DEFAULT_STATE);
    },
    async openOutput() {
      const url = new URL(store.stateUrl(state));
      url.search = '?output=1';
      const w = await openOnOtherScreen(url.toString(), 'pip-backgrounds-output');
      if (!w) return toast('Fenêtre bloquée : autorise les pop-ups pour cette page');
      sync.addWindow(w);
      toast('Sortie ouverte — clique dedans pour la passer en plein écran');
    },
    togglePreview() {
      preview = !preview;
      app.output.preview = preview;
      document.body.classList.toggle('preview-off', !preview);
    },
    fullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    },
    toggleHelp() {
      $('#help').hidden = !$('#help').hidden;
    },
  },
};

// --- Control ⇄ output sync -------------------------------------------------

let sentLogo = null;
let broadcastTimer = 0;
/** Push the full state to output windows (coalesced to one message per frame). */
function broadcast({ force = false } = {}) {
  if (isOutput) return;
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    const msg = { state, paused };
    // the logo data URL can be big: only send it when it changed
    if (force || logo.data !== sentLogo) msg.logoData = sentLogo = logo.data;
    sync.post('state', msg);
  }, 16);
}

/** Output side: apply a state received from the control window, rebuilding only what changed. */
function applyRemote(msg) {
  const prevScene = state.scene;
  const prevResolution = state.resolution;
  const next = store.normalize(msg.state);
  Object.assign(state.logo, next.logo);
  state.colors.splice(0, 4, ...next.colors);
  for (const key of Object.keys(next)) {
    if (key !== 'logo' && key !== 'colors') state[key] = next[key];
  }
  if (msg.logoData !== undefined) logo.setData(msg.logoData);
  paused = !!msg.paused;

  if (state.resolution !== prevResolution) engine.setResolution(state.resolution);
  engine.setPost(state);
  if (state.scene !== prevScene) {
    applyScene(state.transition);
  } else {
    engine.current.setParams(state.sceneParams[state.scene] || {});
    engine.setCommon(common());
  }
  logo.apply(state.logo);
}

const sync = createSync((msg) => {
  if (isOutput && msg.type === 'state') applyRemote(msg);
  if (!isOutput && msg.type === 'hello') broadcast({ force: true });
});

// --- Boot ------------------------------------------------------------------

engine.setResolution(state.resolution);
engine.setPost(state);
applyScene(0);
logo.apply(state.logo);

const setUiHidden = (hidden) => document.body.classList.toggle('ui-hidden', hidden);

if (isOutput) {
  setUiHidden(true);
  document.title = 'PiP Backgrounds — sortie';
  sync.post('hello');
  // fullscreen needs a user gesture inside this window
  const hint = $('#output-hint');
  hint.hidden = false;
  setTimeout(() => (hint.hidden = true), 6000);
  window.addEventListener('click', () => {
    hint.hidden = true;
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  });
} else {
  panel = new Panel(app);
  setUiHidden(params.get('ui') === '0');
  app.persist();
  setInterval(() => {
    const n = sync.openWindows();
    app.output.status = n ? `${n} fenêtre${n > 1 ? 's' : ''} ouverte${n > 1 ? 's' : ''}` : 'aucune';
  }, 1000);
}

window.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (isOutput && !['f', 'F'].includes(e.key)) return;
  const step = (dir) => {
    const i = SCENES.findIndex((S) => S.id === state.scene);
    state.scene = SCENES[(i + dir + SCENES.length) % SCENES.length].id;
    panel.refresh();
    app.onSceneChange();
    toast(app.sceneClass.label);
  };
  switch (e.key) {
    case 'h':
    case 'H':
      setUiHidden(!document.body.classList.contains('ui-hidden'));
      $('#help').hidden = true;
      break;
    case 'f':
    case 'F':
      app.actions.fullscreen();
      break;
    case ' ':
      e.preventDefault();
      app.actions.togglePause();
      break;
    case 'ArrowRight':
      step(1);
      break;
    case 'ArrowLeft':
      step(-1);
      break;
    case 'r':
    case 'R':
      app.actions.shuffleColors();
      break;
    case '?':
      app.actions.toggleHelp();
      break;
  }
});

window.addEventListener('resize', () => engine.resize());

// a new #cfg pasted in the address bar (or pushed by a browser source) is applied live
window.addEventListener('hashchange', () => {
  const match = window.location.hash.match(/cfg=([\w-]+)/);
  const next = match && store.decodeState(match[1]);
  if (isOutput) return;
  if (next && JSON.stringify(store.normalize(next)) !== JSON.stringify(state)) replaceState(next);
});

// --- Render loop ---------------------------------------------------------

let time = 0;
let last = performance.now();
let fpsFrames = 0;
let fpsSince = last;

function frame(now) {
  requestAnimationFrame(frame);
  const interval = state.fps > 0 ? 1000 / state.fps : 0;
  const elapsed = now - last;
  // 1ms tolerance so a 60 fps cap on a 60 Hz screen never drops frames
  if (elapsed < interval - 1) return;
  last = interval ? now - (elapsed % interval) : now;

  const realDt = Math.min(elapsed / 1000, 0.1);
  const dt = paused ? 0 : realDt * state.speed;
  time += dt;
  // the control window can skip its own preview to leave the GPU to the output
  if (preview || isOutput) engine.render(time, dt, realDt);

  fpsFrames++;
  if (now - fpsSince >= 1000) {
    app.stats.fps = Math.round((fpsFrames * 1000) / (now - fpsSince));
    fpsFrames = 0;
    fpsSince = now;
  }
}
requestAnimationFrame(frame);
