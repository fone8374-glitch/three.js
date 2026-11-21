import * as THREE from 'three';

function canvas( w, h = w ) {

	const c = document.createElement( 'canvas' );
	c.width = w;
	c.height = h;
	return c;

}

function rand( a, b ) {

	return a + Math.random() * ( b - a );

}

export function toTexture( c, { repeat, srgb = true } = {} ) {

	const tex = new THREE.CanvasTexture( c );
	if ( srgb ) tex.colorSpace = THREE.SRGBColorSpace;
	tex.anisotropy = 4;
	if ( repeat ) {

		tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
		tex.repeat.set( repeat[ 0 ], repeat[ 1 ] );

	}

	return tex;

}

function speckle( g, w, h, n, color, size = 2, alpha = 0.1 ) {

	g.fillStyle = color;
	for ( let i = 0; i < n; i ++ ) {

		g.globalAlpha = Math.random() * alpha;
		g.fillRect( Math.random() * w, Math.random() * h, size, size );

	}

	g.globalAlpha = 1;

}

// ---------- teacher clothing ----------

export function shirtTexture() {

	const c = canvas( 512 ), g = c.getContext( '2d' );
	g.fillStyle = '#ecebe4';
	g.fillRect( 0, 0, 512, 512 );
	// faint pinstripes
	g.strokeStyle = 'rgba(120,140,190,0.18)';
	g.lineWidth = 2;
	for ( let x = 0; x < 512; x += 14 ) {

		g.beginPath();
		g.moveTo( x, 0 );
		g.lineTo( x, 512 );
		g.stroke();

	}

	// wrinkles
	g.strokeStyle = 'rgba(90,90,80,0.12)';
	for ( let i = 0; i < 40; i ++ ) {

		g.lineWidth = rand( 1, 4 );
		g.beginPath();
		const x = rand( 0, 512 ), y = rand( 0, 512 );
		g.moveTo( x, y );
		g.quadraticCurveTo( x + rand( - 40, 40 ), y + rand( 10, 40 ), x + rand( - 60, 60 ), y + rand( 30, 90 ) );
		g.stroke();

	}

	// coffee stain ring
	g.strokeStyle = 'rgba(120,80,40,0.35)';
	g.lineWidth = 5;
	g.beginPath();
	g.arc( 330, 300, 26, 0.3, Math.PI * 1.8 );
	g.stroke();
	g.fillStyle = 'rgba(140,95,50,0.15)';
	g.beginPath();
	g.arc( 330, 300, 24, 0, Math.PI * 2 );
	g.fill();
	// chalk smudges
	for ( let i = 0; i < 6; i ++ ) {

		const gr = g.createRadialGradient( 0, 0, 0, 0, 0, 30 );
		gr.addColorStop( 0, 'rgba(255,255,255,0.7)' );
		gr.addColorStop( 1, 'rgba(255,255,255,0)' );
		g.save();
		g.translate( rand( 50, 460 ), rand( 60, 480 ) );
		g.scale( rand( 1, 2.5 ), rand( 0.5, 1 ) );
		g.fillStyle = gr;
		g.fillRect( - 30, - 30, 60, 60 );
		g.restore();

	}

	// sweat / grime near the bottom
	speckle( g, 512, 512, 3000, '#6d6a5c', 2, 0.15 );
	return toTexture( c );

}

export function vestTexture() {

	const c = canvas( 256 ), g = c.getContext( '2d' );
	g.fillStyle = '#4a3a2c';
	g.fillRect( 0, 0, 256, 256 );
	// tweed herringbone
	for ( let y = 0; y < 256; y += 6 ) {

		for ( let x = 0; x < 256; x += 6 ) {

			g.fillStyle = ( ( x + y ) / 6 ) % 2 ? 'rgba(110,90,60,0.45)' : 'rgba(30,22,15,0.35)';
			g.fillRect( x, y, 4, 3 );

		}

	}

	speckle( g, 256, 256, 1200, '#c9b08a', 1, 0.4 );
	// worn shiny patch
	const gr = g.createRadialGradient( 180, 170, 0, 180, 170, 60 );
	gr.addColorStop( 0, 'rgba(160,140,110,0.35)' );
	gr.addColorStop( 1, 'rgba(160,140,110,0)' );
	g.fillStyle = gr;
	g.fillRect( 0, 0, 256, 256 );
	return toTexture( c, { repeat: [ 2, 2 ] } );

}

