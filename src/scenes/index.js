import { MeshGradient } from './MeshGradient.js';
import { Aurora } from './Aurora.js';
import { Silk } from './Silk.js';
import { WaveLines } from './WaveLines.js';
import { Particles } from './Particles.js';
import { Bokeh } from './Bokeh.js';
import { Geometric } from './Geometric.js';
import { Orbs } from './Orbs.js';

// Order = order in the panel and for ←/→ navigation.
export const SCENES = [MeshGradient, Aurora, Silk, WaveLines, Particles, Bokeh, Geometric, Orbs];

export const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];
