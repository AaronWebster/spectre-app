// app.js - Modern HTML5 Canvas Version

const ident = [1,0,0,0,1,0];
let to_screen = [20, 0, 0, 0, -20, 0];
let lw_scale = 1;
let sys;
let dragging = false;
let uibox = true;
let initialPinchDist = -1;
let lastMouseX = 0, lastMouseY = 0;

// Canvas and Context
let canvas, ctx;
let width, height;
let needsRedraw = true;

// Tile counter
let tileCount = 0;
let visibleTileCount = 0;

// Tile scale and bounding box
let tileScale = 1;
let boundingBoxWidth = 100;
let boundingBoxHeight = 100;

// UI Elements
let tile_sel, shape_sel, colscheme_sel, tile_count_label;
let tileScaleInput, boundingBoxWidthInput, boundingBoxHeightInput;

const tile_names = [ 
	'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi',
	'Pi', 'Sigma', 'Phi', 'Psi' ];

const colmap53 = {
	'Gamma' : [203, 157, 126],
	'Gamma1' : [203, 157, 126],
	'Gamma2' : [203, 157, 126],
	'Delta' : [163, 150, 133],
	'Theta' : [208, 215, 150],
	'Lambda' : [184, 205, 178],
	'Xi' : [211, 177, 144],
	'Pi' : [218, 197, 161],
	'Sigma' : [191, 146, 126],
	'Phi' : [228, 213, 167],
	'Psi' : [224, 223, 156] };

const colmap_orig = {
	'Gamma' : [255, 255, 255],
	'Gamma1' : [255, 255, 255],
	'Gamma2' : [255, 255, 255],
	'Delta' : [220, 220, 220],
	'Theta' : [255, 191, 191],
	'Lambda' : [255, 160, 122],
	'Xi' : [255, 242, 0],
	'Pi' : [135, 206, 250],
	'Sigma' : [245, 245, 220],
	'Phi' : [0, 255, 0],
	'Psi' : [0, 255, 255] };

const colmap_mystics = {
	'Gamma' : [196, 201, 169],
	'Gamma1' : [196, 201, 169],
	'Gamma2' : [156, 160, 116],
	'Delta' : [247, 252, 248],
	'Theta' : [247, 252, 248],
	'Lambda' : [247, 252, 248],
	'Xi' : [247, 252, 248],
	'Pi' : [247, 252, 248],
	'Sigma' : [247, 252, 248],
	'Phi' : [247, 252, 248],
	'Psi' : [247, 252, 248] };

let colmap = colmap53;

// Math Helpers
const PI = Math.PI;
const cos = Math.cos;
const sin = Math.sin;
function radians(d) { return d * PI / 180; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2-x1, y2-y1); }
function mag(x, y) { return Math.hypot(x, y); }

function pt( x, y ) { return { x : x, y : y }; }

function inv( T ) {
	const det = T[0]*T[4] - T[1]*T[3];
	return [T[4]/det, -T[1]/det, (T[1]*T[5]-T[2]*T[4])/det,
		-T[3]/det, T[0]/det, (T[2]*T[3]-T[0]*T[5])/det];
};

function mul( A, B ) {
	return [A[0]*B[0] + A[1]*B[3], 
		A[0]*B[1] + A[1]*B[4],
		A[0]*B[2] + A[1]*B[5] + A[2],

		A[3]*B[0] + A[4]*B[3], 
		A[3]*B[1] + A[4]*B[4],
		A[3]*B[2] + A[4]*B[5] + A[5]];
}

function padd( p, q ) { return { x : p.x + q.x, y : p.y + q.y }; }
function psub( p, q ) { return { x : p.x - q.x, y : p.y - q.y }; }
function pframe( o, p, q, a, b ) { return { x : o.x + a*p.x + b*q.x, y : o.y + a*p.y + b*q.y }; }

function trot( ang ) {
	const c = cos( ang );
	const s = sin( ang );
	return [c, -s, 0, s, c, 0];
}

function ttrans( tx, ty ) { return [1, 0, tx, 0, 1, ty]; }
function transTo( p, q ) { return ttrans( q.x - p.x, q.y - p.y ); }

function rotAbout( p, ang ) {
	return mul( ttrans( p.x, p.y ), 
		mul( trot( ang ), ttrans( -p.x, -p.y ) ) );
}

function transPt( M, P ) {
	return pt(M[0]*P.x + M[1]*P.y + M[2], M[3]*P.x + M[4]*P.y + M[5]);
}