export function trouserTexture() {

	const c = canvas( 256 ), g = c.getContext( '2d' );
	g.fillStyle = '#4b4e58';
	g.fillRect( 0, 0, 256, 256 );
	speckle( g, 256, 256, 3000, '#22242a', 2, 0.3 );
	speckle( g, 256, 256, 1500, '#9aa0aa', 1, 0.25 );
	// knee patch
	g.fillStyle = '#3c3f47';
	g.fillRect( 150, 120, 60, 50 );
	g.strokeStyle = '#a89c80';
	g.setLineDash( [ 5, 4 ] );
	g.lineWidth = 2;
	g.strokeRect( 152, 122, 56, 46 );
	// chalk handprint
	g.fillStyle = 'rgba(240,240,240,0.35)';
	g.beginPath();
	g.ellipse( 60, 60, 18, 22, 0.3, 0, Math.PI * 2 );
	g.fill();
	for ( let i = 0; i < 4; i ++ ) {

		g.beginPath();
		g.ellipse( 44 + i * 10, 30, 4, 12, 0.2, 0, Math.PI * 2 );
		g.fill();

	}

	return toTexture( c );

}

// ---------- ninja clothing ----------

export function ninjaClothTexture( base = '#1e2645' ) {

	const c = canvas( 256 ), g = c.getContext( '2d' );
	g.fillStyle = base;
	g.fillRect( 0, 0, 256, 256 );
	for ( let y = 0; y < 256; y += 3 ) {

		g.fillStyle = `rgba(0,0,0,${ 0.08 + Math.random() * 0.08 })`;
		g.fillRect( 0, y, 256, 1 );

	}

	for ( let x = 0; x < 256; x += 3 ) {

		g.fillStyle = `rgba(255,255,255,${ Math.random() * 0.04 })`;
		g.fillRect( x, 0, 1, 256 );

	}

	// sashiko stitching
	g.strokeStyle = 'rgba(200,205,230,0.18)';
	g.setLineDash( [ 6, 6 ] );
	g.lineWidth = 2;
	for ( let y = 20; y < 256; y += 48 ) {

		g.beginPath();
		g.moveTo( 0, y );
		g.lineTo( 256, y );
		g.stroke();

	}

	return toTexture( c, { repeat: [ 2, 2 ] } );

}

export function wrapTexture() {

	const c = canvas( 128 ), g = c.getContext( '2d' );
	g.fillStyle = '#b8b2a2';
	g.fillRect( 0, 0, 128, 128 );
	for ( let y = - 128; y < 256; y += 16 ) {

		g.strokeStyle = 'rgba(60,50,40,0.5)';
		g.lineWidth = 3;
		g.beginPath();
		g.moveTo( 0, y );
		g.lineTo( 128, y + 40 );
		g.stroke();

	}

	speckle( g, 128, 128, 600, '#4a4030', 1, 0.4 );
	return toTexture( c, { repeat: [ 1, 3 ] } );

}

// ---------- faces ----------

// Teacher face: photo (or drawn default) + accumulated injuries.
export class TeacherFace {

	constructor() {

		this.canvas = canvas( 512 );
		this.photo = null;
		this.injuries = 0;
		this.texture = toTexture( this.canvas );
		this.draw();

	}

	setPhoto( img ) {

		this.photo = img;
		this.draw();

	}

	setInjuries( n ) {

		this.injuries = n;
		this.draw();

	}

