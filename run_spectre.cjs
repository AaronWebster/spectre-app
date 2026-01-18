const fs = require("fs");

// Mocks and Polyfills for p5.js environment
const cos = Math.cos;
const sin = Math.sin;
const PI = Math.PI;
const radians = (d) => (d * PI) / 180;
function createSpan() {}
function createSelect() {
  return {
    position: () => {},
    size: () => {},
    option: () => {},
    changed: () => {},
    value: () => {},
  };
}
function createButton() {
  return { position: () => {}, size: () => {}, mousePressed: () => {} };
}
function createCanvas() {}
function background() {}
function push() {}
function pop() {}
function translate() {}
function applyMatrix() {}
function noLoop() {}
function loop() {}
function fill() {}
function noFill() {}
function stroke() {}
function noStroke() {}
function strokeWeight() {}
function beginShape() {}
function endShape() {}
function vertex() {}
function bezierVertex() {}
function save() {}
function saveStrings() {}
const windowWidth = 100;
const windowHeight = 100;

// Load Clipper library for proper polygon offsetting
// Clipper is specifically designed for polygon offset/buffer operations
// and provides precise control over join styles (round, miter, square)
const ClipperLib = require('js-clipper');

// -- Include spectre.js content --
let spectreCode = fs.readFileSync("spectre.cjs", "utf8");
// Replace const/let with var to ensure visibility from eval in Node
spectreCode = spectreCode
  .replace(/\bconst\s+/g, "var ")
  .replace(/\blet\s+/g, "var ")
  .replace(/\bclass\s+(\w+)/g, "var $1 = class $1");
// Fix SVG attribute: stroke-weight -> stroke-width
spectreCode = spectreCode.replace(/stroke-weight/g, "stroke-width");
eval(spectreCode);

// -- Automation Logic --

// Helper function to parse numeric flag arguments
function parseNumericFlag(args, flagName, validationFn, errorMessage) {
  const flagIndex = args.indexOf(flagName);
  if (flagIndex !== -1) {
    if (flagIndex + 1 < args.length) {
      const parsedValue = parseFloat(args[flagIndex + 1]);
      if (!isNaN(parsedValue) && validationFn(parsedValue)) {
        args.splice(flagIndex, 2); // Remove flag and value
        return parsedValue;
      } else {
        console.error(`Error: Invalid ${errorMessage} value "${args[flagIndex + 1]}". ${errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1)} must meet validation criteria.`);
        process.exit(1);
      }
    }
  }
  return null;
}