function matchSeg( p, q ) {
	return [q.x-p.x, p.y-q.y, p.x,  q.y-p.y, q.x-p.x, p.y];
};

function matchTwo( p1, q1, p2, q2 ) {
	return mul( matchSeg( p2, q2 ), inv( matchSeg( p1, q1 ) ) );
};

// Check if a tile is fully outside the bounding box
// Returns true if the tile should be invisible
function isTileOutsideBounds(pts, ctx) {
	// Get the current transformation matrix from the context
	// This includes: center translation + tileScale + to_screen
	const transform = ctx.getTransform();
	
	// Calculate the bounding box of the tile in screen space
	let minX = Infinity, maxX = -Infinity;
	let minY = Infinity, maxY = -Infinity;
	
	for (const p of pts) {
		// Transform the point to screen coordinates
		const x = transform.a * p.x + transform.c * p.y + transform.e;
		const y = transform.b * p.x + transform.d * p.y + transform.f;
		
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x);
		minY = Math.min(minY, y);
		maxY = Math.max(maxY, y);
	}
	
	// Get the scale factor from the transform
	const scaleX = Math.sqrt(transform.a * transform.a + transform.b * transform.b);
	const scaleY = Math.sqrt(transform.c * transform.c + transform.d * transform.d);
	
	// Convert bounding box dimensions to screen space
	// The bounding box is specified in tile units, so we scale by the transformation scale
	const halfWidth = (boundingBoxWidth / 2) * scaleX;
	const halfHeight = (boundingBoxHeight / 2) * scaleY;
	
	// Tile is outside if its bounding box doesn't overlap with the viewing box
	return (maxX < -halfWidth || minX > halfWidth || 
	        maxY < -halfHeight || minY > halfHeight);
};

// Drawing Helpers
function drawPolygon( ctx, shape, f, s, w ) {
    ctx.beginPath();
    ctx.moveTo(shape[0].x, shape[0].y);
    for(let i=1; i<shape.length; i++) {
        ctx.lineTo(shape[i].x, shape[i].y);
    }
    ctx.closePath();
    
	if( f != null ) {
		ctx.fillStyle = `rgb(${f[0]},${f[1]},${f[2]})`;
        ctx.fill();
	} 
	if( s != null ) {
		ctx.strokeStyle = `rgb(${s[0]},${s[1]},${s[2]})`;
		ctx.lineWidth = w;
        ctx.stroke();
	} 
}

// Classes
class Shape {
	constructor( pts, quad, label ) {
		this.pts = pts;
		this.quad = quad;
		this.label = label;
	}

	draw(ctx) {
		const isOutside = isTileOutsideBounds(this.pts, ctx);
		if (!isOutside) {
			// Only draw if tile is inside bounds
			drawPolygon( ctx, this.pts, colmap[this.label], [0,0,0], 0.1 );
			visibleTileCount++;
		}
		// Always count the tile even if not visible
		tileCount++;
	}

	streamSVG( S, stream ) {
		var s = '<polygon points="';
		var at_start = true;
		for( let p of this.pts ) {
			const sp = transPt( S, p );
			if( at_start ) { at_start = false; } else { s = s + ' '; }
			s = s + `${sp.x},${sp.y}`;
		}
		const col = colmap[this.label];
		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push( s );
	}
}

class CurvyShape {
	constructor( pts, quad, label ) {
		this.quad = quad;
		this.label = label;
		let blah = true;
		this.pts = [pts[pts.length-1]];
		for( const p of pts ) {
			const prev = this.pts[this.pts.length-1];
			const v = psub( p, prev );
			const w = pt( -v.y, v.x );
			if( blah ) {
				this.pts.push( pframe( prev, v, w, 0.33, 0.6 ) );
				this.pts.push( pframe( prev, v, w, 0.67, 0.6 ) );
			} else {
				this.pts.push( pframe( prev, v, w, 0.33, -0.6 ) );
				this.pts.push( pframe( prev, v, w, 0.67, -0.6 ) );
			}
			blah = !blah;
			this.pts.push( p );
		}
	}

