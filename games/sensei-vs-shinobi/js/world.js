import * as THREE from 'three';
import { stoneTexture, groundTexture, bannerTexture, softDot } from './textures.js';

export const wind = { strength: 0.6, gust: 0, dir: new THREE.Vector3( 1, 0, 0.25 ).normalize(), time: 0 };

const MAPLE = [ 0xc0262d, 0xd8432a, 0xef7b2d, 0xe3a23a, 0xa31d24, 0xf0b440 ];

function hash( n ) {

	const x = Math.sin( n * 127.1 ) * 43758.5453;
	return x - Math.floor( x );

}

function noise1( x ) {

	const i = Math.floor( x ), f = x - i;
	const u = f * f * ( 3 - 2 * f );
	return hash( i ) * ( 1 - u ) + hash( i + 1 ) * u;

}

export class World {

	constructor( scene ) {

		this.scene = scene;
		this.swayers = [];
		this.banners = [];
		this.clouds = [];
		this.build();

	}

	build() {

		const s = this.scene;
		s.fog = new THREE.Fog( 0xe9b38c, 90, 760 );

		this.buildSky();
		this.buildLights();
		this.buildFuji();
		this.buildHills();
		this.buildLake();
		this.buildGround();
		this.buildArena();
		this.buildTorii( new THREE.Vector3( 2.5, 0, - 27 ), 1.2 );
		this.buildPagoda( new THREE.Vector3( - 26, 4.5, - 46 ) );
		this.buildTrees();
		this.buildLanterns();
		this.buildBanners();
		this.buildClouds();
		this.buildLeaves();

	}

