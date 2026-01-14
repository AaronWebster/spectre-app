// main.ts - Entry point for the Spectre Tile Explorer application

import { TransformMatrix, ColorMap } from './types';
import { buildSpectreBase, buildHatTurtleBase, buildHexBase, buildSupertiles } from './generator';
import { Shape, CurvyShape, Meta, resetTileCounts, getTileCounts } from './shapes';
import { DEFAULT_SCALE, colmap53, colmap_orig, colmap_mystics } from './constants';
import { ident } from './math';

// Application State
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let width: number;
let height: number;
let needsRedraw = true;

let to_screen: TransformMatrix = [DEFAULT_SCALE, 0, 0, 0, -DEFAULT_SCALE, 0];
let lw_scale = 1;
let sys: Record<string, Shape | CurvyShape | Meta>;
let dragging = false;
let uibox = true;
let initialPinchDist = -1;
let lastMouseX = 0,
  lastMouseY = 0;

// Tile state
let tileScale = 1;
let boundingBoxWidth = 100;
let boundingBoxHeight = 100;

// Fabrication Mode State (not yet fully implemented)
let fabricationMode = false;
let stockWidth = 24;
let stockHeight = 24;
let stockMargin = 0.25;
let chainCutting = false;

// UI Elements
let tile_sel: HTMLSelectElement;
let shape_sel: HTMLSelectElement;
let colscheme_sel: HTMLSelectElement;
let tile_count_label: HTMLDivElement;
let groutInput: HTMLInputElement;
let kerfInput: HTMLInputElement;
let mode_sel: HTMLSelectElement;
let stockWidthInput: HTMLInputElement;
let stockHeightInput: HTMLInputElement;
let stockMarginInput: HTMLInputElement;
let chainCuttingCheckbox: HTMLInputElement;
let previewNestButton: HTMLButtonElement;
let fabYieldLabel: HTMLDivElement;

let colmap: ColorMap = colmap53;

/**
 * Add a label to the UI
 */
function addLabel(text: string, x: number, y: number): HTMLDivElement {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'absolute';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = 'white';
  el.style.fontSize = '12px';
  el.style.fontFamily = 'sans-serif';
  el.style.backgroundColor = 'rgba(0,0,0,0.7)';
  el.style.padding = '2px 5px';
  el.style.borderRadius = '3px';
  el.style.pointerEvents = 'none';
  document.body.appendChild(el);
  return el;
}

/**
 * Add a select dropdown to the UI
 */
function addSelect(
  x: number,
  y: number,
  options: string[],
  def: string
): HTMLSelectElement {
  const el = document.createElement('select');
  el.style.position = 'absolute';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.backgroundColor = 'rgba(255,255,255,0.9)';
  el.style.border = '1px solid #ccc';
  el.style.padding = '4px';
  el.style.fontSize = '12px';
  el.style.borderRadius = '3px';
  el.style.fontFamily = 'sans-serif';

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === def) {
      option.selected = true;
    }
    el.appendChild(option);
  }

  document.body.appendChild(el);
  return el;
}

/**
 * Add a button to the UI
 */
function addButton(
  text: string,
  x: number,
  y: number,
  onclick: () => void
): HTMLButtonElement {
  const el = document.createElement('button');
  el.textContent = text;
  el.style.position = 'absolute';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.backgroundColor = 'rgba(255,255,255,0.9)';
  el.style.border = '1px solid #ccc';
  el.style.padding = '4px 8px';
  el.style.fontSize = '12px';
  el.style.borderRadius = '3px';
  el.style.cursor = 'pointer';
  el.style.fontFamily = 'sans-serif';
  el.addEventListener('click', onclick);
  document.body.appendChild(el);
  return el;
}

/**
 * Add a number input to the UI
 */
function addNumberInput(
  x: number,
  y: number,
  defaultValue: number,
  min: number,
  max: number,
  step: number,
  onchange: (value: number) => void
): HTMLInputElement {
  const el = document.createElement('input');
  el.type = 'number';
  el.value = defaultValue.toString();
  el.min = min.toString();
  el.max = max.toString();
  el.step = step.toString();
  el.style.position = 'absolute';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.width = '70px';
  el.style.backgroundColor = 'rgba(255,255,255,0.9)';
  el.style.border = '1px solid #ccc';
  el.style.padding = '4px';
  el.style.fontSize = '12px';
  el.style.borderRadius = '3px';
  el.style.fontFamily = 'sans-serif';
  el.addEventListener('change', (e) => {
    onchange(parseFloat((e.target as HTMLInputElement).value));
  });
  document.body.appendChild(el);
  return el;
}