	draw(ctx) {
		const isOutside = isTileOutsideBounds(this.pts, ctx);
		if (!isOutside) {
			// Only draw if tile is inside bounds
			const col = colmap[this.label];
			ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
			ctx.strokeStyle = "rgb(0,0,0)";
			ctx.lineWidth = 0.1;

			ctx.beginPath();
			ctx.moveTo( this.pts[0].x, this.pts[0].y );

			for( let idx = 1; idx < this.pts.length; idx += 3 ) {
				const a = this.pts[idx];
				const b = this.pts[idx+1];
				const c = this.pts[idx+2];
				ctx.bezierCurveTo( a.x, a.y, b.x, b.y, c.x, c.y );
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			visibleTileCount++;
		}
		// Always count the tile even if not visible
		tileCount++;
	}

	streamSVG( S, stream ) {
		const tp = transPt( S, this.pts[0] );
		var s = `<path d="M ${tp.x} ${tp.y}`;
		for( let idx = 1; idx < this.pts.length; idx += 3 ) {
			const a = transPt( S, this.pts[idx] );
			const b = transPt( S, this.pts[idx+1] );
			const c = transPt( S, this.pts[idx+2] );
			s = s + ` C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`;	
		}
		const col = colmap[this.label];
		s = s + `" stroke="black" stroke-weight="0.1" fill="rgb(${col[0]},${col[1]},${col[2]})" />`;
		stream.push( s );
	}
}

class Meta {
	constructor() {
		this.geoms = [];
		this.quad = [];
	}
	addChild( g, T ) {
		this.geoms.push( { geom : g, xform: T } );
	}
	draw(ctx) {
		for( let g of this.geoms ) {
			ctx.save();
			const M = g.xform;
			ctx.transform( M[0], M[3], M[1], M[4], M[2], M[5] );
			g.geom.draw(ctx);
			ctx.restore();
		}
	}
	streamSVG( S, stream ) {
		for( let g of this.geoms ) {
			g.geom.streamSVG( mul( S, g.xform ), stream );
		}
	}
}

// Builders
function buildSpectreBase( curved )
{
	const spectre = [
		pt(0, 0),
		pt(1.0, 0.0),
		pt(1.5, -0.8660254037844386),
		pt(2.366025403784439, -0.36602540378443865),
		pt(2.366025403784439, 0.6339745962155614),
		pt(3.366025403784439, 0.6339745962155614),
		pt(3.866025403784439, 1.5),
		pt(3.0, 2.0),
		pt(2.133974596215561, 1.5),
		pt(1.6339745962155614, 2.3660254037844393),
		pt(0.6339745962155614, 2.3660254037844393),
		pt(-0.3660254037844386, 2.3660254037844393),
		pt(-0.866025403784439, 1.5),
		pt(0.0, 1.0) 
	];

	const spectre_keys = [
		spectre[3], spectre[5], spectre[7], spectre[11]
	];

	const ret = {};

	for( lab of ['Delta', 'Theta', 'Lambda', 'Xi', 
				 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
		if( curved ) {
			ret[lab] = new CurvyShape( spectre, spectre_keys, lab );
		} else {
			ret[lab] = new Shape( spectre, spectre_keys, lab );
		}
	}

	const mystic = new Meta();
	if( curved ) {
		mystic.addChild( 
			new CurvyShape( spectre, spectre_keys, 'Gamma1' ), ident );
		mystic.addChild( 
			new CurvyShape( spectre, spectre_keys, 'Gamma2' ),
				mul( ttrans( spectre[8].x, spectre[8].y ), trot( PI / 6 ) ) );
	} else {
		mystic.addChild( new Shape( spectre, spectre_keys, 'Gamma1' ), ident );
		mystic.addChild( new Shape( spectre, spectre_keys, 'Gamma2' ),
			mul( ttrans( spectre[8].x, spectre[8].y ), trot( PI / 6 ) ) );
	}
	mystic.quad = spectre_keys;
	ret['Gamma'] = mystic;

	return ret;
}

function buildHatTurtleBase( hat_dominant )
{
	const r3 = 1.7320508075688772;
	const hr3 = 0.8660254037844386;

	function hexPt( x, y )
	{
		return pt( x + 0.5*y, -hr3*y );
	}

	function hexPt2( x, y )
	{
		return pt( x + hr3*y, -0.5*y );
	}

	const hat = [
		hexPt(-1, 2), hexPt(0, 2), hexPt(0, 3), hexPt(2, 2), hexPt(3, 0),
		hexPt(4, 0), hexPt(5,-1), hexPt(4,-2), hexPt(2,-1), hexPt(2,-2),
		hexPt( 1, -2), hexPt(0,-2), hexPt(-1,-1), hexPt(0, 0) ];

	const turtle = [
		hexPt(0,0), hexPt(2,-1), hexPt(3,0), hexPt(4,-1), hexPt(4,-2),
		hexPt(6,-3), hexPt(7,-5), hexPt(6,-5), hexPt(5,-4), hexPt(4,-5),
		hexPt(2,-4), hexPt(0,-3), hexPt(-1,-1), hexPt(0,-1)
		];

	const hat_keys = [
		hat[3], hat[5], hat[7], hat[11]
	];
	const turtle_keys = [
		turtle[3], turtle[5], turtle[7], turtle[11]
	];

	const ret = {};

	if( hat_dominant ) {
		for( lab of ['Delta', 'Theta', 'Lambda', 'Xi', 
					 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
			ret[lab] = new Shape( hat, hat_keys, lab );
		}

		const mystic = new Meta();
		mystic.addChild( new Shape( hat, hat_keys, 'Gamma1' ), ident );
		mystic.addChild( new Shape( turtle, turtle_keys, 'Gamma2' ),
			ttrans( hat[8].x, hat[8].y ) );
		mystic.quad = hat_keys;
		ret['Gamma'] = mystic;
	} else {
		for( lab of ['Delta', 'Theta', 'Lambda', 'Xi', 
					 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
			ret[lab] = new Shape( turtle, turtle_keys, lab );
		}

		const mystic = new Meta();
		mystic.addChild( new Shape( turtle, turtle_keys, 'Gamma1' ), ident );
		mystic.addChild( new Shape( hat, hat_keys, 'Gamma2' ),
			mul( ttrans( turtle[9].x, turtle[9].y ), trot( PI/3 ) ) );
		mystic.quad = turtle_keys;
		ret['Gamma'] = mystic;
	}

	return ret;
}

function buildHexBase()
{
	const hr3 = 0.8660254037844386;

	const hex = [
		pt(0, 0),
		pt(1.0, 0.0),
		pt(1.5, hr3),
		pt(1, 2*hr3),
		pt(0, 2*hr3),
		pt(-0.5, hr3) 
	];

	const hex_keys = [ hex[1], hex[2], hex[3], hex[5] ];

	const ret = {};

	for( lab of ['Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 
				 'Pi', 'Sigma', 'Phi', 'Psi'] ) {
		ret[lab] = new Shape( hex, hex_keys, lab );
	}

	return ret;
}

function buildSupertiles( sys )
{
	const quad = sys['Delta'].quad;
	const R = [-1,0,0,0,1,0];
	
	const t_rules = [
		[60, 3, 1], [0, 2, 0], [60, 3, 1], [60, 3, 1],
		[0, 2, 0], [60, 3, 1], [-120, 3, 3] ];  

	const Ts = [ident];
	let total_ang = 0;
	let rot = ident;
	const tquad = [...quad];
	for( const [ang,from,to] of t_rules ) {
		total_ang += ang;
		if( ang != 0 ) {
			rot = trot( radians( total_ang ) );
			for( i = 0; i < 4; ++i ) {
				tquad[i] = transPt( rot, quad[i] );
			}
		}

		const ttt = transTo( tquad[to], 
			transPt( Ts[Ts.length-1], quad[from] ) );
		Ts.push( mul( ttt, rot ) );
	}

	for( let idx = 0; idx < Ts.length; ++idx ) {
		Ts[idx] = mul( R, Ts[idx] );
	}

	const super_rules = {
		'Gamma' :  ['Pi','Delta','null','Theta','Sigma','Xi','Phi','Gamma'],
		'Delta' :  ['Xi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'],
		'Theta' :  ['Psi','Delta','Pi','Phi','Sigma','Pi','Phi','Gamma'],
		'Lambda' : ['Psi','Delta','Xi','Phi','Sigma','Pi','Phi','Gamma'],
		'Xi' :     ['Psi','Delta','Pi','Phi','Sigma','Psi','Phi','Gamma'],
		'Pi' :     ['Psi','Delta','Xi','Phi','Sigma','Psi','Phi','Gamma'],
		'Sigma' :  ['Xi','Delta','Xi','Phi','Sigma','Pi','Lambda','Gamma'],
		'Phi' :    ['Psi','Delta','Psi','Phi','Sigma','Pi','Phi','Gamma'],
		'Psi' :    ['Psi','Delta','Psi','Phi','Sigma','Psi','Phi','Gamma'] };
	const super_quad = [
		transPt( Ts[6], quad[2] ),
		transPt( Ts[5], quad[1] ),
		transPt( Ts[3], quad[2] ),
		transPt( Ts[0], quad[1] ) ]; 

	const ret = {};

	for( const [lab, subs] of Object.entries( super_rules ) ) {
		const sup = new Meta();
		for( let idx = 0; idx < 8; ++idx ) {
			if( subs[idx] == 'null' ) {
				continue;
			}
			sup.addChild( sys[subs[idx]], Ts[idx] );
		}
		sup.quad = super_quad;

		ret[lab] = sup;
	}

	return ret;
}

// UI Creation
function createUI() {
    // Shapes Label and Select
    addLabel('Shapes', 10, 10);
    shape_sel = addSelect(10, 30, [
        'Tile(1,1)', 'Spectres', 'Hexagons', 
        'Turtles in Hats', 'Hats in Turtles'
    ], 'Tile(1,1)'); // Default
    
    shape_sel.addEventListener('change', () => {
		const s = shape_sel.value;
		if( s == 'Hexagons' ) {
			sys = buildHexBase();
		} else if( s == 'Turtles in Hats' ) {
			sys = buildHatTurtleBase( true );
		} else if( s == 'Hats in Turtles' ) {
			sys = buildHatTurtleBase( false );
		} else if( s == 'Spectres' ) {
			sys = buildSpectreBase( true );
		} else {
			sys = buildSpectreBase( false );
		}
		to_screen = [20, 0, 0, 0, -20, 0];
		lw_scale = 1;
        needsRedraw = true;
    });

    // Subst Button
    const subst_btn = addButton('Build Supertiles', 10, 60, () => {
        sys = buildSupertiles( sys );
        needsRedraw = true;
    });

    // Category Label and Select
    addLabel('Category', 10, 100);
    tile_sel = addSelect(10, 120, tile_names, 'Delta');
    tile_sel.addEventListener('change', () => { needsRedraw = true; });

    // Colors Label and Select
    addLabel('Colours', 10, 150);
    colscheme_sel = addSelect(10, 170, [
        'Figure 5.3', 'Mystics', 'Bright'
    ], 'Figure 5.3');
    colscheme_sel.addEventListener('change', () => { needsRedraw = true; });

    // Save PNG
    addButton('Save PNG', 10, 210, () => {
        uibox = false;
        draw();
        const link = document.createElement('a');
        link.download = 'output.png';
        link.href = canvas.toDataURL();
        link.click();
        uibox = true;
        needsRedraw = true;
    });

    // Save SVG
    addButton('Save SVG', 10, 240, () => {
        const stream = [];
        stream.push( `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">` );
		stream.push( `<g transform="translate(${width/2},${height/2})">` );

		sys[tile_sel.value].streamSVG( to_screen, stream );

        stream.push( '</g>' );
        stream.push( '</svg>' );
        
        const blob = new Blob(stream, {type: "image/svg+xml;charset=utf-8"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = "output.svg";
        link.click();
    });
    
    // Tile Count Label
    tile_count_label = addLabel('Tiles: 0', 10, 270);
    
    // Tile Scale
    addLabel('Tile Scale', 10, 300);
    tileScaleInput = addNumberInput(10, 320, tileScale, 0.1, 10, 0.1, (value) => {
        tileScale = value;
        needsRedraw = true;
    });
    
    // Bounding Box
    addLabel('Bounding Box', 10, 350);
    addLabel('Width:', 10, 370);
    boundingBoxWidthInput = addNumberInput(70, 367, boundingBoxWidth, 10, 1000, 10, (value) => {
        boundingBoxWidth = value;
        needsRedraw = true;
    });
    addLabel('Height:', 10, 395);
    boundingBoxHeightInput = addNumberInput(70, 392, boundingBoxHeight, 10, 1000, 10, (value) => {
        boundingBoxHeight = value;
        needsRedraw = true;
    });
}

function addLabel(text, x, y) {
    const el = document.createElement('span');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.fontFamily = 'sans-serif';
    el.style.fontSize = '12px';
    document.body.appendChild(el);
    return el;
}

function addSelect(x, y, options, def) {
    const el = document.createElement('select');
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = '125px';
    el.style.height = '25px';
    for(const opt of options) {
        const o = document.createElement('option');
        o.value = opt;
        o.text = opt;
        el.appendChild(o);
    }
    el.value = def;
    document.body.appendChild(el);
    return el;
}

function addButton(text, x, y, onclick) {
    const el = document.createElement('button');
    el.innerText = text;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = '125px';
    el.style.height = '25px';
    el.addEventListener('click', onclick);
    document.body.appendChild(el);
    return el;
}

function addNumberInput(x, y, defaultValue, min, max, step, onchange) {
    const el = document.createElement('input');
    el.type = 'number';
    el.value = defaultValue;
    el.min = min;
    el.max = max;
    el.step = step;
    el.style.position = 'absolute';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.width = '60px';
    el.style.height = '20px';
    el.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            onchange(value);
        }
    });
    document.body.appendChild(el);
    return el;
}

// Initialization
window.addEventListener('DOMContentLoaded', init);

function init() {
    // Create canvas
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    document.body.appendChild(canvas);
    
    // Resize handler
    window.addEventListener('resize', onResize);
    onResize();

    // Create UI
    createUI();

    // Init Logic - Default to Spectres
    sys = buildSpectreBase(false); // Default to Tile(1,1) based on UI default
    // Wait, createUI sets Spectres default, but change listener not fired.
    // Let's match default manually.
    // UI default 'Spectres' -> buildSpectreBase(true)
    
    // Event Listeners
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, {passive: false});
    
    canvas.addEventListener('touchstart', onTouchStart, {passive: false});
    canvas.addEventListener('touchmove', onTouchMove, {passive: false});
    canvas.addEventListener('touchend', onTouchEnd, {passive: false});

    // Loop
    requestAnimationFrame(loop);
}

function onResize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    needsRedraw = true;
}

function loop() {
    if(needsRedraw) {
        draw();
        needsRedraw = false;
    }
    requestAnimationFrame(loop);
}

// Input Handlers
function onMouseDown(e) {
    dragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    needsRedraw = true;
}

function onMouseMove(e) {
    if(dragging) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        to_screen = mul( ttrans( dx, dy ), to_screen );
        needsRedraw = true;
    }
}

