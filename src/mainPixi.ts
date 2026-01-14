// mainPixi.ts - Entry point using Pixi.js renderer

import * as PIXI from 'pixi.js';
import { Pane } from 'tweakpane';
import { TransformMatrix, ColorMap } from './types';
import { buildSpectreBase, buildHatTurtleBase, buildHexBase, buildSupertiles } from './generatorPixi';
import { PixiShape, PixiCurvyShape, PixiMeta } from './pixiShapes';
import { DEFAULT_SCALE, colmap53, colmap_orig, colmap_mystics } from './constants';
import { ident } from './math';

// Application State
let app: PIXI.Application;
let mainContainer: PIXI.Container;
let width: number;
let height: number;
let needsRedraw = true;

let to_screen: TransformMatrix = [DEFAULT_SCALE, 0, 0, 0, -DEFAULT_SCALE, 0];
let lw_scale = 1;
let sys: Record<string, PixiShape | PixiCurvyShape | PixiMeta>;
let dragging = false;
let uibox = true;
let initialPinchDist = -1;
let lastMouseX = 0,
  lastMouseY = 0;

// Tile state
let tileScale = 1;
let boundingBoxWidth = 100;
let boundingBoxHeight = 100;

// Tile counters
let tileCount = 0;
let visibleTileCount = 0;

// Fabrication Mode State (not yet fully implemented)
let fabricationMode = false;
let stockWidth = 24;
let stockHeight = 24;
let stockMargin = 0.25;
let chainCutting = false;

// Tweakpane instance
let pane: Pane;

// UI State (used by Tweakpane)
const uiState = {
  mode: 'Spectre Explorer',
  tile: '(1,1)',
  shape: 'Spectres',
  colorScheme: 'Paper Fig 5.3',
  tileScale: 1,
  boundingBoxWidth: 100,
  boundingBoxHeight: 100,
  tileCount: '0 visible / 0 total',
  grout: 0.125,
  kerf: 0.05,
  stockWidth: 24,
  stockHeight: 24,
  stockMargin: 0.25,
  chainCutting: false,
  yield: '0%'
};

let colmap: ColorMap = colmap53;

/**
 * Create the UI controls using Tweakpane
 */
