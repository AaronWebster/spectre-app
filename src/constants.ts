// constants.ts - Constants and color maps

import { Point, ColorMap } from './types';

export const DEFAULT_SCALE = 20;
export const PARALLEL_LINE_TOLERANCE = 1e-8;

// Base Spectre tile coordinates (unit size)
export const SPECTRE_COORDS: Point[] = [
  { x: 0, y: 0 },
  { x: 1.0, y: 0.0 },
  { x: 1.5, y: -0.8660254037844386 },
  { x: 2.366025403784439, y: -0.36602540378443865 },
  { x: 2.366025403784439, y: 0.6339745962155614 },
  { x: 3.366025403784439, y: 0.6339745962155614 },
  { x: 3.866025403784439, y: 1.5 },
  { x: 3.0, y: 2.0 },
  { x: 2.133974596215561, y: 1.5 },
  { x: 1.6339745962155614, y: 2.3660254037844393 },
  { x: 0.6339745962155614, y: 2.3660254037844393 },
  { x: -0.3660254037844386, y: 2.3660254037844393 },
  { x: -0.866025403784439, y: 1.5 },
  { x: 0.0, y: 1.0 }
];

export const tile_names = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

export const colmap53: ColorMap = {
  Gamma: [203, 157, 126],
  Gamma1: [203, 157, 126],
  Gamma2: [203, 157, 126],
  Delta: [163, 150, 133],
  Theta: [208, 215, 150],
  Lambda: [184, 205, 178],
  Xi: [211, 177, 144],
  Pi: [218, 197, 161],
  Sigma: [191, 146, 126],
  Phi: [228, 213, 167],
  Psi: [224, 223, 156]
};

export const colmap_orig: ColorMap = {
  Gamma: [255, 255, 255],
  Gamma1: [255, 255, 255],
  Gamma2: [255, 255, 255],
  Delta: [220, 220, 220],
  Theta: [255, 191, 191],
  Lambda: [255, 160, 122],
  Xi: [255, 242, 0],
  Pi: [135, 206, 250],
  Sigma: [245, 245, 220],
  Phi: [0, 255, 0],
  Psi: [0, 255, 255]
};

export const colmap_mystics: ColorMap = {
  Gamma: [196, 201, 169],
  Gamma1: [196, 201, 169],
  Gamma2: [156, 160, 116],
  Delta: [247, 252, 248],
  Theta: [247, 252, 248],
  Lambda: [247, 252, 248],
  Xi: [247, 252, 248],
  Pi: [247, 252, 248],
  Sigma: [247, 252, 248],
  Phi: [247, 252, 248],
  Psi: [247, 252, 248]
};