	buildSky() {

		const geo = new THREE.SphereGeometry( 900, 32, 16 );
		const mat = new THREE.ShaderMaterial( {
			side: THREE.BackSide,
			depthWrite: false,
			fog: false,
			uniforms: {
				top: { value: new THREE.Color( 0x34467a ) },
				mid: { value: new THREE.Color( 0xd98a6a ) },
				horizon: { value: new THREE.Color( 0xf6c78e ) },
				sunDir: { value: new THREE.Vector3( - 0.75, 0.16, - 0.65 ).normalize() },
			},
			vertexShader: /* glsl */`
				varying vec3 vDir;
				void main() {
					vDir = normalize( position );
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
			fragmentShader: /* glsl */`
				uniform vec3 top, mid, horizon, sunDir;
				varying vec3 vDir;
				void main() {
					float h = clamp( vDir.y, -0.2, 1.0 );
					vec3 c = mix( horizon, mid, smoothstep( 0.0, 0.18, h ) );
					c = mix( c, top, smoothstep( 0.15, 0.7, h ) );
					float sd = max( dot( normalize( vDir ), sunDir ), 0.0 );
					c += vec3( 1.0, 0.75, 0.45 ) * pow( sd, 12.0 ) * 0.55;
					c += vec3( 1.0, 0.9, 0.7 ) * pow( sd, 600.0 ) * 2.5;
					gl_FragColor = vec4( c, 1.0 );
					#include <colorspace_fragment>
				}`
		} );
		this.sky = new THREE.Mesh( geo, mat );
		this.scene.add( this.sky );

	}

	buildLights() {

		const hemi = new THREE.HemisphereLight( 0xbfc8ff, 0x6b4a2a, 1.1 );
		this.scene.add( hemi );
		const sun = new THREE.DirectionalLight( 0xffc890, 3.0 );
		sun.position.set( - 12, 14, 8 );
		sun.castShadow = true;
		sun.shadow.mapSize.set( 2048, 2048 );
		const cam = sun.shadow.camera;
		cam.left = - 10; cam.right = 10; cam.top = 8; cam.bottom = - 6;
		cam.near = 1; cam.far = 50;
		sun.shadow.bias = - 0.0005;
		sun.shadow.normalBias = 0.03;
		this.scene.add( sun );
		this.sun = sun;
		const rim = new THREE.DirectionalLight( 0xff9a6a, 1.4 );
		rim.position.set( 6, 5, - 10 );
		this.scene.add( rim );
		const fill = new THREE.DirectionalLight( 0x9fb4ff, 0.5 );
		fill.position.set( 4, 3, 10 );
		this.scene.add( fill );

	}

	buildFuji() {

		// Concave stratovolcano profile with a flattened crater rim.
		const pts = [];
		const H = 1, R = 3.6;
		for ( let i = 0; i <= 40; i ++ ) {

			const k = i / 40; // 0 at summit, 1 at base
			const r = 0.16 + ( R - 0.16 ) * Math.pow( k, 1.9 );
			const y = H * ( 1 - k );
			pts.push( new THREE.Vector2( r, y ) );

		}

		pts.unshift( new THREE.Vector2( 0.12, H - 0.015 ) );
		pts.unshift( new THREE.Vector2( 0.0, H - 0.03 ) );
		const geo = new THREE.LatheGeometry( pts, 160 );
		geo.computeVertexNormals();
		const pos = geo.attributes.position;
		const colors = [];
		const c = new THREE.Color();
		const snow = new THREE.Color( 0xfbf8ff ), snowShade = new THREE.Color( 0xc3c9ea );
		const rock = new THREE.Color( 0x3c4a7c ), rockLow = new THREE.Color( 0x2c3762 ), forest = new THREE.Color( 0x34394a );
		for ( let i = 0; i < pos.count; i ++ ) {

			const x = pos.getX( i ), y = pos.getY( i ), z = pos.getZ( i );
			const a = Math.atan2( z, x );
			// radial gullies
			const g = Math.pow( Math.abs( Math.sin( a * 18 + noise1( a * 7 ) * 3 ) ), 6 );
			const r = Math.hypot( x, z );
			const k = 1 - y;
			if ( r > 0.2 ) {

				const s = 1 - g * 0.035 * Math.min( 1, k * 4 );
				pos.setX( i, x * s );
				pos.setZ( i, z * s );

			}

			const line = 0.62 + noise1( a * 9 ) * 0.1 + g * 0.18 * Math.sin( a * 3.0 + 1.0 ) + Math.sin( a * 31 ) * 0.02;
			if ( y > line ) {

				c.copy( snow ).lerp( snowShade, g * 0.7 + ( a > 0 ? 0.2 : 0 ) );

			} else if ( y > 0.2 ) {

				c.copy( rock ).lerp( rockLow, 1 - ( y - 0.2 ) / 0.5 );
				c.lerp( snow, g * Math.max( 0, y - line + 0.08 ) * 6 );

			} else {

				c.copy( rockLow ).lerp( forest, ( 0.2 - y ) * 5 );

			}

			colors.push( c.r, c.g, c.b );

		}

		geo.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		geo.computeVertexNormals();
		// distant mountain: own atmospheric tint instead of scene fog so it stays crisp
		const haze = new THREE.Color( 0xb8a6c8 );
		const col = geo.attributes.color;
		for ( let i = 0; i < col.count; i ++ ) {

			c.setRGB( col.getX( i ), col.getY( i ), col.getZ( i ) ).lerp( haze, 0.18 );
			col.setXYZ( i, c.r, c.g, c.b );

		}

		const mat = new THREE.MeshLambertMaterial( { vertexColors: true, fog: false, emissive: 0x1a1830 } );
		const fuji = new THREE.Mesh( geo, mat );
		fuji.scale.set( 70, 84, 70 );
		fuji.position.set( 8, - 6, - 300 );
		this.scene.add( fuji );
		this.fuji = fuji;

	}

	buildHills() {

		const layers = [
			{ z: - 170, color: 0x6a5a7a, amp: 14, base: 4, seed: 1 },
			{ z: - 110, color: 0x5c4a52, amp: 6, base: 0, seed: 2 },
			{ z: - 70, color: 0x7a3d2c, amp: 3.5, base: - 1.5, seed: 3, autumn: true },
		];
		layers.forEach( L => {

			const shape = new THREE.Shape();
			shape.moveTo( - 400, - 10 );
			for ( let x = - 400; x <= 400; x += 8 ) {

				const y = L.base + noise1( x * 0.02 + L.seed * 10 ) * L.amp + noise1( x * 0.07 + L.seed ) * L.amp * 0.3;
				shape.lineTo( x, y );

			}

			shape.lineTo( 400, - 10 );
			const geo = new THREE.ShapeGeometry( shape );
			const mat = new THREE.MeshLambertMaterial( { color: L.color } );
			const m = new THREE.Mesh( geo, mat );
			m.position.z = L.z;
			this.scene.add( m );
			if ( L.autumn ) {

				// tree-blob silhouettes along the near ridge
				const blob = new THREE.IcosahedronGeometry( 1, 0 );
				const inst = new THREE.InstancedMesh( blob, new THREE.MeshLambertMaterial(), 260 );
				const d = new THREE.Object3D();
				const col = new THREE.Color();
				for ( let i = 0; i < 260; i ++ ) {

					const x = - 200 + Math.random() * 400;
					const y = L.base + noise1( x * 0.02 + L.seed * 10 ) * L.amp + noise1( x * 0.07 + L.seed ) * L.amp * 0.3;
					d.position.set( x, y - 0.5, L.z + 1 + Math.random() * 4 );
					d.scale.setScalar( 1.2 + Math.random() * 1.6 );
					d.rotation.set( Math.random(), Math.random(), 0 );
					d.updateMatrix();
					inst.setMatrixAt( i, d.matrix );
					inst.setColorAt( i, col.setHex( MAPLE[ i % MAPLE.length ] ).multiplyScalar( 0.6 ) );

				}

				this.scene.add( inst );

			}

		} );

	}

	buildLake() {

		const geo = new THREE.PlaneGeometry( 600, 160 );
		const mat = new THREE.MeshStandardMaterial( { color: 0x5a6f9e, roughness: 0.15, metalness: 0.6 } );
		const lake = new THREE.Mesh( geo, mat );
		lake.rotation.x = - Math.PI / 2;
		lake.position.set( 0, - 1.0, - 150 );
		this.scene.add( lake );
		// sparkle strip reflecting the sun
		const sp = new THREE.Mesh( new THREE.PlaneGeometry( 30, 120 ), new THREE.MeshBasicMaterial( { color: 0xffd9a8, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false } ) );
		sp.rotation.x = - Math.PI / 2;
		sp.position.set( - 60, - 0.95, - 150 );
		this.scene.add( sp );
		this.lakeSparkle = sp;

	}

	buildGround() {

		const geo = new THREE.PlaneGeometry( 300, 300, 1, 1 );
		const mat = new THREE.MeshStandardMaterial( { map: groundTexture(), roughness: 1 } );
		const g = new THREE.Mesh( geo, mat );
		g.rotation.x = - Math.PI / 2;
		g.position.set( 0, - 0.02, 60 );
		g.receiveShadow = true;
		this.scene.add( g );
		// cliff edge between courtyard and lake
		const cliff = new THREE.Mesh( new THREE.BoxGeometry( 300, 3, 4 ), new THREE.MeshLambertMaterial( { color: 0x4a3b2a } ) );
		cliff.position.set( 0, - 1.5, - 90 );
		this.scene.add( cliff );

	}

	buildArena() {

		const tex = stoneTexture();
		const plat = new THREE.Mesh( new THREE.BoxGeometry( 16, 0.3, 7, 1, 1, 1 ), new THREE.MeshStandardMaterial( { map: tex, roughness: 0.95 } ) );
		plat.position.y = - 0.15;
		plat.receiveShadow = true;
		this.scene.add( plat );
		// steps
		for ( let i = 1; i <= 2; i ++ ) {

			const step = new THREE.Mesh( new THREE.BoxGeometry( 16 + i * 1.2, 0.3, 7 + i * 1.2 ), new THREE.MeshStandardMaterial( { color: 0x5f5850, roughness: 1 } ) );
			step.position.y = - 0.15 - i * 0.3;
			step.receiveShadow = true;
			this.scene.add( step );

		}

		// fallen leaves on the stones
		const leafGeo = leafGeometry();
		const n = 700;
		const inst = new THREE.InstancedMesh( leafGeo, new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } ), n );
		const d = new THREE.Object3D();
		const col = new THREE.Color();
		for ( let i = 0; i < n; i ++ ) {

			const onPlat = i < 260;
			const x = onPlat ? ( Math.random() - 0.5 ) * 16 : ( Math.random() - 0.5 ) * 40;
			const z = onPlat ? ( Math.random() - 0.5 ) * 7 : ( Math.random() < 0.5 ? - 1 : 1 ) * ( 4 + Math.random() * 10 );
			d.position.set( x, onPlat ? 0.012 : - 0.6 + 0.012, z );
			if ( ! onPlat ) d.position.y = 0;
			d.rotation.set( - Math.PI / 2, 0, Math.random() * 6.28 );
			d.scale.setScalar( 0.6 + Math.random() * 0.6 );
			d.updateMatrix();
			inst.setMatrixAt( i, d.matrix );
			inst.setColorAt( i, col.setHex( MAPLE[ Math.floor( Math.random() * MAPLE.length ) ] ).multiplyScalar( 0.75 + Math.random() * 0.3 ) );

		}

		inst.receiveShadow = true;
		this.scene.add( inst );

	}

	buildTorii( pos, s ) {

		const red = new THREE.MeshStandardMaterial( { color: 0xc8361f, roughness: 0.6 } );
		const black = new THREE.MeshStandardMaterial( { color: 0x1b1714, roughness: 0.7 } );
		const g = new THREE.Group();
		[ - 2.6, 2.6 ].forEach( x => {

			const p = new THREE.Mesh( new THREE.CylinderGeometry( 0.22, 0.26, 6, 16 ), red );
			p.position.set( x, 3, 0 );
			p.castShadow = true;
			g.add( p );
			const base = new THREE.Mesh( new THREE.CylinderGeometry( 0.3, 0.3, 0.5, 16 ), black );
			base.position.set( x, 0.25, 0 );
			g.add( base );

		} );
		const kasagi = new THREE.Mesh( new THREE.BoxGeometry( 7.4, 0.35, 0.6 ), black );
		kasagi.position.y = 6.2;
		g.add( kasagi );
		const shimaki = new THREE.Mesh( new THREE.BoxGeometry( 7.0, 0.3, 0.5 ), red );
		shimaki.position.y = 5.9;
		g.add( shimaki );
		const nuki = new THREE.Mesh( new THREE.BoxGeometry( 6.4, 0.25, 0.3 ), red );
		nuki.position.y = 5.0;
		g.add( nuki );
		const gakuzuka = new THREE.Mesh( new THREE.BoxGeometry( 0.3, 0.9, 0.25 ), red );
		gakuzuka.position.y = 5.45;
		g.add( gakuzuka );
		// upturned ends
		[ - 1, 1 ].forEach( sgn => {

			const tip = new THREE.Mesh( new THREE.BoxGeometry( 0.8, 0.3, 0.6 ), black );
			tip.position.set( sgn * 3.9, 6.32, 0 );
			tip.rotation.z = sgn * 0.25;
			g.add( tip );

		} );
		g.position.copy( pos );
		g.scale.setScalar( s );
		this.scene.add( g );

	}

	buildPagoda( pos ) {

		const g = new THREE.Group();
		const wall = new THREE.MeshStandardMaterial( { color: 0xb5341f, roughness: 0.7 } );
		const roof = new THREE.MeshStandardMaterial( { color: 0x2a2b33, roughness: 0.6 } );
		const white = new THREE.MeshStandardMaterial( { color: 0xe8e0d0, roughness: 0.9 } );
		let y = 0;
		for ( let i = 0; i < 5; i ++ ) {

			const w = 3.2 - i * 0.38;
			const body = new THREE.Mesh( new THREE.BoxGeometry( w, 1.4, w ), i % 2 ? wall : white );
			body.position.y = y + 0.7;
			g.add( body );
			const r = new THREE.Mesh( new THREE.ConeGeometry( w * 1.05, 0.9, 4, 1, true ), roof );
			r.rotation.y = Math.PI / 4;
			r.position.y = y + 1.7;
			r.scale.set( 1, 1, 1 );
			g.add( r );
			const eave = new THREE.Mesh( new THREE.BoxGeometry( w * 1.5, 0.12, w * 1.5 ), roof );
			eave.position.y = y + 1.3;
			g.add( eave );
			y += 1.8;

		}

		const spire = new THREE.Mesh( new THREE.CylinderGeometry( 0.06, 0.1, 3, 8 ), new THREE.MeshStandardMaterial( { color: 0xc9a54a, metalness: 0.8, roughness: 0.3 } ) );
		spire.position.y = y + 1.2;
		g.add( spire );
		for ( let i = 0; i < 6; i ++ ) {

			const ring = new THREE.Mesh( new THREE.TorusGeometry( 0.18, 0.04, 6, 12 ), spire.material );
			ring.rotation.x = Math.PI / 2;
			ring.position.y = y + 0.3 + i * 0.35;
			g.add( ring );

		}

		g.position.copy( pos );
		g.scale.setScalar( 1.6 );
		this.scene.add( g );
		// hill under it
		const hill = new THREE.Mesh( new THREE.SphereGeometry( 18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2 ), new THREE.MeshLambertMaterial( { color: 0x5a3a26 } ) );
		hill.scale.y = 0.3;
		hill.position.set( pos.x, - 1, pos.z );
		this.scene.add( hill );
		for ( let i = 0; i < 26; i ++ ) {

			const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 12;
			this.addTree( new THREE.Vector3( pos.x + Math.cos( a ) * r, 3.5 - r * 0.16, pos.z + Math.sin( a ) * r ), 0.9 + Math.random() * 0.8, Math.random() < 0.2 );

		}

	}

	addTree( pos, scale = 1, pine = false ) {

		const tree = new THREE.Group();
		const trunkMat = new THREE.MeshStandardMaterial( { color: 0x3b2a1e, roughness: 1 } );
		const trunk = new THREE.Mesh( new THREE.CylinderGeometry( 0.12, 0.22, 2.6, 7 ), trunkMat );
		trunk.position.y = 1.3;
		trunk.rotation.z = ( Math.random() - 0.5 ) * 0.2;
		trunk.castShadow = true;
		tree.add( trunk );
		const crown = new THREE.Group();
		crown.position.y = 2.4;
		tree.add( crown );
		const blobs = pine ? 4 : 9;
		for ( let i = 0; i < blobs; i ++ ) {

			const col = pine ? 0x2f4a32 : MAPLE[ Math.floor( Math.random() * MAPLE.length ) ];
			const m = new THREE.Mesh( new THREE.IcosahedronGeometry( pine ? 0.9 : 0.8 + Math.random() * 0.5, 1 ), new THREE.MeshStandardMaterial( { color: col, roughness: 0.9, flatShading: true } ) );
			if ( pine ) {

				m.position.set( ( Math.random() - 0.5 ) * 0.6, i * 0.55, 0 );
				m.scale.set( 1.8 - i * 0.3, 0.5, 1.4 - i * 0.2 );

			} else {

				m.position.set( ( Math.random() - 0.5 ) * 2.2, Math.random() * 1.4, ( Math.random() - 0.5 ) * 2.0 );

			}

			m.castShadow = true;
			crown.add( m );

		}

		tree.position.copy( pos );
		tree.scale.setScalar( scale );
		this.scene.add( tree );
		this.swayers.push( { obj: crown, phase: Math.random() * 6.28, amp: pine ? 0.02 : 0.05 } );
		return tree;

	}

	buildTrees() {

		// two groves flanking a clear corridor toward Mount Fuji
		const spots = [
			[ - 12, - 3, 1.5 ], [ - 14.5, 1, 1.3 ], [ 12.5, - 3, 1.6 ], [ 15, 1, 1.2 ], [ - 19, - 8, 1.6 ],
			[ 20, - 9, 1.6 ], [ - 25, - 4, 1.8 ], [ 26, - 5, 1.9 ], [ - 32, - 16, 1.6 ], [ 33, - 17, 1.5 ],
			[ - 15, 6, 1.2 ], [ 16, 5, 1.3 ], [ - 40, - 30, 2 ], [ 42, - 30, 2 ],
		];
		spots.forEach( ( [ x, z, s ], i ) => this.addTree( new THREE.Vector3( x, 0, z ), s, i % 6 === 5 ) );

	}

	buildLanterns() {

		const stone = new THREE.MeshStandardMaterial( { color: 0x8a857c, roughness: 1 } );
		const glow = new THREE.MeshBasicMaterial( { color: 0xffc27a } );
		[ [ - 8.6, - 3 ], [ 8.6, - 3 ], [ - 8.6, 3 ], [ 8.6, 3 ] ].forEach( ( [ x, z ] ) => {

			const g = new THREE.Group();
			const parts = [
				[ new THREE.CylinderGeometry( 0.5, 0.6, 0.25, 6 ), 0.12 ],
				[ new THREE.CylinderGeometry( 0.15, 0.2, 1.0, 8 ), 0.75 ],
				[ new THREE.CylinderGeometry( 0.45, 0.35, 0.2, 6 ), 1.3 ],
			];
			parts.forEach( ( [ geo, y ] ) => {

				const m = new THREE.Mesh( geo, stone );
				m.position.y = y;
				m.castShadow = true;
				g.add( m );

			} );
			const box = new THREE.Mesh( new THREE.BoxGeometry( 0.5, 0.45, 0.5 ), glow );
			box.position.y = 1.62;
			g.add( box );
			const roofM = new THREE.Mesh( new THREE.ConeGeometry( 0.62, 0.45, 6 ), stone );
			roofM.position.y = 2.05;
			g.add( roofM );
			const light = new THREE.PointLight( 0xffa860, 1.2, 4 );
			light.position.y = 1.62;
			g.add( light );
			g.position.set( x, 0, z );
			this.scene.add( g );

		} );

	}

	buildBanners() {

		const glyphs = [ [ '先生', 0x1a2240 ], [ '忍者', 0xc0262d ], [ '学', 0x1a2240 ], [ '武', 0xc0262d ] ];
		const spots = [ [ - 7.2, - 3.9 ], [ 7.2, - 3.9 ], [ - 11.5, - 4.5 ], [ 11.5, - 4.5 ] ];
		spots.forEach( ( [ x, z ], i ) => {

			const pole = new THREE.Mesh( new THREE.CylinderGeometry( 0.05, 0.05, 5.2, 6 ), new THREE.MeshStandardMaterial( { color: 0x2b2018 } ) );
			pole.position.set( x, 2.6, z );
			pole.castShadow = true;
			this.scene.add( pole );
			const [ glyph, col ] = glyphs[ i ];
			const geo = new THREE.PlaneGeometry( 0.9, 3.4, 10, 16 );
			geo.translate( 0.45, - 1.7, 0 );
			const mat = new THREE.MeshStandardMaterial( { map: bannerTexture( glyph, '#' + new THREE.Color( col ).getHexString() ), side: THREE.DoubleSide, roughness: 0.9 } );
			const flag = new THREE.Mesh( geo, mat );
			flag.position.set( x + 0.05, 5.0, z );
			flag.castShadow = true;
			this.scene.add( flag );
			const rest = geo.attributes.position.array.slice();
			this.banners.push( { mesh: flag, rest, phase: i * 1.7 } );

		} );

	}

	buildClouds() {

		const tex = softDot();
		for ( let i = 0; i < 26; i ++ ) {

			const mat = new THREE.SpriteMaterial( { map: tex, color: i % 3 ? 0xffe2c8 : 0xf6b89a, transparent: true, opacity: 0.55, depthWrite: false, fog: false } );
			const sp = new THREE.Sprite( mat );
			sp.scale.set( 60 + Math.random() * 80, 14 + Math.random() * 12, 1 );
			sp.position.set( - 400 + Math.random() * 800, 60 + Math.random() * 90, - 250 - Math.random() * 250 );
			this.scene.add( sp );
			this.clouds.push( sp );

		}

		// a lenticular cap cloud hugging Fuji's summit
		const cap = new THREE.Sprite( new THREE.SpriteMaterial( { map: tex, color: 0xfff1e6, transparent: true, opacity: 0.7, depthWrite: false, fog: false } ) );
		cap.scale.set( 70, 10, 1 );
		cap.position.set( 8, 80, - 296 );
		this.scene.add( cap );
		this.capCloud = cap;

	}

	buildLeaves() {

		const n = 420;
		const geo = leafGeometry();
		const mat = new THREE.MeshLambertMaterial( { side: THREE.DoubleSide } );
		const inst = new THREE.InstancedMesh( geo, mat, n );
		inst.frustumCulled = false;
		const col = new THREE.Color();
		this.leafData = [];
		for ( let i = 0; i < n; i ++ ) {

			this.leafData.push( this.spawnLeaf( {}, true ) );
			inst.setColorAt( i, col.setHex( MAPLE[ i % MAPLE.length ] ) );

		}

		this.scene.add( inst );
		this.leaves = inst;
		this._d = new THREE.Object3D();

	}

	spawnLeaf( L, initial ) {

		L.p = L.p || new THREE.Vector3();
		L.p.set( - 30 + Math.random() * 50, initial ? Math.random() * 14 : 10 + Math.random() * 6, - 14 + Math.random() * 22 );
		L.v = L.v || new THREE.Vector3();
		L.v.set( 0, - 0.5 - Math.random() * 0.5, 0 );
		L.r = L.r || new THREE.Euler();
		L.r.set( Math.random() * 6, Math.random() * 6, Math.random() * 6 );
		L.spin = new THREE.Vector3( Math.random() * 4 - 2, Math.random() * 4 - 2, Math.random() * 4 - 2 );
		L.s = 0.8 + Math.random() * 0.8;
		L.phase = Math.random() * 10;
		return L;

	}

	// Burst of leaves kicked up by an impact.
	kickLeaves( pos, count = 30, power = 4 ) {

		for ( let i = 0; i < count; i ++ ) {

			const L = this.leafData[ Math.floor( Math.random() * this.leafData.length ) ];
			L.p.copy( pos ).add( new THREE.Vector3( ( Math.random() - 0.5 ) * 1.5, 0.1, ( Math.random() - 0.5 ) * 1.5 ) );
			L.v.set( ( Math.random() - 0.5 ) * power, Math.random() * power + 1, ( Math.random() - 0.5 ) * power );

		}

	}

	gustBurst( v = 1 ) {

		wind.gust = Math.max( wind.gust, v );

	}

	update( dt, t ) {

		wind.time = t;
		const base = 0.5 + 0.35 * noise1( t * 0.15 ) + 0.3 * Math.max( 0, Math.sin( t * 0.33 ) ) ;
		wind.gust = Math.max( 0, wind.gust - dt * 0.6 );
		wind.strength = base + wind.gust;
		const w = wind.strength;

		for ( const s of this.swayers ) {

			s.obj.rotation.z = Math.sin( t * 1.3 + s.phase ) * s.amp * ( 0.5 + w ) - s.amp * w * 0.8;
			s.obj.rotation.x = Math.cos( t * 1.1 + s.phase ) * s.amp * 0.4 * w;

		}

		for ( const b of this.banners ) {

			const pos = b.mesh.geometry.attributes.position;
			const arr = pos.array, rest = b.rest;
			for ( let i = 0; i < arr.length; i += 3 ) {

				const x = rest[ i ], y = rest[ i + 1 ];
				const k = x / 0.9;
				arr[ i + 2 ] = Math.sin( t * ( 4 + w * 3 ) - x * 5 + y * 0.8 + b.phase ) * 0.18 * k * ( 0.4 + w );
				arr[ i ] = x * ( 1 - 0.05 * k * w );

			}

			pos.needsUpdate = true;
			b.mesh.geometry.computeVertexNormals();

		}

		for ( const c of this.clouds ) {

			c.position.x += dt * ( 2 + w * 4 );
			if ( c.position.x > 420 ) c.position.x = - 420;

		}

		if ( this.capCloud ) this.capCloud.material.opacity = 0.55 + Math.sin( t * 0.3 ) * 0.15;
		if ( this.lakeSparkle ) this.lakeSparkle.material.opacity = 0.18 + Math.sin( t * 2.1 ) * 0.05 + Math.sin( t * 5.3 ) * 0.03;

		// falling leaves
		const d = this._d;
		const wx = wind.dir.x * w * 3.2, wz = wind.dir.z * w * 3.2;
		for ( let i = 0; i < this.leafData.length; i ++ ) {

			const L = this.leafData[ i ];
			const flutter = Math.sin( t * 3 + L.phase ) * 0.8;
			L.v.x += ( wx + flutter - L.v.x ) * dt * 1.5;
			L.v.z += ( wz - L.v.z ) * dt * 1.5;
			L.v.y += ( - 0.7 + Math.cos( t * 2.3 + L.phase ) * 0.4 - L.v.y ) * dt * 1.2;
			L.p.addScaledVector( L.v, dt );
			L.r.x += L.spin.x * dt * ( 0.5 + w );
			L.r.y += L.spin.y * dt;
			L.r.z += L.spin.z * dt * ( 0.5 + w );
			if ( L.p.y < 0.02 || L.p.x > 30 || L.p.x < - 40 ) this.spawnLeaf( L, false );
			d.position.copy( L.p );
			d.rotation.copy( L.r );
			d.scale.setScalar( L.s );
			d.updateMatrix();
			this.leaves.setMatrixAt( i, d.matrix );

		}

		this.leaves.instanceMatrix.needsUpdate = true;

	}

}

let _leafGeo = null;
export function leafGeometry() {

	if ( _leafGeo ) return _leafGeo;
	// five-lobed, serrated maple leaf with a short stem
	const s = new THREE.Shape();
	const pts = [];
	const N = 90;
	for ( let i = 0; i <= N; i ++ ) {

		const th = - Math.PI * 0.86 + ( i / N ) * Math.PI * 1.72; // angle from +Y, notch at the stem
		const lobe = Math.pow( Math.abs( Math.cos( th * 2.5 ) ), 2.2 );
		const size = Math.abs( th ) > 2.0 ? 0.55 : Math.abs( th ) > 0.9 ? 0.92 : 1.0;
		const r = 0.1 * ( 0.42 + 0.58 * lobe * size + 0.05 * Math.abs( Math.sin( th * 18 ) ) );
		pts.push( [ Math.sin( th ) * r, Math.cos( th ) * r ] );

	}

	pts.push( [ 0.004, - 0.012 ], [ 0.003, - 0.05 ], [ - 0.003, - 0.05 ], [ - 0.004, - 0.012 ] );
	s.moveTo( pts[ 0 ][ 0 ], pts[ 0 ][ 1 ] );
	pts.slice( 1 ).forEach( p => s.lineTo( p[ 0 ], p[ 1 ] ) );
	_leafGeo = new THREE.ShapeGeometry( s );
	return _leafGeo;

}