	draw() {

		const g = this.canvas.getContext( '2d' );
		const S = 512;
		g.clearRect( 0, 0, S, S );
		g.fillStyle = '#c98f6b';
		g.fillRect( 0, 0, S, S );

		if ( this.photo ) {

			// feathered ellipse so the photo blends into the skin of the head
			const tmp = canvas( S ), tg = tmp.getContext( '2d' );
			tg.drawImage( this.photo, 0, 0, S, S );
			tg.globalCompositeOperation = 'destination-in';
			const gr = tg.createRadialGradient( S / 2, S * 0.48, S * 0.28, S / 2, S * 0.48, S * 0.5 );
			gr.addColorStop( 0, 'rgba(0,0,0,1)' );
			gr.addColorStop( 1, 'rgba(0,0,0,0)' );
			tg.fillStyle = gr;
			tg.save();
			tg.translate( S / 2, S * 0.48 );
			tg.scale( 0.86, 1 );
			tg.translate( - S / 2, - S * 0.48 );
			tg.fillRect( 0, 0, S, S );
			tg.restore();
			g.drawImage( tmp, 0, 0 );

		} else {

			this.drawDefault( g, S );

		}

		this.drawInjuries( g, S );
		this.texture.needsUpdate = true;

	}

	drawDefault( g, S ) {

		// stern, square-jawed teacher with a thick moustache and glasses
		g.fillStyle = '#b97c58';
		g.beginPath();
		g.ellipse( S / 2, S * 0.62, S * 0.3, S * 0.2, 0, 0, Math.PI * 2 );
		g.fill();
		// brows
		g.fillStyle = '#3a2a20';
		g.save();
		g.translate( S * 0.36, S * 0.37 );
		g.rotate( 0.18 );
		g.fillRect( - 45, - 9, 90, 20 );
		g.restore();
		g.save();
		g.translate( S * 0.64, S * 0.37 );
		g.rotate( - 0.18 );
		g.fillRect( - 45, - 9, 90, 20 );
		g.restore();
		// eyes
		[ 0.36, 0.64 ].forEach( x => {

			g.fillStyle = '#f4efe6';
			g.beginPath();
			g.ellipse( S * x, S * 0.45, 30, 17, 0, 0, Math.PI * 2 );
			g.fill();
			g.fillStyle = '#2a1a10';
			g.beginPath();
			g.arc( S * x + ( x < 0.5 ? 6 : - 6 ), S * 0.455, 11, 0, Math.PI * 2 );
			g.fill();
			// glasses
			g.strokeStyle = '#1c1c1c';
			g.lineWidth = 7;
			g.strokeRect( S * x - 50, S * 0.4, 100, 62 );

		} );
		g.beginPath();
		g.moveTo( S * 0.46, S * 0.43 );
		g.lineTo( S * 0.54, S * 0.43 );
		g.stroke();
		// nose
		g.fillStyle = '#a86a48';
		g.beginPath();
		g.moveTo( S * 0.5, S * 0.47 );
		g.lineTo( S * 0.45, S * 0.6 );
		g.lineTo( S * 0.55, S * 0.6 );
		g.fill();
		// moustache
		g.fillStyle = '#3a2a20';
		g.beginPath();
		g.moveTo( S * 0.32, S * 0.69 );
		g.quadraticCurveTo( S * 0.5, S * 0.58, S * 0.68, S * 0.69 );
		g.quadraticCurveTo( S * 0.5, S * 0.66, S * 0.32, S * 0.69 );
		g.fill();
		// mouth
		g.strokeStyle = '#6e3a2a';
		g.lineWidth = 6;
		g.beginPath();
		g.moveTo( S * 0.42, S * 0.75 );
		g.lineTo( S * 0.58, S * 0.75 );
		g.stroke();
		// stubble
		g.fillStyle = 'rgba(40,30,25,0.25)';
		for ( let i = 0; i < 1200; i ++ ) {

			const a = Math.random() * Math.PI, r = Math.random() * S * 0.28;
			g.fillRect( S / 2 + Math.cos( a ) * r, S * 0.62 + Math.sin( a ) * r * 0.7, 2, 2 );

		}

	}

