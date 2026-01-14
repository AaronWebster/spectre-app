// generatorPixi.ts - Tiling and substitution logic using Pixi.js shapes

import { Point, Quad, TileLabel, TransformMatrix } from './types';
import { pt, mul, trot, ttrans, radians, transPt, transTo, PI, ident } from './math';
import { PixiShape, PixiCurvyShape, PixiMeta } from './pixiShapes';
import { SPECTRE_COORDS } from './constants';

/**
 * Build the base Spectre tile system using Pixi.js shapes
 */
export function buildSpectreBase(curved: boolean): Record<string, PixiShape | PixiCurvyShape | PixiMeta> {
  // Use the constant for spectre coordinates
  const spectre = SPECTRE_COORDS.map((p) => pt(p.x, p.y));

  const spectre_keys: Quad = [spectre[3], spectre[5], spectre[7], spectre[11]];

  const ret: Record<string, PixiShape | PixiCurvyShape | PixiMeta> = {};

  const labels: TileLabel[] = ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];
  
  for (const lab of labels) {
    if (curved) {
      ret[lab] = new PixiCurvyShape(spectre, spectre_keys, lab);
    } else {
      ret[lab] = new PixiShape(spectre, spectre_keys, lab);
    }
  }

  const mystic = new PixiMeta();
  if (curved) {
    mystic.addChild(new PixiCurvyShape(spectre, spectre_keys, 'Gamma1'), ident);
    mystic.addChild(
      new PixiCurvyShape(spectre, spectre_keys, 'Gamma2'),
      mul(ttrans(spectre[8].x, spectre[8].y), trot(PI / 6))
    );
  } else {
    mystic.addChild(new PixiShape(spectre, spectre_keys, 'Gamma1'), ident);
    mystic.addChild(
      new PixiShape(spectre, spectre_keys, 'Gamma2'),
      mul(ttrans(spectre[8].x, spectre[8].y), trot(PI / 6))
    );
  }
  mystic.quad = spectre_keys;
  ret['Gamma'] = mystic;

  return ret;
}

/**
 * Build the Hat/Turtle tile system using Pixi.js shapes
 */
export function buildHatTurtleBase(hat_dominant: boolean): Record<string, PixiShape | PixiMeta> {
  const hr3 = 0.8660254037844386;

  function hexPt(x: number, y: number): Point {
    return pt(x + 0.5 * y, -hr3 * y);
  }

  const hat: Point[] = [
    hexPt(-1, 2),
    hexPt(0, 2),
    hexPt(0, 3),
    hexPt(2, 2),
    hexPt(3, 0),
    hexPt(4, 0),
    hexPt(5, -1),
    hexPt(4, -2),
    hexPt(2, -1),
    hexPt(2, -2),
    hexPt(1, -2),
    hexPt(0, -2),
    hexPt(-1, -1),
    hexPt(0, 0)
  ];

  const turtle: Point[] = [
    hexPt(0, 0),
    hexPt(2, -1),
    hexPt(3, 0),
    hexPt(4, -1),
    hexPt(4, -2),
    hexPt(6, -3),
    hexPt(7, -5),
    hexPt(6, -5),
    hexPt(5, -4),
    hexPt(4, -5),
    hexPt(2, -4),
    hexPt(0, -3),
    hexPt(-1, -1),
    hexPt(0, -1)
  ];

  const hat_keys: Quad = [hat[3], hat[5], hat[7], hat[11]];
  const turtle_keys: Quad = [turtle[3], turtle[5], turtle[7], turtle[11]];

  const ret: Record<string, PixiShape | PixiMeta> = {};

  const labels: TileLabel[] = ['Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'];

  if (hat_dominant) {
    for (const lab of labels) {
      ret[lab] = new PixiShape(hat, hat_keys, lab);
    }

    const mystic = new PixiMeta();
    mystic.addChild(new PixiShape(hat, hat_keys, 'Gamma1'), ident);
    mystic.addChild(new PixiShape(turtle, turtle_keys, 'Gamma2'), ttrans(hat[8].x, hat[8].y));
    mystic.quad = hat_keys;
    ret['Gamma'] = mystic;
  } else {
    for (const lab of labels) {
      ret[lab] = new PixiShape(turtle, turtle_keys, lab);
    }

    const mystic = new PixiMeta();
    mystic.addChild(new PixiShape(turtle, turtle_keys, 'Gamma1'), ident);
    mystic.addChild(
      new PixiShape(hat, hat_keys, 'Gamma2'),
      mul(ttrans(turtle[9].x, turtle[9].y), trot(PI / 3))
    );
    mystic.quad = turtle_keys;
    ret['Gamma'] = mystic;
  }

  return ret;
}

