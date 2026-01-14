// types.ts - Type definitions for the Spectre tile application

/**
 * Represents a 2D point with x and y coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Represents an affine transformation matrix [a, b, c, d, e, f]
 * Transformation: x' = ax + by + c, y' = dx + ey + f
 */
export type TransformMatrix = [number, number, number, number, number, number];

/**
 * Color represented as RGB values [r, g, b]
 */
export type Color = [number, number, number];

/**
 * Map of tile labels to their colors
 */
export type ColorMap = Record<string, Color>;

/**
 * Tile label types
 */
export type TileLabel = 'Gamma' | 'Gamma1' | 'Gamma2' | 'Delta' | 'Theta' | 'Lambda' | 'Xi' | 'Pi' | 'Sigma' | 'Phi' | 'Psi';

/**
 * Quadrilateral represented by 4 points
 */
export type Quad = [Point, Point, Point, Point];
