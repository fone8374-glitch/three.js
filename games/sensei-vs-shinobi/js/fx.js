import * as THREE from 'three';
import { softDot, smokeTexture, arcTexture } from './textures.js';
import { tween, ease } from './tween.js';
import { wind } from './world.js';

class Particles {

	constructor( scene, max, texture, blending ) {

		this.max = max;
		this.geo = new THREE.BufferGeometry();
		this.pos = new Float32Array( max * 3 );
		this.col = new Float32Array( max * 3 );
		this.size = new Float32Array( max );
		this.alpha = new Float32Array( max );
		this.rot = new Float32Array( max );
		this.geo.setAttribute( 'position', new THREE.BufferAttribute( this.pos, 3 ) );
		this.geo.setAttribute( 'color', new THREE.BufferAttribute( this.col, 3 ) );
		this.geo.setAttribute( 'size', new THREE.BufferAttribute( this.size, 1 ) );
		this.geo.setAttribute( 'alpha', new THREE.BufferAttribute( this.alpha, 1 ) );
		this.geo.setAttribute( 'rot', new THREE.BufferAttribute( this.rot, 1 ) );
		this.mat = new THREE.ShaderMaterial( {
			uniforms: { map: { value: texture }, scale: { value: 600 } },
			vertexShader: /* glsl */`
				attribute float size; attribute float alpha; attribute float rot; attribute vec3 color;
				varying float vA; varying vec3 vC; varying float vR;
				uniform float scale;
				void main() {
					vA = alpha; vC = color; vR = rot;
					vec4 mv = modelViewMatrix * vec4( position, 1.0 );
					gl_PointSize = size * scale / -mv.z;
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: /* glsl */`
				uniform sampler2D map; varying float vA; varying vec3 vC; varying float vR;
				void main() {
					vec2 p = gl_PointCoord - 0.5;
					float c = cos( vR ), s = sin( vR );
					p = mat2( c, -s, s, c ) * p + 0.5;
					vec4 t = texture2D( map, p );
					gl_FragColor = vec4( vC * t.rgb, t.a * vA );
					if ( gl_FragColor.a < 0.003 ) discard;
				}`,
			transparent: true,
			depthWrite: false,
			blending,
		} );
		this.points = new THREE.Points( this.geo, this.mat );
		this.points.frustumCulled = false;
		this.points.renderOrder = 5;
		scene.add( this.points );
		this.p = [];
		for ( let i = 0; i < max; i ++ ) this.p.push( { life: 0 } );
		this.cursor = 0;

	}

	emit( o ) {

		const p = this.p[ this.cursor ];
		this.cursor = ( this.cursor + 1 ) % this.max;
		p.life = p.max = o.life || 0.6;
		p.x = o.pos.x; p.y = o.pos.y; p.z = o.pos.z;
		p.vx = o.vel ? o.vel.x : 0; p.vy = o.vel ? o.vel.y : 0; p.vz = o.vel ? o.vel.z : 0;
		p.g = o.gravity ?? 0;
		p.drag = o.drag ?? 1;
		p.s0 = o.size || 0.2;
		p.s1 = o.sizeEnd ?? p.s0;
		p.a0 = o.alpha ?? 1;
		p.c = o.color || new THREE.Color( 1, 1, 1 );
		p.r = Math.random() * 6.28;
		p.vr = o.spin ?? ( Math.random() - 0.5 ) * 2;
		p.wind = o.wind ?? 0;

	}

	update( dt ) {

		const wx = wind.dir.x * wind.strength, wz = wind.dir.z * wind.strength;
		for ( let i = 0; i < this.max; i ++ ) {

			const p = this.p[ i ];
			if ( p.life > 0 ) {

				p.life -= dt;
				const k = 1 - Math.max( 0, p.life ) / p.max;
				const dr = Math.exp( - p.drag * dt );
				p.vx = p.vx * dr + wx * p.wind * dt;
				p.vz = p.vz * dr + wz * p.wind * dt;
				p.vy = p.vy * dr - p.g * dt;
				p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
				if ( p.y < 0.01 && p.g > 0 ) {

					p.y = 0.01;
					p.vy *= - 0.3;
					p.vx *= 0.6;
					p.vz *= 0.6;

				}

				p.r += p.vr * dt;
				this.pos[ i * 3 ] = p.x; this.pos[ i * 3 + 1 ] = p.y; this.pos[ i * 3 + 2 ] = p.z;
				this.col[ i * 3 ] = p.c.r; this.col[ i * 3 + 1 ] = p.c.g; this.col[ i * 3 + 2 ] = p.c.b;
				this.size[ i ] = p.s0 + ( p.s1 - p.s0 ) * k;
				this.alpha[ i ] = p.a0 * ( 1 - k ) * Math.min( 1, k * 12 + 0.2 );
				this.rot[ i ] = p.r;

			} else if ( this.alpha[ i ] !== 0 ) {

				this.alpha[ i ] = 0;

			}

		}

		this.geo.attributes.position.needsUpdate = true;
		this.geo.attributes.color.needsUpdate = true;
		this.geo.attributes.size.needsUpdate = true;
		this.geo.attributes.alpha.needsUpdate = true;
		this.geo.attributes.rot.needsUpdate = true;

	}

}

const C = ( hex ) => new THREE.Color( hex );

// Photosensitivity guard (WCAG 2.3.1): bright flashes are limited to under 3 per second.
// Calls inside one short window count as the same flash event (an impact fires several at once).
export const flashGate = {
	reduced: matchMedia( '(prefers-reduced-motion: reduce)' ).matches,
	last: - Infinity,
	allow() {

		const now = performance.now() / 1000;
		const gap = now - this.last;
		if ( gap < 0.04 ) return true;
		if ( gap < 0.36 ) return false;
		this.last = now;
		return true;

	},
};
const rv = ( s = 1 ) => new THREE.Vector3( ( Math.random() - 0.5 ) * 2 * s, ( Math.random() - 0.5 ) * 2 * s, ( Math.random() - 0.5 ) * 2 * s );

export class FX {

	constructor( scene, camera ) {

		this.scene = scene;
		this.camera = camera;
		this.add = new Particles( scene, 1500, softDot(), THREE.AdditiveBlending );
		this.smoke = new Particles( scene, 900, smokeTexture(), THREE.NormalBlending );
		this.items = []; // generic updatable effects
		this.bodies = []; // physics props on the ground
		this.arcMat = new THREE.MeshBasicMaterial( { map: arcTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, color: 0xbfe4ff } );
		this.ringTex = softDot();

	}

	sparks( pos, { count = 40, color = 0xffd27a, speed = 6, size = 0.12, life = 0.5, gravity = 9 } = {} ) {

		const c = C( color );
		for ( let i = 0; i < count; i ++ ) {

			const v = rv( 1 ).normalize().multiplyScalar( speed * ( 0.3 + Math.random() ) );
			this.add.emit( { pos, vel: v, life: life * ( 0.5 + Math.random() ), size: size * ( 0.5 + Math.random() ), sizeEnd: 0.01, color: c, gravity, drag: 2 } );

		}

	}

	flash( pos, size = 1.4, color = 0xffffff ) {

		if ( ! flashGate.allow() ) return;
		if ( flashGate.reduced ) size *= 0.5;
		this.add.emit( { pos, life: 0.12, size, sizeEnd: size * 1.4, color: C( color ), alpha: 0.75 } );
		this.add.emit( { pos, life: 0.22, size: size * 0.5, sizeEnd: size * 1.8, color: C( 0xffa040 ), alpha: 0.45 } );

	}

	puff( pos, { count = 20, color = 0x8a8a92, size = 0.6, spread = 0.4, life = 1.2, rise = 0.5, alpha = 0.6 } = {} ) {

		const c = C( color );
		for ( let i = 0; i < count; i ++ ) {

			const p = pos.clone().add( rv( spread ) );
			const v = rv( 1.2 ).add( new THREE.Vector3( 0, rise, 0 ) );
			this.smoke.emit( { pos: p, vel: v, life: life * ( 0.6 + Math.random() * 0.6 ), size: size * ( 0.5 + Math.random() * 0.6 ), sizeEnd: size * 2.2, color: c, drag: 1.6, alpha, wind: 2.5 } );

		}

	}

	chalkDust( pos, count = 26 ) {

		this.puff( pos, { count, color: 0xf6f6ee, size: 0.35, spread: 0.15, life: 0.9, rise: 0.2, alpha: 0.85 } );
		this.sparks( pos, { count: 14, color: 0xffffff, speed: 3, size: 0.06, gravity: 6 } );

	}

	dust( pos, count = 30 ) {

		const p = pos.clone();
		p.y = 0.1;
		for ( let i = 0; i < count; i ++ ) {

			const a = Math.random() * Math.PI * 2;
			const v = new THREE.Vector3( Math.cos( a ) * 3, Math.random() * 0.6, Math.sin( a ) * 3 );
			this.smoke.emit( { pos: p.clone(), vel: v, life: 1.1, size: 0.4, sizeEnd: 1.4, color: C( 0xa08866 ), drag: 2.5, alpha: 0.5, wind: 2 } );

		}

	}

	// crescent slash trail; dir: +1 facing right, -1 facing left
	slash( center, { radius = 0.9, rotZ = 0, facing = 1, color = 0xbfe4ff, width = 0.35, yaw = 0 } = {} ) {

		const geo = new THREE.RingGeometry( radius - width, radius, 40, 1, 0, Math.PI * 1.1 );
		// remap UVs so u runs along the arc
		const uv = geo.attributes.uv, pos = geo.attributes.position;
		for ( let i = 0; i < uv.count; i ++ ) {

			const x = pos.getX( i ), y = pos.getY( i );
			const a = Math.atan2( y, x );
			const r = Math.hypot( x, y );
			uv.setXY( i, Math.max( 0, a ) / ( Math.PI * 1.1 ), ( r - ( radius - width ) ) / width );

		}

		const mat = this.arcMat.clone();
		mat.color.setHex( color );
		const m = new THREE.Mesh( geo, mat );
		m.position.copy( center );
		m.rotation.set( 0, yaw + ( facing > 0 ? 0 : Math.PI ), rotZ );
		m.renderOrder = 6;
		this.scene.add( m );
		let age = 0;
		this.items.push( {
			update: ( dt ) => {

				age += dt;
				const k = age / 0.28;
				m.scale.setScalar( 1 + k * 0.25 );
				mat.opacity = Math.max( 0, 1 - k );
				m.rotation.z += dt * 2 * facing;
				return k < 1;

			},
			dispose: () => {

				this.scene.remove( m );
				geo.dispose();
				mat.dispose();

			}
		} );

	}

	shockwave( pos, { color = 0xffe0a0, size = 4, life = 0.6, flat = true } = {} ) {

		const geo = new THREE.RingGeometry( 0.6, 1, 48 );
		const mat = new THREE.MeshBasicMaterial( { color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide } );
		const m = new THREE.Mesh( geo, mat );
		m.position.copy( pos );
		if ( flat ) {

			m.rotation.x = - Math.PI / 2;
			m.position.y = Math.max( 0.03, pos.y );

		} else {

			m.lookAt( this.camera.position );

		}

		this.scene.add( m );
		let t = 0;
		this.items.push( {
			update: ( dt ) => {

				t += dt;
				const k = t / life;
				m.scale.setScalar( 0.2 + ease.out( Math.min( 1, k ) ) * size );
				mat.opacity = Math.max( 0, 1 - k );
				return k < 1;

			},
			dispose: () => {

				this.scene.remove( m );
				geo.dispose();
				mat.dispose();

			}
		} );

	}

	// Spinning projectile from -> to along an arc. Resolves on arrival.
	projectile( obj, from, to, { dur = 0.35, arc = 0.3, spin = [ 0, 0, 30 ], trail = 0xbfe4ff, trailSize = 0.12 } = {} ) {

		this.scene.add( obj );
		obj.position.copy( from );
		return new Promise( resolve => {

			let t = 0;
			this.items.push( {
				update: ( dt ) => {

					t += dt;
					const k = Math.min( 1, t / dur );
					obj.position.lerpVectors( from, to, k );
					obj.position.y += Math.sin( k * Math.PI ) * arc;
					obj.rotation.x += spin[ 0 ] * dt;
					obj.rotation.y += spin[ 1 ] * dt;
					obj.rotation.z += spin[ 2 ] * dt;
					if ( trail ) this.add.emit( { pos: obj.position.clone(), life: 0.18, size: trailSize, sizeEnd: 0.01, color: C( trail ), alpha: 0.8 } );
					if ( k >= 1 ) {

						resolve();
						return false;

					}

					return true;

				},
				dispose: () => {

					this.scene.remove( obj );

				}
			} );

		} );

	}

	// Drop a weapon into the world with simple rigid-body motion. It stays on the ground.
	dropProp( obj, vel, angVel ) {

		this.scene.attach( obj );
		const body = { obj, vel: vel.clone(), ang: angVel.clone(), rest: false, bounces: 0 };
		this.bodies.push( body );
		return body;

	}

	clearBodies() {

		this.bodies.length = 0;

	}

	// Drop every running effect (used when a fight is abandoned).
	clearItems() {

		this.items.forEach( it => it.dispose() );
		this.items.length = 0;

	}

	// Translucent afterimage of a fighter.
	ghost( fighter, color = 0x7fc8ff, life = 0.5 ) {

		fighter.root.updateMatrixWorld( true );
		const g = fighter.root.clone( true );
		const mat = new THREE.MeshBasicMaterial( { color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false } );
		g.traverse( o => {

			if ( o.isMesh ) {

				o.material = mat;
				o.castShadow = false;

			}

		} );
		this.scene.add( g );
		let t = 0;
		this.items.push( {
			update: ( dt ) => {

				t += dt;
				mat.opacity = 0.45 * Math.max( 0, 1 - t / life );
				return t < life;

			},
			dispose: () => {

				this.scene.remove( g );
				mat.dispose();

			}
		} );

	}

	aura( fighter, color = 0xff5a2a, dur = 1.6 ) {

		let t = 0;
		const c = C( color );
		const light = new THREE.PointLight( color, 0, 6 );
		this.scene.add( light );
		this.items.push( {
			update: ( dt ) => {

				t += dt;
				const base = fighter.root.position;
				light.position.set( base.x, 1.2, base.z + 0.5 );
				light.intensity = Math.sin( Math.min( 1, t / dur ) * Math.PI ) * 6;
				for ( let i = 0; i < 3; i ++ ) {

					const a = Math.random() * Math.PI * 2;
					const p = new THREE.Vector3( base.x + Math.cos( a ) * 0.5, Math.random() * 0.4, base.z + Math.sin( a ) * 0.5 );
					this.add.emit( { pos: p, vel: new THREE.Vector3( 0, 2.5 + Math.random() * 2, 0 ), life: 0.7, size: 0.25, sizeEnd: 0.02, color: c, drag: 0.5, wind: 1 } );

				}

				return t < dur;

			},
			dispose: () => {

				this.scene.remove( light );

			}
		} );

	}

	update( dt ) {

		this.add.update( dt );
		this.smoke.update( dt );
		for ( let i = this.items.length - 1; i >= 0; i -- ) {

			if ( ! this.items[ i ].update( dt ) ) {

				this.items[ i ].dispose();
				this.items.splice( i, 1 );

			}

		}

		for ( const b of this.bodies ) {

			if ( b.rest ) continue;
			b.vel.y -= 14 * dt;
			b.obj.position.addScaledVector( b.vel, dt );
			b.obj.rotation.x += b.ang.x * dt;
			b.obj.rotation.y += b.ang.y * dt;
			b.obj.rotation.z += b.ang.z * dt;
			if ( b.obj.position.y < 0.04 ) {

				b.obj.position.y = 0.04;
				b.bounces ++;
				b.vel.y = Math.abs( b.vel.y ) * 0.35;
				b.vel.x *= 0.5;
				b.vel.z *= 0.5;
				b.ang.multiplyScalar( 0.45 );
				if ( b.onBounce && b.bounces === 1 ) b.onBounce();
				if ( b.bounces > 3 || Math.abs( b.vel.y ) < 0.4 ) {

					b.rest = true;
					// lay it flat
					const e = b.obj.rotation;
					tween( 0.2, k => {

						e.x = e.x * ( 1 - k ) + ( Math.round( e.x / Math.PI ) * Math.PI + Math.PI / 2 ) * k;

					}, ease.out, b.obj );

				}

			}

		}

	}

}

// ------------------------------------------------------------------ DOM effects

const layer = () => document.getElementById( 'fx-layer' );

export function callout( text, screenPos, { color = '#fff7e0', size = 1, rotate = ( Math.random() - 0.5 ) * 24, cls = '' } = {} ) {

	const el = document.createElement( 'div' );
	el.className = 'callout ' + cls;
	el.textContent = text;
	el.style.left = screenPos.x + 'px';
	el.style.top = screenPos.y + 'px';
	el.style.setProperty( '--rot', rotate + 'deg' );
	el.style.setProperty( '--size', size );
	el.style.color = color;
	layer().appendChild( el );
	setTimeout( () => el.remove(), 1100 );

}

export function screenFlash( color = '#fff', dur = 180 ) {

	if ( flashGate.reduced || ! flashGate.allow() ) return;
	const el = document.getElementById( 'flash' );
	el.style.transition = 'none';
	el.style.background = color;
	el.style.opacity = 0.55;
	requestAnimationFrame( () => {

		el.style.transition = `opacity ${ dur }ms ease-out`;
		el.style.opacity = 0;

	} );

}

export function speedLines( on, dur = 600 ) {

	const el = document.getElementById( 'speedlines' );
	el.classList.toggle( 'on', on );
	if ( on && dur ) setTimeout( () => el.classList.remove( 'on' ), dur );

}

export function inkSplash( kanji, sub ) {

	const el = document.getElementById( 'ink' );
	el.querySelector( '.ink-kanji' ).textContent = kanji;
	el.querySelector( '.ink-sub' ).textContent = sub || '';
	el.classList.remove( 'on' );
	void el.offsetWidth;
	el.classList.add( 'on' );

}

export function hideInk() {

	document.getElementById( 'ink' ).classList.remove( 'on' );

}