function run() {
  let shapeArg = "tile11";
  let targetWidth = 100;
  let targetHeight = 100;
  let useTileSizeInches = false;
  let groutSpacingInches = 0;
  let kerfInches = 0;
  let spacingInches = 0;
  let tileScale = 1.0;

  // Argument Parsing
  const args = process.argv.slice(2);
  
  // Check for --tile-size-inches flag
  const tileSizeInchesIndex = args.indexOf('--tile-size-inches');
  if (tileSizeInchesIndex !== -1) {
    useTileSizeInches = true;
    args.splice(tileSizeInchesIndex, 1); // Remove the flag
  }
  
  // Parse numeric flags
  const kerfValue = parseNumericFlag(args, '--kerf', (v) => v >= 0, 'kerf');
  if (kerfValue !== null) kerfInches = kerfValue;
  
  const spacingValue = parseNumericFlag(args, '--spacing', (v) => v >= 0, 'spacing');
  if (spacingValue !== null) spacingInches = spacingValue;
  
  const scaleValue = parseNumericFlag(args, '--scale', (v) => v > 0, 'scale');
  if (scaleValue !== null) tileScale = scaleValue;
  
  const groutValue = parseNumericFlag(args, '--grout-spacing-inches', (v) => v >= 0, 'grout spacing');
  if (groutValue !== null) groutSpacingInches = groutValue;
  
  if (args.length > 0) {
    if (isNaN(parseFloat(args[0]))) {
      shapeArg = args[0].toLowerCase();
      if (args[1]) targetWidth = parseFloat(args[1]);
      if (args[2]) targetHeight = parseFloat(args[2]);
    } else {
      targetWidth = parseFloat(args[0]);
      if (args[1]) targetHeight = parseFloat(args[1]);
    }
  }

  // Convert inches to units (96 DPI standard for SVG)
  const DPI = 96;
  if (useTileSizeInches) {
    targetWidth = targetWidth * DPI;
    targetHeight = targetHeight * DPI;
  }
  
  // Convert parameters from inches to units
  const groutSpacingUnits = groutSpacingInches * DPI;
  const kerfUnits = kerfInches * DPI;
  const spacingUnits = spacingInches * DPI;
  
  // Calculate the polygon offset distance using the waterjet formula
  // offset = -((spacing / 2) + (kerf / 2))
  // Negative because we're eroding (shrinking) the polygons
  let offsetDistance = 0;
  
  // Priority: Use kerf and spacing if specified, otherwise fall back to grout spacing
  if (kerfInches > 0 || spacingInches > 0) {
    offsetDistance = -((spacingUnits / 2) + (kerfUnits / 2));
  } else if (groutSpacingInches > 0) {
    // Backward compatibility: grout spacing acts like spacing
    offsetDistance = -(groutSpacingUnits / 2);
  }

  console.log(
    `Configuration: Shape=${shapeArg}, Size=${targetWidth}x${targetHeight}${useTileSizeInches ? ' (from inches)' : ''}${kerfInches > 0 || spacingInches > 0 || groutSpacingInches > 0 ? `, Kerf=${kerfInches} inches, Spacing=${spacingInches > 0 ? spacingInches : groutSpacingInches} inches` : ''}${tileScale !== 1.0 ? `, Scale=${tileScale}` : ''}`,
  );

  console.log("Initializing Spectre Base...");

  // Set colmap to plain white for all labels
  for (let lab in colmap) {
    colmap[lab] = [255, 255, 255];
  }

  // Select System Builder
  if (shapeArg === "spectres") {
    sys = buildSpectreBase(true);
  } else if (shapeArg === "hexagons") {
    sys = buildHexBase();
  } else if (shapeArg === "turtles") {
    sys = buildHatTurtleBase(true);
  } else if (shapeArg === "hats") {
    sys = buildHatTurtleBase(false);
  } else {
    sys = buildSpectreBase(false); // Default Tile(1,1) / tile11
  }

  // Helper: Calculate polygon area
  function polyArea(pts) {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      let j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
  }

  // Helper to measure bounds and total area
  function measureSystem(node, T) {
    let lMinX = Infinity,
      lMaxX = -Infinity,
      lMinY = Infinity,
      lMaxY = -Infinity;
    let totalArea = 0;
    let count = 0;

    function visit(n, t) {
      if (n instanceof Shape || n instanceof CurvyShape) {
        let tpts = n.pts.map((p) => transPt(t, p));

        // Bounds
        for (let tp of tpts) {
          if (tp.x < lMinX) lMinX = tp.x;
          if (tp.x > lMaxX) lMaxX = tp.x;
          if (tp.y < lMinY) lMinY = tp.y;
          if (tp.y > lMaxY) lMaxY = tp.y;
        }

        // Area - For CurvyShape, this is approx area of control poly, but adequate for stopping condition
        totalArea += polyArea(tpts);
        count++;
      } else if (n instanceof Meta) {
        for (let g of n.geoms) {
          visit(g.geom, mul(t, g.xform));
        }
      }
    }
    visit(node, T);
    return {
      minX: lMinX,
      maxX: lMaxX,
      minY: lMinY,
      maxY: lMaxY,
      area: totalArea,
      count: count,
    };
  }

  const GROWTH_FACTOR = 4 + Math.sqrt(15); // ~7.87
  const maxIterations = 10;
  let iterations = 0;

  while (true) {
    iterations++;
    process.stdout.write(`Iteration ${iterations}... `);
    sys = buildSupertiles(sys);

    const stats = measureSystem(sys["Gamma"], ident);
    const w = stats.maxX - stats.minX;
    const h = stats.maxY - stats.minY;

    const targetArea = targetWidth * targetHeight;
    const currentArea = stats.area;

    console.log(
      `Bounds: ${w.toFixed(1)}x${h.toFixed(1)}, Area: ${currentArea.toFixed(0)} (Target: ${targetArea})`,
    );

    // Criteria:
    // 1. Physical bounds must exceed target dimensions (with small buffer).
    // 2. Total area must exceed target area by the growth factor.
    //    This ensures we are "one recursion level" deeper than the bare minimum,
    //    guaranteeing the central crop is free of boundary artifacts.

    if (
      w > targetWidth * 1.5 &&
      h > targetHeight * 1.5 &&
      currentArea > targetArea * GROWTH_FACTOR
    ) {
      break;
    }

    if (iterations >= maxIterations) {
      console.log("Max iterations reached, stopping.");
      break;
    }
  }

  const rootLabel = "Gamma";
  const root = sys[rootLabel];

  // Flatten the shapes
  console.log("Flattening shapes...");
  let allShapes = [];

  // Recursive traversal
  function traverse(node, T) {
    if (node instanceof Shape || node instanceof CurvyShape) {
      allShapes.push({ shape: node, T: T });
    } else if (node instanceof Meta) {
      for (let g of node.geoms) {
        traverse(g.geom, mul(T, g.xform));
      }
    }
  }

  traverse(root, ident);

  console.log(`Generated ${allShapes.length} primitive shapes.`);

  // Calculate Centroid of the whole patch to center our crop window
  // Using centroid is more robust than AABB center for irregular shapes
  let sumX = 0,
    sumY = 0,
    count = 0;

  for (let item of allShapes) {
    // Use first point as proxy for shape location to save time vs averaging all points
    let tp = transPt(item.T, item.shape.pts[0]);
    sumX += tp.x;
    sumY += tp.y;
    count++;
  }

  const cx = sumX / count;
  const cy = sumY / count;

  console.log(`Centroid: (${cx.toFixed(2)}, ${cy.toFixed(2)})`);

  const width = targetWidth;
  const height = targetHeight;
  const cropMinX = cx - width / 2;
  const cropMaxX = cx + width / 2;
  const cropMinY = cy - height / 2;
  const cropMaxY = cy + height / 2;

  console.log(
    `Cropping to ${width}x${height} area centered at (${cx.toFixed(2)}, ${cy.toFixed(2)})`,
  );
  console.log(
    `Crop Bounds: [${cropMinX.toFixed(2)}, ${cropMaxX.toFixed(2)}] x [${cropMinY.toFixed(2)}, ${cropMaxY.toFixed(2)}]`,
  );

  // Filter shapes
  const keptShapes = allShapes.filter((item) => {
    // Check centroid of the shape
    let sx = 0,
      sy = 0,
      n = 0;
    for (let p of item.shape.pts) {
      let tp = transPt(item.T, p);
      sx += tp.x;
      sy += tp.y;
      n++;
    }
    const cenX = sx / n;
    const cenY = sy / n;

    return (
      cenX >= cropMinX &&
      cenX <= cropMaxX &&
      cenY >= cropMinY &&
      cenY <= cropMaxY
    );
  });

  console.log(`retained ${keptShapes.length} shapes after culling.`);

  // Generate SVG
  const svgHeader = `<svg viewBox="${cropMinX} ${cropMinY} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
  const svgFooter = `</svg>`;

  let svgContent = [];
  svgContent.push(svgHeader);

  for (let item of keptShapes) {
    item.shape.streamSVG(item.T, svgContent, offsetDistance, tileScale);
  }

  svgContent.push(svgFooter);

  fs.writeFileSync("output.svg", svgContent.join("\n"));
  console.log("Saved output.svg");
}

run();