function createUI(): void {
  pane = new Pane({
    title: 'Spectre Controls',
    expanded: true,
  });

  // Mode Selection
  pane.addBinding(uiState, 'mode', {
    label: 'Mode',
    options: {
      'Spectre Explorer': 'Spectre Explorer',
      'Fabrication': 'Fabrication',
    },
  }).on('change', (ev) => {
    fabricationMode = ev.value === 'Fabrication';
    updateUIVisibility();
    needsRedraw = true;
  });

  // Explorer folder
  const explorerFolder = pane.addFolder({
    title: 'Explorer',
    expanded: true,
  });

  // Tile Selection
  const tileOptions: Record<string, string> = { '(1,1)': '(1,1)' };
  for (let i = 2; i < 8; i++) {
    tileOptions[`(${i},${i})`] = `(${i},${i})`;
  }
  explorerFolder.addBinding(uiState, 'tile', {
    label: 'Tile',
    options: tileOptions,
  }).on('change', () => {
    needsRedraw = true;
  });

  // Shape Selection
  explorerFolder.addBinding(uiState, 'shape', {
    label: 'Shape',
    options: {
      'Spectres': 'Spectres',
      'Tile(1,1)': 'Tile(1,1)',
      'Hat': 'Hat',
      'Turtle': 'Turtle',
      'Hexagons': 'Hexagons',
    },
  }).on('change', (ev) => {
    if (ev.value === 'Spectres') {
      sys = buildSpectreBase(true);
    } else if (ev.value === 'Tile(1,1)') {
      sys = buildSpectreBase(false);
    } else if (ev.value === 'Hat') {
      sys = buildHatTurtleBase(true);
    } else if (ev.value === 'Turtle') {
      sys = buildHatTurtleBase(false);
    } else if (ev.value === 'Hexagons') {
      sys = buildHexBase();
    }
    needsRedraw = true;
  });

  // Color Scheme
  explorerFolder.addBinding(uiState, 'colorScheme', {
    label: 'Colors',
    options: {
      'Figure 5.3': 'Paper Fig 5.3',
      'Original': 'Original',
      'Mystic': 'Mystic',
    },
  }).on('change', (ev) => {
    if (ev.value === 'Paper Fig 5.3') {
      colmap = colmap53;
    } else if (ev.value === 'Original') {
      colmap = colmap_orig;
    } else if (ev.value === 'Mystic') {
      colmap = colmap_mystics;
    }
    needsRedraw = true;
  });

  // Tile Count (monitor only)
  explorerFolder.addBinding(uiState, 'tileCount', {
    label: 'Tiles',
    readonly: true,
  });

  // Tile Scale
  explorerFolder.addBinding(uiState, 'tileScale', {
    label: 'Tile Scale',
    min: 0.1,
    max: 10,
    step: 0.1,
  }).on('change', (ev) => {
    tileScale = ev.value;
    needsRedraw = true;
  });

  // Bounding Box
  const boundingBoxFolder = explorerFolder.addFolder({
    title: 'Bounding Box',
    expanded: false,
  });

  boundingBoxFolder.addBinding(uiState, 'boundingBoxWidth', {
    label: 'Width',
    min: 10,
    max: 1000,
    step: 10,
  }).on('change', (ev) => {
    boundingBoxWidth = ev.value;
    needsRedraw = true;
  });

  boundingBoxFolder.addBinding(uiState, 'boundingBoxHeight', {
    label: 'Height',
    min: 10,
    max: 1000,
    step: 10,
  }).on('change', (ev) => {
    boundingBoxHeight = ev.value;
    needsRedraw = true;
  });

  // Export SVG Button
  explorerFolder.addButton({
    title: 'Export SVG',
  }).on('click', () => {
    exportSVG();
  });

  // Toggle UI Button
  explorerFolder.addButton({
    title: 'Toggle UI',
  }).on('click', () => {
    uibox = !uibox;
    updateUIVisibility();
  });

  // Fabrication folder
  const fabricationFolder = pane.addFolder({
    title: 'Fabrication',
    expanded: true,
  });

  // Cut Settings
  const cutSettingsFolder = fabricationFolder.addFolder({
    title: 'Cut Settings',
    expanded: true,
  });

  cutSettingsFolder.addBinding(uiState, 'grout', {
    label: 'Grout (in)',
    min: 0,
    max: 1,
    step: 0.001,
  }).on('change', () => {
    needsRedraw = true;
  });

  cutSettingsFolder.addBinding(uiState, 'kerf', {
    label: 'Kerf (in)',
    min: 0,
    max: 1,
    step: 0.001,
  }).on('change', () => {
    needsRedraw = true;
  });

  // Stock Settings
  const stockFolder = fabricationFolder.addFolder({
    title: 'Stock',
    expanded: true,
  });

  stockFolder.addBinding(uiState, 'stockWidth', {
    label: 'Width (in)',
    min: 1,
    max: 100,
    step: 0.1,
  }).on('change', (ev) => {
    stockWidth = ev.value;
  });

  stockFolder.addBinding(uiState, 'stockHeight', {
    label: 'Height (in)',
    min: 1,
    max: 100,
    step: 0.1,
  }).on('change', (ev) => {
    stockHeight = ev.value;
  });

  stockFolder.addBinding(uiState, 'stockMargin', {
    label: 'Margin (in)',
    min: 0,
    max: 10,
    step: 0.25,
  }).on('change', (ev) => {
    stockMargin = ev.value;
  });

  fabricationFolder.addBinding(uiState, 'chainCutting', {
    label: 'Chain Cutting',
  }).on('change', (ev) => {
    chainCutting = ev.value;
  });

  // Preview Nest Button
  fabricationFolder.addButton({
    title: 'Preview Nest',
  }).on('click', () => {
    console.log('Preview nest functionality not yet implemented');
  });

  // Yield (monitor only)
  fabricationFolder.addBinding(uiState, 'yield', {
    label: 'Yield',
    readonly: true,
  });

  // Initial visibility setup
  updateUIVisibility();
}

/**
 * Update UI visibility based on mode
 */
function updateUIVisibility(): void {
  if (!pane) return;

  // Show/hide the entire pane
  const paneElement = pane.element;
  paneElement.style.display = uibox ? 'block' : 'none';

  // Show/hide folders based on mode
  const allFolders = pane.children;
  allFolders.forEach((child: any) => {
    if (child.title === 'Explorer') {
      child.hidden = fabricationMode;
    } else if (child.title === 'Fabrication') {
      child.hidden = !fabricationMode;
    }
  });
}

/**
 * Export the current view as SVG
 */