function onMouseUp(e) {
    dragging = false;
    needsRedraw = true;
}

function onWheel(e) {
    e.preventDefault();
    let s = e.deltaY > 0 ? 0.9 : 1.1;
	
    // Center zoom
	to_screen = mul( [s, 0, 0, 0, s, 0], to_screen );
	lw_scale = mag( to_screen[0], to_screen[1] ) / 20.0;
    
    needsRedraw = true;
}

function onTouchStart(e) {
    if (e.touches.length === 2) {
		initialPinchDist = dist(e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
	}
    if (e.touches.length === 1) {
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    }
	dragging = true;
}

function onTouchMove(e) {
    e.preventDefault();
	if (e.touches.length === 1) {
		// Single touch pan
        const dx = e.touches[0].clientX - lastMouseX;
        const dy = e.touches[0].clientY - lastMouseY;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
        
		to_screen = mul( ttrans( dx, dy ), to_screen );
        needsRedraw = true;
	} else if (e.touches.length === 2) {
		// Two finger pinch zoom
		let d = dist(e.touches[0].clientX, e.touches[0].clientY, e.touches[1].clientX, e.touches[1].clientY);
		
		if (initialPinchDist > 0 && d > 0) {
			let s = d / initialPinchDist;
			to_screen = mul( [s, 0, 0, 0, s, 0], to_screen );
			lw_scale = mag( to_screen[0], to_screen[1] ) / 20.0;
			initialPinchDist = d;
            needsRedraw = true;
		}
	}
}

function onTouchEnd(e) {
    if (e.touches.length === 0) {
		dragging = false;
	}
	if (e.touches.length !== 2) {
		initialPinchDist = -1;
	}
    if (e.touches.length === 1) {
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    }
}

// ... Draw ...
function draw() {
    // Reset tile counters
    tileCount = 0;
    visibleTileCount = 0;
    
    // Clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center logic
    ctx.translate(width/2, height/2);
    // Apply tile scale
    ctx.scale(tileScale, tileScale);
    // Apply to_screen
    ctx.transform(to_screen[0], to_screen[3], to_screen[1], to_screen[4], to_screen[2], to_screen[5]);

    // Handle Color Map
    const s = colscheme_sel.value;
	if( s == 'Bright' ) {
		colmap = colmap_orig;
	} else if( s == 'Mystics' ) {
		colmap = colmap_mystics;
	} else {
		colmap = colmap53;
	}

    // Draw System
    if(sys && sys[tile_sel.value]) {
        sys[tile_sel.value].draw(ctx);
    }
    
    ctx.restore();

    // UI Box
    if(uibox) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5;
        ctx.fillRect(5, 5, 135, 420); // Updated height for new UI elements
        ctx.strokeRect(5, 5, 135, 420);
    }
    
    // Update tile count display
    if(tile_count_label) {
        tile_count_label.innerText = `Tiles: ${visibleTileCount}`;
    }
}