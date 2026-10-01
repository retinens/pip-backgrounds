import { MeshGradient } from './MeshGradient.js';
import { Aurora } from './Aurora.js';
import { Silk } from './Silk.js';
import { WaveLines } from './WaveLines.js';
import { Particles } from './Particles.js';
import { Bokeh } from './Bokeh.js';
import { Geometric } from './Geometric.js';
import { Orbs } from './Orbs.js';
import { MeshGrid } from './MeshGrid.js';
import { Ribbons } from './Ribbons.js';
import { Lava } from './Lava.js';
import { Halo } from './Halo.js';
import { Swirl } from './Swirl.js';

// Order = order in the panel and for ←/→ navigation.
export const SCENES = [
  // soft gradients
  MeshGradient,
  MeshGrid,
  Ribbons,
  Lava,
  Halo,
  Swirl,
  Orbs,
  // textures & motion
  Aurora,
  Silk,
  WaveLines,
  Particles,
  Bokeh,
  Geometric,
];

export const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];
