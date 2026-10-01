import GUI from 'lil-gui';
import { SCENES } from '../scenes/index.js';
import { PALETTES, CUSTOM } from '../presets/palettes.js';
import { RESOLUTIONS } from '../engine/Engine.js';
import { LOGO_POSITIONS } from './Logo.js';

const FPS = { 24: 24, 25: 25, 30: 30, 50: 50, 60: 60, 'Max (écran)': 0 };

/**
 * Builds the lil-gui panel. `app` exposes:
 *   state, onSceneChange(), onCommonChange(), onPostChange(), onRenderChange(),
 *   onSceneParam(key, value, finished), onLogoChange(), actions{...}, presetNames()
 */
export class Panel {
  constructor(app) {
    this.app = app;
    const s = app.state;
    const gui = (this.gui = new GUI({ title: 'PiP Backgrounds  ·  H pour masquer' }));

    // --- Fond
    const fBg = gui.addFolder('Fond');
    const sceneOptions = Object.fromEntries(SCENES.map((S) => [S.label, S.id]));
    fBg.add(s, 'scene', sceneOptions).name('Type').onChange(() => app.onSceneChange());
    fBg.add(s, 'transition', 0, 5, 0.1).name('Transition (s)').onChange(() => app.persist());
    this.sceneFolder = null;

    // --- Couleurs
    const fCol = gui.addFolder('Couleurs');
    const paletteOptions = { Personnalisée: CUSTOM, ...Object.fromEntries(Object.entries(PALETTES).map(([k, p]) => [p.label, k])) };
    this.paletteCtrl = fCol.add(s, 'palette', paletteOptions).name('Palette').onChange((key) => {
      const p = PALETTES[key];
      if (!p) return;
      s.colors.splice(0, 4, ...p.colors);
      s.bg = p.bg;
      this.refresh();
      app.onCommonChange();
    });
    const markCustom = () => {
      s.palette = CUSTOM;
      this.paletteCtrl.updateDisplay();
      app.onCommonChange();
    };
    [0, 1, 2, 3].forEach((i) => fCol.addColor(s.colors, i).name(`Couleur ${i + 1}`).onChange(markCustom));
    fCol.addColor(s, 'bg').name('Arrière-plan').onChange(markCustom);
    fCol.add(app.actions, 'shuffleColors').name('Mélanger l’ordre (R)');

    // --- Animation
    const fAnim = gui.addFolder('Animation');
    fAnim.add(s, 'speed', 0, 3, 0.01).name('Vitesse').onChange(() => app.persist());
    fAnim.add(s, 'intensity', 0, 1.5, 0.01).name('Intensité').onChange(() => app.onCommonChange());
    fAnim.add(s, 'scale', 0.3, 3, 0.01).name('Échelle').onChange(() => app.onCommonChange());
    fAnim.add(app.actions, 'togglePause').name('Pause / lecture (Espace)');

    // --- Finition
    const fPost = gui.addFolder('Finition');
    fPost.add(s, 'grain', 0, 1, 0.01).name('Grain').onChange(() => app.onPostChange());
    fPost.add(s, 'vignette', 0, 1, 0.01).name('Vignettage').onChange(() => app.onPostChange());
    fPost.add(s, 'brightness', 0.3, 1.8, 0.01).name('Luminosité').onChange(() => app.onPostChange());
    fPost.add(s, 'saturation', 0, 2, 0.01).name('Saturation').onChange(() => app.onPostChange());

    // --- Logo
    const fLogo = gui.addFolder('Logo client');
    fLogo.add(app.actions, 'uploadLogo').name('Importer un logo (PNG/SVG)…');
    fLogo.add(s.logo, 'url').name('…ou URL du logo').onFinishChange(() => app.onLogoChange());
    fLogo.add(app.actions, 'removeLogo').name('Retirer le logo importé');
    fLogo.add(s.logo, 'visible').name('Afficher').onChange(() => app.onLogoChange());
    fLogo.add(s.logo, 'position', LOGO_POSITIONS).name('Position').onChange(() => app.onLogoChange());
    fLogo.add(s.logo, 'size', 2, 60, 0.5).name('Largeur (% écran)').onChange(() => app.onLogoChange());
    fLogo.add(s.logo, 'margin', 0, 20, 0.5).name('Marge').onChange(() => app.onLogoChange());
    fLogo.add(s.logo, 'opacity', 0, 1, 0.01).name('Opacité').onChange(() => app.onLogoChange());
    fLogo.close();

    // --- Presets
    const fPre = gui.addFolder('Presets');
    this.presetUi = { name: '', selected: '' };
    fPre.add(this.presetUi, 'name').name('Nom du preset');
    fPre.add({ save: () => app.actions.savePreset(this.presetUi.name) }, 'save').name('💾 Enregistrer');
    this.presetFolder = fPre;
    this.presetSelect = null;
    this.presetButtons = [
      fPre.add({ load: () => app.actions.loadPreset(this.presetUi.selected) }, 'load').name('Charger'),
      fPre.add({ del: () => app.actions.deletePreset(this.presetUi.selected) }, 'del').name('Supprimer'),
    ];
    this.refreshPresets();
    fPre.add(app.actions, 'exportJson').name('Exporter JSON…');
    fPre.add(app.actions, 'importJson').name('Importer JSON…');
    fPre.add(app.actions, 'copyLiveUrl').name('Copier l’URL live (OBS / vMix)');
    fPre.add(app.actions, 'reset').name('Réinitialiser');

    // --- Sortie (2e écran)
    const fOut = gui.addFolder('Sortie (2e écran)');
    fOut.add(app.actions, 'openOutput').name('🖥 Ouvrir la fenêtre de sortie');
    fOut.add(app.output, 'status').name('Sorties').disable().listen();
    fOut.add(app.output, 'preview').name('Aperçu dans cette fenêtre').onChange(() => app.actions.togglePreview());

    // --- Rendu
    const fRender = gui.addFolder('Rendu');
    fRender.add(s, 'resolution', RESOLUTIONS).name('Résolution').onChange(() => app.onRenderChange());
    fRender.add(s, 'fps', FPS).name('Images / s').onChange(() => app.onRenderChange());
    fRender.add(app.actions, 'fullscreen').name('Plein écran (F)');
    fRender.add(app.actions, 'toggleHelp').name('Raccourcis (?)');
    this.statsCtrl = fRender.add(app.stats, 'fps').name('FPS mesurés').disable().listen();
    fRender.close();

    this.buildSceneFolder();
  }

