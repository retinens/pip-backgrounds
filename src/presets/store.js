import { PALETTES } from './palettes.js';

const KEY_LAST = 'pipbg.last';
const KEY_PRESETS = 'pipbg.presets';
const KEY_LOGO = 'pipbg.logo';

export const DEFAULT_STATE = {
  scene: 'mesh',
  palette: 'corporate',
  colors: [...PALETTES.corporate.colors],
  bg: PALETTES.corporate.bg,
  speed: 1,
  intensity: 1,
  scale: 1,
  grain: 0.3,
  vignette: 0.35,
  brightness: 1,
  saturation: 1,
  resolution: 'auto',
  fps: 60,
  transition: 1.5,
  sceneParams: {},
  logo: {
    visible: true,
    url: '',
    position: 'bottom-right',
    size: 12,
    margin: 3,
    opacity: 1,
  },
};

const clone = (o) => JSON.parse(JSON.stringify(o));

/** Deep-merge a (possibly partial / older) saved state onto the defaults. */
export function normalize(input) {
  const out = clone(DEFAULT_STATE);
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(out)) {
    if (!(key in input)) continue;
    if (key === 'logo') Object.assign(out.logo, input.logo);
    else if (key === 'colors' && Array.isArray(input.colors) && input.colors.length === 4) out.colors = [...input.colors];
    else if (key === 'sceneParams') out.sceneParams = clone(input.sceneParams || {});
    else if (typeof input[key] === typeof out[key]) out[key] = input[key];
  }
  return out;
}

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

const parseJson = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

// --- URL hash (base64url JSON) -------------------------------------------

export function encodeState(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeState(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function stateUrl(state, { hideUi = false } = {}) {
  const url = new URL(window.location.href);
  url.search = hideUi ? '?ui=0' : '';
  url.hash = 'cfg=' + encodeState(state);
  return url.toString();
}

/** Initial state: URL hash > last session > defaults. */
export function loadInitialState() {
  const match = window.location.hash.match(/cfg=([\w-]+)/);
  const fromHash = match && decodeState(match[1]);
  if (fromHash) return normalize(fromHash);
  return normalize(parseJson(storage.get(KEY_LAST)));
}

let saveTimer = 0;
/** Persist the session and mirror it in the URL (debounced). */
export function persist(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    storage.set(KEY_LAST, JSON.stringify(state));
    const url = new URL(window.location.href);
    url.hash = 'cfg=' + encodeState(state);
    history.replaceState(null, '', url);
  }, 250);
}

// --- Logo (data URL kept out of the URL) ---------------------------------

export const loadLogoData = () => storage.get(KEY_LOGO) || '';
export const saveLogoData = (data) => (data ? storage.set(KEY_LOGO, data) : (storage.remove(KEY_LOGO), true));

// --- Named presets -------------------------------------------------------

export function listPresets() {
  return parseJson(storage.get(KEY_PRESETS)) || {};
}

/** Returns false when localStorage is full (usually because of a big logo). */
export function savePreset(name, state, logoData) {
  const all = listPresets();
  all[name] = { state: clone(state), logoData: logoData || '' };
  if (storage.set(KEY_PRESETS, JSON.stringify(all))) return true;
  all[name].logoData = '';
  storage.set(KEY_PRESETS, JSON.stringify(all));
  return false;
}

export function deletePreset(name) {
  const all = listPresets();
  delete all[name];
  storage.set(KEY_PRESETS, JSON.stringify(all));
}

// --- JSON files ----------------------------------------------------------

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Opens a file picker and resolves with the file content (text or data URL). */
export function pickFile(accept, as = 'text') {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('no file'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      if (as === 'dataUrl') reader.readAsDataURL(file);
      else reader.readAsText(file);
    };
    input.click();
  });
}