	drawInjuries( g, S ) {

		const n = this.injuries;
		if ( n >= 1 ) {

			bruise( g, S * 0.36, S * 0.45, S * 0.11, 'eye' ); // black eye

		}

		if ( n >= 2 ) {

			scar( g, S * 0.6, S * 0.22, S * 0.75, S * 0.42 ); // forehead gash
			bruise( g, S * 0.68, S * 0.62, S * 0.09 ); // cheek

		}

		if ( n >= 3 ) {

			bandage( g, S * 0.66, S * 0.3, - 0.6 );
			cut( g, S * 0.47, S * 0.79 ); // split lip
			bruise( g, S * 0.3, S * 0.66, S * 0.08 );

		}

		if ( n >= 4 ) {

			bruise( g, S * 0.64, S * 0.45, S * 0.11, 'eye' );
			scar( g, S * 0.22, S * 0.5, S * 0.34, S * 0.78 );
		}

	}

}

export class NinjaMask {

	constructor() {

		this.canvas = canvas( 512 );
		this.injuries = 0;
		this.texture = toTexture( this.canvas );
		this.draw();

	}

	setInjuries( n ) {

		this.injuries = n;
		this.draw();

	}

	draw() {

		const g = this.canvas.getContext( '2d' ), S = 512;
		g.fillStyle = '#1b213c';
		g.fillRect( 0, 0, S, S );
		// cloth folds
		for ( let i = 0; i < 30; i ++ ) {

			g.strokeStyle = `rgba(0,0,0,${ rand( 0.1, 0.3 ) })`;
			g.lineWidth = rand( 2, 6 );
			g.beginPath();
			const y = rand( 300, 500 );
			g.moveTo( rand( 0, S ), y );
			g.quadraticCurveTo( S / 2, y + rand( - 30, 30 ), rand( 0, S ), y + rand( - 20, 20 ) );
			g.stroke();

		}

		// eye slit with skin
		g.fillStyle = '#c99573';
		g.beginPath();
		g.moveTo( S * 0.12, S * 0.42 );
		g.quadraticCurveTo( S * 0.5, S * 0.33, S * 0.88, S * 0.42 );
		g.lineTo( S * 0.86, S * 0.56 );
		g.quadraticCurveTo( S * 0.5, S * 0.6, S * 0.14, S * 0.56 );
		g.closePath();
		g.fill();
		// fierce eyes
		[ 0.34, 0.66 ].forEach( ( x, i ) => {

			g.fillStyle = '#fff';
			g.beginPath();
			g.moveTo( S * x - 52, S * 0.49 );
			g.quadraticCurveTo( S * x, S * ( 0.42 + ( i ? 0.0 : 0.0 ) ), S * x + 52, S * 0.47 + ( i ? - 8 : 8 ) );
			g.quadraticCurveTo( S * x, S * 0.55, S * x - 52, S * 0.49 );
			g.fill();
			g.fillStyle = '#2b1a0c';
			g.beginPath();
			g.arc( S * x + ( i ? - 8 : 8 ), S * 0.49, 15, 0, Math.PI * 2 );
			g.fill();
			g.fillStyle = '#fff';
			g.fillRect( S * x + ( i ? - 12 : 4 ), S * 0.475, 6, 6 );
			// brows
			g.fillStyle = '#120c08';
			g.save();
			g.translate( S * x, S * 0.41 );
			g.rotate( i ? - 0.32 : 0.32 );
			g.fillRect( - 55, - 8, 110, 16 );
			g.restore();

		} );

		const n = this.injuries;
		if ( n >= 1 ) {

			tear( g, S * 0.72, S * 0.7, 0.5 );
			bruise( g, S * 0.76, S * 0.69, S * 0.05 );

		}

		if ( n >= 2 ) {

			bruise( g, S * 0.34, S * 0.49, S * 0.09, 'eye' );
			scar( g, S * 0.58, S * 0.36, S * 0.74, S * 0.6 );

		}

		if ( n >= 3 ) {

			tear( g, S * 0.3, S * 0.75, - 0.4 );
			cut( g, S * 0.3, S * 0.75 );
			scar( g, S * 0.2, S * 0.2, S * 0.4, S * 0.3 );

		}

		if ( n >= 4 ) {

			bruise( g, S * 0.66, S * 0.49, S * 0.09, 'eye' );

		}

		this.texture.needsUpdate = true;

	}

}