/**
 * Add a checkbox to the UI
 */
function addCheckbox(
  x: number,
  y: number,
  defaultValue: boolean,
  onchange: (checked: boolean) => void
): HTMLInputElement {
  const el = document.createElement('input');
  el.type = 'checkbox';
  el.checked = defaultValue;
  el.style.position = 'absolute';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.addEventListener('change', (e) => {
    onchange((e.target as HTMLInputElement).checked);
  });
  document.body.appendChild(el);
  return el;
}

/**
 * Create the UI controls
 */
function createUI(): void {
  // Mode Selection
  addLabel('Mode', 10, 10);
  mode_sel = addSelect(10, 30, ['Spectre Explorer', 'Fabrication'], 'Spectre Explorer');
  mode_sel.addEventListener('change', () => {
    fabricationMode = mode_sel.value === 'Fabrication';
    toggleUIVisibility();
    needsRedraw = true;
  });

  // Tile Selection
  addLabel('Tile', 10, 70);
  const iterations = ['(1,1)'];
  for (let i = 2; i < 8; i++) {
    iterations.push(`(${i},${i})`);
  }
  tile_sel = addSelect(10, 90, iterations, '(1,1)');
  tile_sel.addEventListener('change', () => {
    needsRedraw = true;
  });

  // Shape Selection
  addLabel('Shape', 10, 130);
  shape_sel = addSelect(10, 150, ['Spectres', 'Tile(1,1)', 'Hat', 'Turtle', 'Hexagons'], 'Spectres');
  shape_sel.addEventListener('change', () => {
    if (shape_sel.value === 'Spectres') {
      sys = buildSpectreBase(true);
    } else if (shape_sel.value === 'Tile(1,1)') {
      sys = buildSpectreBase(false);
    } else if (shape_sel.value === 'Hat') {
      sys = buildHatTurtleBase(true);
    } else if (shape_sel.value === 'Turtle') {
      sys = buildHatTurtleBase(false);
    } else if (shape_sel.value === 'Hexagons') {
      sys = buildHexBase();
    }
    needsRedraw = true;
  });

  // Color Scheme
  addLabel('Color Scheme', 10, 190);
  colscheme_sel = addSelect(10, 210, ['Paper Fig 5.3', 'Original', 'Mystic'], 'Paper Fig 5.3');
  colscheme_sel.addEventListener('change', () => {
    if (colscheme_sel.value === 'Paper Fig 5.3') {
      colmap = colmap53;
    } else if (colscheme_sel.value === 'Original') {
      colmap = colmap_orig;
    } else if (colscheme_sel.value === 'Mystic') {
      colmap = colmap_mystics;
    }
    needsRedraw = true;
  });

  // Tile Count
  addLabel('Tiles', 10, 250);
  tile_count_label = addLabel('0 visible / 0 total', 10, 270);

  // Tile Scale
  addLabel('Tile Scale', 10, 310);
  addNumberInput(10, 330, tileScale, 0.1, 10, 0.1, (val) => {
    tileScale = val;
    needsRedraw = true;
  });

  // Bounding Box Controls
  addLabel('Bounding Box Width', 10, 370);
  addNumberInput(10, 390, boundingBoxWidth, 10, 1000, 10, (val) => {
    boundingBoxWidth = val;
    needsRedraw = true;
  });

  addLabel('Bounding Box Height', 10, 430);
  addNumberInput(10, 450, boundingBoxHeight, 10, 1000, 10, (val) => {
    boundingBoxHeight = val;
    needsRedraw = true;
  });

  // Export Button
  addButton('Export SVG', 10, 490, () => {
    exportSVG();
  });

  // Hide/Show UI
  addButton('Toggle UI', 10, 530, () => {
    uibox = !uibox;
    toggleUIVisibility();
  });

  // Fabrication-specific UI (initially hidden)
  addLabel('Grout (inches)', 10, 570);
  groutInput = addNumberInput(10, 590, 0.125, 0, 1, 0.125, () => {
    needsRedraw = true;
  });

  addLabel('Kerf (inches)', 10, 630);
  kerfInput = addNumberInput(10, 650, 0.05, 0, 1, 0.01, () => {
    needsRedraw = true;
  });

  addLabel('Stock Width (inches)', 10, 690);
  stockWidthInput = addNumberInput(10, 710, stockWidth, 1, 100, 1, (val) => {
    stockWidth = val;
  });

  addLabel('Stock Height (inches)', 10, 750);
  stockHeightInput = addNumberInput(10, 770, stockHeight, 1, 100, 1, (val) => {
    stockHeight = val;
  });

  addLabel('Stock Margin (inches)', 10, 810);
  stockMarginInput = addNumberInput(10, 830, stockMargin, 0, 10, 0.25, (val) => {
    stockMargin = val;
  });

  addLabel('Chain Cutting', 10, 870);
  chainCuttingCheckbox = addCheckbox(10, 890, chainCutting, (checked) => {
    chainCutting = checked;
  });

  previewNestButton = addButton('Preview Nest', 10, 920, () => {
    console.log('Preview nest functionality not yet implemented');
  });

  fabYieldLabel = addLabel('Yield: 0%', 10, 960);

  toggleUIVisibility();
}