  /** (Re)build the folder holding the params of the active background. */
  buildSceneFolder() {
    const { state, sceneClass } = this.app;
    this.sceneFolder?.destroy();
    const folder = (this.sceneFolder = this.gui.addFolder(`Réglages — ${sceneClass.label}`));
    // keep it right under "Fond"
    const fBg = this.gui.folders[0];
    fBg.domElement.after(folder.domElement);

    const values = (state.sceneParams[sceneClass.id] ||= {});
    for (const [key, def] of Object.entries(sceneClass.params)) {
      if (!(key in values)) values[key] = def.value;
      let ctrl;
      if (def.options) ctrl = folder.add(values, key, def.options);
      else if (typeof def.value === 'boolean') ctrl = folder.add(values, key);
      else ctrl = folder.add(values, key, def.min, def.max, def.step);
      ctrl.name(def.label);
      // geometry rebuilds only once the slider is released
      ctrl.onChange((v) => this.app.onSceneParam(key, v, false));
      ctrl.onFinishChange((v) => this.app.onSceneParam(key, v, true));
    }
    folder.add({ reset: () => this.app.actions.resetSceneParams() }, 'reset').name('Valeurs par défaut');
  }

  refreshPresets() {
    const names = this.app.presetNames();
    if (!names.includes(this.presetUi.selected)) this.presetUi.selected = names[0] || '';
    const options = names.length ? names : ['(aucun)'];
    if (this.presetSelect) this.presetSelect = this.presetSelect.options(options);
    else this.presetSelect = this.presetFolder.add(this.presetUi, 'selected', options);
    this.presetSelect.name('Presets enregistrés');
    // keep the select above its Load / Delete buttons
    this.presetButtons[0].domElement.before(this.presetSelect.domElement);
    this.presetButtons.forEach((b) => b.enable(names.length > 0));
  }

  refresh() {
    this.gui.controllersRecursive().forEach((c) => c.updateDisplay());
  }
}