// ---------- injury painting helpers ----------

function bruise( g, x, y, r, kind ) {

	const layers = kind === 'eye' ? [ [ 'rgba(70,20,70,0.75)', 1 ], [ 'rgba(40,40,110,0.6)', 0.75 ], [ 'rgba(150,150,40,0.25)', 1.35 ] ]
		: [ [ 'rgba(110,30,60,0.6)', 1 ], [ 'rgba(60,40,110,0.5)', 0.6 ], [ 'rgba(160,140,40,0.2)', 1.3 ] ];
	layers.forEach( ( [ col, s ] ) => {

		const gr = g.createRadialGradient( x, y, 0, x, y, r * s );
		gr.addColorStop( 0, col );
		gr.addColorStop( 1, 'rgba(0,0,0,0)' );
		g.fillStyle = gr;
		g.save();
		g.translate( x, y );
		g.scale( 1.3, 1 );
		g.translate( - x, - y );
		g.fillRect( x - r * 2, y - r * 2, r * 4, r * 4 );
		g.restore();

	} );

}

function scar( g, x1, y1, x2, y2 ) {

	g.lineCap = 'round';
	g.strokeStyle = 'rgba(120,10,20,0.9)';
	g.lineWidth = 9;
	g.beginPath();
	g.moveTo( x1, y1 );
	g.lineTo( x2, y2 );
	g.stroke();
	g.strokeStyle = 'rgba(220,90,90,0.9)';
	g.lineWidth = 3;
	g.stroke();
	// stitches
	g.strokeStyle = 'rgba(40,20,20,0.9)';
	g.lineWidth = 2.5;
	const n = 5, dx = x2 - x1, dy = y2 - y1, len = Math.hypot( dx, dy );
	const nx = - dy / len * 12, ny = dx / len * 12;
	for ( let i = 1; i < n; i ++ ) {

		const px = x1 + dx * i / n, py = y1 + dy * i / n;
		g.beginPath();
		g.moveTo( px - nx, py - ny );
		g.lineTo( px + nx, py + ny );
		g.stroke();

	}

}

function cut( g, x, y ) {

	g.fillStyle = 'rgba(150,10,20,0.9)';
	g.beginPath();
	g.ellipse( x, y, 14, 6, 0.4, 0, Math.PI * 2 );
	g.fill();
	g.fillStyle = 'rgba(150,10,20,0.7)';
	g.fillRect( x - 2, y, 4, 24 );

}

function bandage( g, x, y, rot ) {

	g.save();
	g.translate( x, y );
	g.rotate( rot );
	g.fillStyle = '#e8cfa6';
	g.fillRect( - 70, - 16, 140, 32 );
	g.fillStyle = '#f3e4c8';
	g.fillRect( - 22, - 14, 44, 28 );
	g.fillStyle = 'rgba(160,40,40,0.5)';
	g.beginPath();
	g.arc( 0, 0, 9, 0, Math.PI * 2 );
	g.fill();
	g.fillStyle = 'rgba(0,0,0,0.25)';
	for ( let i = - 60; i < 60; i += 9 ) {

		g.fillRect( i, - 12, 2, 2 );
		g.fillRect( i, 10, 2, 2 );

	}

	g.restore();

}

function tear( g, x, y, rot ) {

	g.save();
	g.translate( x, y );
	g.rotate( rot );
	g.fillStyle = '#c99573';
	g.beginPath();
	g.moveTo( - 50, 0 );
	for ( let i = - 50; i <= 50; i += 10 ) g.lineTo( i, - rand( 6, 18 ) );
	for ( let i = 50; i >= - 50; i -= 10 ) g.lineTo( i, rand( 6, 18 ) );
	g.fill();
	g.restore();

}