/**
 * Build the hexagon tile system using Pixi.js shapes
 */
export function buildHexBase(): Record<string, PixiShape> {
  const hr3 = 0.8660254037844386;

  const hex: Point[] = [
    pt(0, 0),
    pt(1.0, 0.0),
    pt(1.5, hr3),
    pt(1, 2 * hr3),
    pt(0, 2 * hr3),
    pt(-0.5, hr3)
  ];

  const hex_keys: Quad = [hex[1], hex[2], hex[3], hex[5]];

  const ret: Record<string, PixiShape> = {};

  const labels = ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Phi', 'Psi'] as TileLabel[];

  for (const lab of labels) {
    ret[lab] = new PixiShape(hex, hex_keys, lab);
  }

  return ret;
}

/**
 * Build supertiles using substitution rules
 * 
 * Performance Note: This function is computationally expensive and called recursively
 * for high tile counts. Matrix operations now use gl-matrix for optimization.
 * Future optimization: Could be moved to a Web Worker, but would require refactoring
 * to serialize/deserialize shape objects. See PERFORMANCE_OPTIMIZATIONS.md for details.
 */
export function buildSupertiles(
  sys: Record<string, PixiShape | PixiCurvyShape | PixiMeta>
): Record<string, PixiMeta> {
  const quad = (sys['Delta'] as PixiShape | PixiCurvyShape).quad;
  const R: TransformMatrix = [-1, 0, 0, 0, 1, 0];

  const t_rules: [number, number, number][] = [
    [60, 3, 1],
    [0, 2, 0],
    [60, 3, 1],
    [60, 3, 1],
    [0, 2, 0],
    [60, 3, 1],
    [-120, 3, 3]
  ];

  const Ts: TransformMatrix[] = [ident];
  let total_ang = 0;
  let rot: TransformMatrix = ident;
  const tquad: Point[] = [...quad];

  for (const [ang, from, to] of t_rules) {
    total_ang += ang;
    if (ang != 0) {
      rot = trot(radians(total_ang));
      for (let i = 0; i < 4; ++i) {
        tquad[i] = transPt(rot, quad[i]);
      }
    }

    const ttt = transTo(tquad[to], transPt(Ts[Ts.length - 1], quad[from]));
    Ts.push(mul(ttt, rot));
  }

  for (let idx = 0; idx < Ts.length; ++idx) {
    Ts[idx] = mul(R, Ts[idx]);
  }

  const super_rules: Record<string, string[]> = {
    Gamma: ['Pi', 'Delta', 'null', 'Theta', 'Sigma', 'Xi', 'Phi', 'Gamma'],
    Delta: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Theta: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Lambda: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Xi: ['Psi', 'Delta', 'Pi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
    Pi: ['Psi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma'],
    Sigma: ['Xi', 'Delta', 'Xi', 'Phi', 'Sigma', 'Pi', 'Lambda', 'Gamma'],
    Phi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Pi', 'Phi', 'Gamma'],
    Psi: ['Psi', 'Delta', 'Psi', 'Phi', 'Sigma', 'Psi', 'Phi', 'Gamma']
  };

  const super_quad: Quad = [
    transPt(Ts[6], quad[2]),
    transPt(Ts[5], quad[1]),
    transPt(Ts[3], quad[2]),
    transPt(Ts[0], quad[1])
  ];

  const ret: Record<string, PixiMeta> = {};

  for (const [lab, subs] of Object.entries(super_rules)) {
    const sup = new PixiMeta();
    for (let idx = 0; idx < 8; ++idx) {
      if (subs[idx] == 'null') {
        continue;
      }
      sup.addChild(sys[subs[idx]], Ts[idx]);
    }
    sup.quad = super_quad;

    ret[lab] = sup;
  }

  return ret;
}