function exportSVG(): void {
  const tileValue = uiState.tile.replace(/[()]/g, '').split(',');
  const tiles = parseInt(tileValue[0]);

  let curr_sys = sys;
  for (let i = 1; i < tiles; i++) {
    curr_sys = buildSupertiles(curr_sys);
  }

  const stream: string[] = [];
  stream.push(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="-50 -50 100 100">'
  );
  curr_sys['Gamma'].streamSVG(ident, stream, colmap);
  stream.push('</svg>');

  const blob = new Blob([stream.join('\n')], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'spectre.svg';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Recursively draw tiles using Pixi.js
 */
function drawTilesToPixi(
  container: PIXI.Container,
  tile: PixiShape | PixiCurvyShape | PixiMeta,
  counters: { total: number; visible: number }
): void {
  tile.draw(container, colmap, boundingBoxWidth, boundingBoxHeight, width, height, counters);
}

/**
 * Main drawing function
 */
function draw(): void {
  // Clear previous frame
  mainContainer.removeChildren();
  
  // Reset counters
  const counters = { total: 0, visible: 0 };

  // Get tile iteration level
  const tileValue = uiState.tile.replace(/[()]/g, '').split(',');
  const tiles = parseInt(tileValue[0]);

  // Build supertiles
  let curr_sys = sys;
  for (let i = 1; i < tiles; i++) {
    curr_sys = buildSupertiles(curr_sys);
  }

  // Setup transformation matching the Canvas approach:
  // 1. Translate to center
  // 2. Apply tile scale
  // 3. Apply to_screen transform
  
  // Create a matrix that combines all three transformations
  const matrix = new PIXI.Matrix();
  
  // Start with translate to center
  matrix.translate(width / 2, height / 2);
  
  // Apply tile scale
  matrix.scale(tileScale, tileScale);
  
  // Apply to_screen transform
  // Canvas transform(a, b, c, d, e, f) maps to matrix [a, c, e, b, d, f] in column-major
  // to_screen is [a, b, tx, c, d, ty]
  // We need to append this as a matrix multiplication
  const toScreenMatrix = new PIXI.Matrix(
    to_screen[0], // a
    to_screen[3], // b (from index 3)
    to_screen[1], // c (from index 1)  
    to_screen[4], // d
    to_screen[2], // tx
    to_screen[5]  // ty
  );
  matrix.append(toScreenMatrix);
  
  // Apply the combined matrix to the main container
  mainContainer.setFromMatrix(matrix);

  // Draw the pattern directly into main container
  drawTilesToPixi(mainContainer, curr_sys['Gamma'], counters);

  // Update tile count in UI state
  tileCount = counters.total;
  visibleTileCount = counters.visible;
  uiState.tileCount = `${visibleTileCount} visible / ${tileCount} total`;
  pane.refresh();
}

/**
 * Main rendering loop
 */
function loop(): void {
  if (needsRedraw) {
    draw();
    needsRedraw = false;
  }
  requestAnimationFrame(loop);
}

/**
 * Mouse event handlers
 */
function onMouseDown(e: MouseEvent): void {
  dragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
}

function onMouseMove(e: MouseEvent): void {
  if (dragging) {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    to_screen[2] += dx / tileScale;
    to_screen[5] += dy / tileScale;
    needsRedraw = true;
  }
}

function onMouseUp(): void {
  dragging = false;
}

function onWheel(e: WheelEvent): void {
  e.preventDefault();
  const delta = e.deltaY;
  const zoomFactor = delta > 0 ? 0.9 : 1.1;

  to_screen[0] *= zoomFactor;
  to_screen[4] *= zoomFactor;
  lw_scale *= zoomFactor;

  needsRedraw = true;
}

/**
 * Touch event handlers
 */
function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 1) {
    dragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    dragging = false;
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    initialPinchDist = Math.sqrt(dx * dx + dy * dy);
  }
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 1 && dragging) {
    const dx = e.touches[0].clientX - lastMouseX;
    const dy = e.touches[0].clientY - lastMouseY;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;

    to_screen[2] += dx / tileScale;
    to_screen[5] += dy / tileScale;
    needsRedraw = true;
  } else if (e.touches.length === 2) {
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (initialPinchDist > 0) {
      const zoomFactor = dist / initialPinchDist;
      to_screen[0] *= zoomFactor;
      to_screen[4] *= zoomFactor;
      lw_scale *= zoomFactor;
      initialPinchDist = dist;
      needsRedraw = true;
    }
  }
}

function onTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 0) {
    dragging = false;
    initialPinchDist = -1;
  } else if (e.touches.length === 1) {
    initialPinchDist = -1;
    dragging = true;
    lastMouseX = e.touches[0].clientX;
    lastMouseY = e.touches[0].clientY;
  }
}

/**
 * Window resize handler
 */
function onResize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  app.renderer.resize(width, height);
  needsRedraw = true;
}

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  width = window.innerWidth;
  height = window.innerHeight;

  // Initialize Pixi.js Application with High DPI support
  app = new PIXI.Application();
  await app.init({
    width: width,
    height: height,
    backgroundColor: 0xffffff,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });

  // Add canvas to DOM
  document.body.appendChild(app.canvas);
  app.canvas.style.display = 'block';

  // Create main container
  mainContainer = new PIXI.Container();
  app.stage.addChild(mainContainer);

  // Resize handler
  window.addEventListener('resize', onResize);

  // Create UI
  createUI();

  // Initialize tile system (default to Spectres)
  sys = buildSpectreBase(true);

  // Event listeners
  app.canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  app.canvas.addEventListener('wheel', onWheel, { passive: false });

  app.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  app.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  app.canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  // Start loop
  requestAnimationFrame(loop);
}

// Start the application when DOM is ready
window.addEventListener('DOMContentLoaded', init);