// Decal textures applied to body parts on hits.
export function decalTexture( kind ) {

	const c = canvas( 256 ), g = c.getContext( '2d' );
	if ( kind === 'bruise' ) {

		bruise( g, 128, 128, 70 );
		bruise( g, 100, 150, 36 );

	} else if ( kind === 'scar' ) {

		scar( g, 40, 70, 210, 190 );
		bruise( g, 128, 128, 40 );

	} else if ( kind === 'claw' ) {

		for ( let i = 0; i < 3; i ++ ) {

			g.lineCap = 'round';
			g.strokeStyle = 'rgba(130,10,20,0.85)';
			g.lineWidth = 10;
			g.beginPath();
			g.moveTo( 50 + i * 50, 30 );
			g.quadraticCurveTo( 80 + i * 50, 128, 70 + i * 50, 226 );
			g.stroke();
			g.strokeStyle = 'rgba(230,110,110,0.8)';
			g.lineWidth = 3;
			g.stroke();

		}

	} else if ( kind === 'tear' ) {

		// torn cloth showing bruised skin
		g.save();
		g.beginPath();
		g.moveTo( 30, 128 );
		for ( let i = 30; i <= 226; i += 14 ) g.lineTo( i, 128 - rand( 30, 70 ) );
		for ( let i = 226; i >= 30; i -= 14 ) g.lineTo( i, 128 + rand( 30, 70 ) );
		g.closePath();
		g.fillStyle = '#c99573';
		g.fill();
		g.clip();
		bruise( g, 128, 128, 60 );
		scar( g, 70, 100, 190, 160 );
		g.restore();

	}

	const tex = toTexture( c );
	return tex;

}

// ---------- props ----------

export function rulerTexture() {

	const c = canvas( 1024, 128 ), g = c.getContext( '2d' );
	const gr = g.createLinearGradient( 0, 0, 0, 128 );
	gr.addColorStop( 0, '#e2b56a' );
	gr.addColorStop( 1, '#b98340' );
	g.fillStyle = gr;
	g.fillRect( 0, 0, 1024, 128 );
	for ( let i = 0; i < 1024; i += 8 ) {

		g.fillStyle = 'rgba(80,50,20,0.15)';
		g.fillRect( i + rand( 0, 6 ), 0, 1, 128 );

	}

	g.fillStyle = '#2a1a0a';
	g.font = 'bold 28px sans-serif';
	for ( let i = 0; i <= 100; i ++ ) {

		const x = 20 + i * 9.8;
		const h = i % 10 === 0 ? 50 : i % 5 === 0 ? 34 : 20;
		g.fillRect( x, 0, 2, h );
		if ( i % 10 === 0 ) g.fillText( String( i / 10 ), x + 4, 84 );

	}

	return toTexture( c );

}

export function bookTexture( title = '∑ π √' ) {

	const c = canvas( 256, 360 ), g = c.getContext( '2d' );
	g.fillStyle = '#8c1d22';
	g.fillRect( 0, 0, 256, 360 );
	g.fillStyle = '#d9b44a';
	g.fillRect( 18, 18, 220, 6 );
	g.fillRect( 18, 336, 220, 6 );
	g.font = 'bold 64px serif';
	g.textAlign = 'center';
	g.fillText( title, 128, 190 );
	g.font = 'bold 26px serif';
	g.fillText( 'VOL. IX', 128, 250 );
	speckle( g, 256, 360, 1500, '#000', 2, 0.25 );
	return toTexture( c );

}

export function bannerTexture( glyph, color = '#c0262d' ) {

	const c = canvas( 256, 768 ), g = c.getContext( '2d' );
	g.fillStyle = '#efe7d4';
	g.fillRect( 0, 0, 256, 768 );
	g.fillStyle = color;
	g.fillRect( 0, 0, 256, 60 );
	g.fillRect( 0, 708, 256, 60 );
	g.beginPath();
	g.arc( 128, 200, 80, 0, Math.PI * 2 );
	g.fill();
	g.fillStyle = '#1a1a22';
	g.font = 'bold 150px "Noto Serif JP", "Yu Mincho", serif';
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	[ ...glyph ].forEach( ( ch, i ) => g.fillText( ch, 128, 420 + i * 170 ) );
	speckle( g, 256, 768, 2000, '#7a6a50', 2, 0.15 );
	return toTexture( c );

}