/**
 * Toggle UI visibility
 */
function toggleUIVisibility(): void {
  const allElements = document.querySelectorAll('div, select, button, input');
  allElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    if (htmlEl !== canvas && htmlEl.style.position === 'absolute') {
      htmlEl.style.display = uibox ? 'block' : 'none';
    }
  });

  // Show/hide fabrication-specific controls
  if (fabricationMode && uibox) {
    groutInput.style.display = 'block';
    kerfInput.style.display = 'block';
    stockWidthInput.style.display = 'block';
    stockHeightInput.style.display = 'block';
    stockMarginInput.style.display = 'block';
    chainCuttingCheckbox.style.display = 'block';
    previewNestButton.style.display = 'block';
    fabYieldLabel.style.display = 'block';
  } else {
    groutInput.style.display = 'none';
    kerfInput.style.display = 'none';
    stockWidthInput.style.display = 'none';
    stockHeightInput.style.display = 'none';
    stockMarginInput.style.display = 'none';
    chainCuttingCheckbox.style.display = 'none';
    previewNestButton.style.display = 'none';
    fabYieldLabel.style.display = 'none';
  }
}

/**
 * Export the current view as SVG
 */
function exportSVG(): void {
  const tileValue = tile_sel.value.replace(/[()]/g, '').split(',');
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
 * Draw the tiles
 */
function draw(): void {
  // Clear canvas
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  // Reset tile counters
  resetTileCounts();

  // Get tile iteration level
  const tileValue = tile_sel.value.replace(/[()]/g, '').split(',');
  const tiles = parseInt(tileValue[0]);

  // Build supertiles
  let curr_sys = sys;
  for (let i = 1; i < tiles; i++) {
    curr_sys = buildSupertiles(curr_sys);
  }

  // Setup transformation
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(tileScale, tileScale);
  ctx.transform(to_screen[0], to_screen[3], to_screen[1], to_screen[4], to_screen[2], to_screen[5]);

  // Draw the pattern
  curr_sys['Gamma'].draw(ctx, colmap, boundingBoxWidth, boundingBoxHeight);

  ctx.restore();

  // Update tile count
  const counts = getTileCounts();
  tile_count_label.textContent = `${counts.visible} visible / ${counts.total} total`;
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
  canvas.width = width;
  canvas.height = height;
  needsRedraw = true;
}

/**
 * Initialize the application
 */
function init(): void {
  // Create canvas
  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d', { alpha: false })!;
  document.body.appendChild(canvas);

  // Resize handler
  window.addEventListener('resize', onResize);
  onResize();

  // Create UI
  createUI();

  // Initialize tile system (default to Spectres)
  sys = buildSpectreBase(true);

  // Event listeners
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  // Start loop
  requestAnimationFrame(loop);
}

// Start the application when DOM is ready
window.addEventListener('DOMContentLoaded', init);
