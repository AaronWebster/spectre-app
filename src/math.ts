// math.ts - Matrix and vector operations for affine transformations

import { mat2d } from 'gl-matrix';
import { Point, TransformMatrix } from './types';

// Math constants
export const PI = Math.PI;
export const cos = Math.cos;
export const sin = Math.sin;

/**
 * Convert degrees to radians
 */
export function radians(d: number): number {
  return d * PI / 180;
}

/**
 * Calculate distance between two points
 */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Calculate magnitude of a vector
 */
export function mag(x: number, y: number): number {
  return Math.hypot(x, y);
}

/**
 * Create a point object
 */
export function pt(x: number, y: number): Point {
  return { x, y };
}

/**
 * Invert an affine transformation matrix
 * Uses gl-matrix for optimized matrix operations
 * 
 * Note: TransformMatrix [a, b, c, d, e, f] is compatible with gl-matrix mat2d format.
 * Both represent 2D affine transformations as 6-element arrays.
 */
export function inv(T: TransformMatrix): TransformMatrix {
  const result = mat2d.create();
  mat2d.invert(result, T as mat2d);
  return result as TransformMatrix;
}

/**
 * Multiply two affine transformation matrices
 * Uses gl-matrix for optimized matrix operations
 * 
 * Note: TransformMatrix [a, b, c, d, e, f] is compatible with gl-matrix mat2d format.
 * Both represent 2D affine transformations as 6-element arrays.
 */
export function mul(A: TransformMatrix, B: TransformMatrix): TransformMatrix {
  const result = mat2d.create();
  mat2d.multiply(result, A as mat2d, B as mat2d);
  return result as TransformMatrix;
}

/**
 * Add two points
 */
export function padd(p: Point, q: Point): Point {
  return { x: p.x + q.x, y: p.y + q.y };
}

/**
 * Subtract two points
 */
export function psub(p: Point, q: Point): Point {
  return { x: p.x - q.x, y: p.y - q.y };
}

/**
 * Compute frame coordinates: o + a*p + b*q
 */
export function pframe(o: Point, p: Point, q: Point, a: number, b: number): Point {
  return {
    x: o.x + a * p.x + b * q.x,
    y: o.y + a * p.y + b * q.y
  };
}

/**
 * Create a rotation transformation matrix
 */
export function trot(ang: number): TransformMatrix {
  const c = cos(ang);
  const s = sin(ang);
  return [c, -s, 0, s, c, 0];
}

/**
 * Create a translation transformation matrix
 */
export function ttrans(tx: number, ty: number): TransformMatrix {
  return [1, 0, tx, 0, 1, ty];
}

/**
 * Create a translation from point p to point q
 */
export function transTo(p: Point, q: Point): TransformMatrix {
  return ttrans(q.x - p.x, q.y - p.y);
}

/**
 * Create a rotation transformation about a point
 */
export function rotAbout(p: Point, ang: number): TransformMatrix {
  return mul(ttrans(p.x, p.y), mul(trot(ang), ttrans(-p.x, -p.y)));
}

/**
 * Transform a point by a transformation matrix
 */
export function transPt(M: TransformMatrix, P: Point): Point {
  return pt(M[0] * P.x + M[1] * P.y + M[2], M[3] * P.x + M[4] * P.y + M[5]);
}

/**
 * Create a transformation that maps one segment to another
 */
export function matchSeg(p: Point, q: Point): TransformMatrix {
  return [q.x - p.x, p.y - q.y, p.x, q.y - p.y, q.x - p.x, p.y];
}

/**
 * Create a transformation that maps segment (p1, q1) to segment (p2, q2)
 */
export function matchTwo(p1: Point, q1: Point, p2: Point, q2: Point): TransformMatrix {
  return mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
}

/**
 * Identity transformation matrix
 */
export const ident: TransformMatrix = [1, 0, 0, 0, 1, 0];