export function stoneTexture() {

	const c = canvas( 512 ), g = c.getContext( '2d' );
	g.fillStyle = '#6f6a62';
	g.fillRect( 0, 0, 512, 512 );
	const size = 128;
	for ( let y = 0; y < 512; y += size ) {

		const off = ( y / size ) % 2 ? size / 2 : 0;
		for ( let x = - size; x < 512 + size; x += size ) {

			const l = 90 + Math.random() * 30;
			g.fillStyle = `rgb(${ l + 8 },${ l + 3 },${ l - 4 })`;
			g.fillRect( x + off + 3, y + 3, size - 6, size - 6 );

		}

	}

	speckle( g, 512, 512, 9000, '#2a2620', 2, 0.3 );
	speckle( g, 512, 512, 4000, '#d8d0c0', 1, 0.2 );
	// moss in cracks
	g.fillStyle = 'rgba(80,100,40,0.35)';
	for ( let i = 0; i < 300; i ++ ) g.fillRect( Math.floor( Math.random() * 4 ) * size + rand( - 3, 3 ), Math.random() * 512, 4, 6 );
	return toTexture( c, { repeat: [ 4, 2 ] } );

}

export function groundTexture() {

	const c = canvas( 512 ), g = c.getContext( '2d' );
	g.fillStyle = '#5b4a2e';
	g.fillRect( 0, 0, 512, 512 );
	speckle( g, 512, 512, 12000, '#2c2214', 3, 0.4 );
	speckle( g, 512, 512, 8000, '#8a7344', 2, 0.35 );
	// grass tufts
	g.fillStyle = 'rgba(110,120,50,0.5)';
	for ( let i = 0; i < 1500; i ++ ) g.fillRect( Math.random() * 512, Math.random() * 512, 2, 5 );
	return toTexture( c, { repeat: [ 24, 24 ] } );

}

export function softDot() {

	const c = canvas( 64 ), g = c.getContext( '2d' );
	const gr = g.createRadialGradient( 32, 32, 0, 32, 32, 32 );
	gr.addColorStop( 0, 'rgba(255,255,255,1)' );
	gr.addColorStop( 0.4, 'rgba(255,255,255,0.5)' );
	gr.addColorStop( 1, 'rgba(255,255,255,0)' );
	g.fillStyle = gr;
	g.fillRect( 0, 0, 64, 64 );
	return toTexture( c, { srgb: false } );

}

export function smokeTexture() {

	const c = canvas( 128 ), g = c.getContext( '2d' );
	for ( let i = 0; i < 14; i ++ ) {

		const x = rand( 34, 94 ), y = rand( 34, 94 ), r = rand( 18, 34 );
		const gr = g.createRadialGradient( x, y, 0, x, y, r );
		gr.addColorStop( 0, 'rgba(255,255,255,0.35)' );
		gr.addColorStop( 1, 'rgba(255,255,255,0)' );
		g.fillStyle = gr;
		g.fillRect( 0, 0, 128, 128 );

	}

	return toTexture( c, { srgb: false } );

}

export function arcTexture( color = '255,255,255' ) {

	// horizontal gradient along the arc length; radial edge falloff
	const c = canvas( 256, 64 ), g = c.getContext( '2d' );
	const gr = g.createLinearGradient( 0, 0, 256, 0 );
	gr.addColorStop( 0, `rgba(${ color },0)` );
	gr.addColorStop( 0.7, `rgba(${ color },0.6)` );
	gr.addColorStop( 1, `rgba(${ color },1)` );
	g.fillStyle = gr;
	g.fillRect( 0, 0, 256, 64 );
	const v = g.createLinearGradient( 0, 0, 0, 64 );
	v.addColorStop( 0, 'rgba(0,0,0,1)' );
	v.addColorStop( 0.5, 'rgba(0,0,0,0)' );
	v.addColorStop( 1, 'rgba(0,0,0,1)' );
	g.globalCompositeOperation = 'destination-out';
	g.fillStyle = v;
	g.fillRect( 0, 0, 256, 64 );
	return toTexture( c, { srgb: false } );

}
