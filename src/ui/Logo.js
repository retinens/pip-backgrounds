export const LOGO_POSITIONS = {
  'Haut gauche': 'top-left',
  'Haut centre': 'top-center',
  'Haut droite': 'top-right',
  'Milieu gauche': 'middle-left',
  Centre: 'center',
  'Milieu droite': 'middle-right',
  'Bas gauche': 'bottom-left',
  'Bas centre': 'bottom-center',
  'Bas droite': 'bottom-right',
};

/** Client logo drawn as a DOM overlay above the canvas (stays crisp at any resolution). */
export class LogoOverlay {
  constructor(img) {
    this.img = img;
    this.data = '';
  }

  /** Uploaded data URL; takes precedence over settings.url. */
  setData(data) {
    this.data = data || '';
  }

  apply(settings) {
    const src = this.data || settings.url;
    const img = this.img;
    if (!src || !settings.visible) {
      img.hidden = true;
      return;
    }
    if (img.getAttribute('src') !== src) img.src = src;
    img.hidden = false;

    const [v, h] = settings.position === 'center' ? ['middle', 'center'] : settings.position.split('-');
    const m = `${settings.margin}vmin`;
    Object.assign(img.style, {
      width: `${settings.size}vw`,
      opacity: settings.opacity,
      top: v === 'top' ? m : v === 'middle' ? '50%' : '',
      bottom: v === 'bottom' ? m : '',
      left: h === 'left' ? m : h === 'center' ? '50%' : '',
      right: h === 'right' ? m : '',
      transform: `translate(${h === 'center' ? '-50%' : '0'}, ${v === 'middle' ? '-50%' : '0'})`,
    });
  }
}
