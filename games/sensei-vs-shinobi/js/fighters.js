import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { tweenXYZ, tween, ease } from './tween.js';
import {
	shirtTexture, vestTexture, trouserTexture, ninjaClothTexture, wrapTexture,
	TeacherFace, NinjaMask, decalTexture, rulerTexture, bookTexture
} from './textures.js';
import { wind } from './world.js';
import { flashGate } from './fx.js';

export const JOINTS = [ 'hips', 'spine', 'chest', 'neck', 'head', 'shL', 'elL', 'haL', 'shR', 'elR', 'haR', 'thL', 'knL', 'ftL', 'thR', 'knR', 'ftR' ];

// Poses: joint -> [x, y, z] euler. Model faces +Z; character's left is +X.
// shoulder x<0 raises arm forward; elbow x<0 bends forearm forward;
// thigh x<0 lifts leg forward; knee x>0 bends shin back; spine/chest x>0 leans forward.
export const POSES = {
	stanceTeacher: {
		hips: [ 0, - 0.3, 0 ], spine: [ 0.08, 0, 0 ], chest: [ 0.05, 0.12, 0 ], head: [ - 0.05, 0.2, 0 ],
		shL: [ - 0.9, 0, 0.35 ], elL: [ - 1.7, 0, 0 ], shR: [ - 0.5, 0, - 0.45 ], elR: [ - 2.0, 0, 0 ],
		thL: [ - 0.35, 0, 0.12 ], knL: [ 0.35, 0, 0 ], thR: [ 0.3, 0, - 0.12 ], knR: [ 0.35, 0, 0 ], ftR: [ - 0.2, 0, 0 ],
		hipsY: - 0.04,
	},
	stanceNinja: {
		hips: [ 0, - 0.55, 0 ], spine: [ 0.18, 0, 0 ], chest: [ 0.05, 0.25, 0 ], head: [ - 0.1, 0.3, 0 ],
		shL: [ - 1.25, 0, 0.2 ], elL: [ - 1.2, 0, 0 ], haL: [ 0, 0, 0.3 ], shR: [ - 0.4, 0, - 0.5 ], elR: [ - 1.9, 0, 0 ],
		thL: [ - 0.7, 0, 0.25 ], knL: [ 0.9, 0, 0 ], ftL: [ - 0.1, 0, 0 ], thR: [ 0.25, 0, - 0.25 ], knR: [ 0.9, 0, 0 ], ftR: [ - 0.5, 0, 0 ],
		hipsY: - 0.14,
	},
	punchR: {
		hips: [ 0, 0.25, 0 ], spine: [ 0.2, 0, 0 ], chest: [ 0.1, 0.55, 0 ], head: [ 0, - 0.5, 0 ],
		shR: [ - 1.6, 0, - 0.05 ], elR: [ - 0.1, 0, 0 ], shL: [ - 0.7, 0, 0.3 ], elL: [ - 2.0, 0, 0 ],
		thL: [ - 0.6, 0, 0.1 ], knL: [ 0.5, 0, 0 ], thR: [ 0.5, 0, - 0.1 ], knR: [ 0.2, 0, 0 ], hipsY: - 0.08, hipsZ: 0.15,
	},
	punchL: {
		hips: [ 0, - 0.5, 0 ], spine: [ 0.15, 0, 0 ], chest: [ 0.1, - 0.3, 0 ], head: [ 0, 0.6, 0 ],
		shL: [ - 1.6, 0, 0.05 ], elL: [ - 0.1, 0, 0 ], shR: [ - 0.6, 0, - 0.4 ], elR: [ - 2.1, 0, 0 ],
		thL: [ - 0.6, 0, 0.1 ], knL: [ 0.5, 0, 0 ], thR: [ 0.4, 0, - 0.1 ], knR: [ 0.3, 0, 0 ], hipsY: - 0.06, hipsZ: 0.1,
	},
	crouch: {
		hips: [ 0, 0, 0 ], spine: [ 0.5, 0, 0 ], chest: [ 0.2, 0, 0 ], head: [ - 0.5, 0, 0 ],
		shL: [ - 0.4, 0, 0.3 ], elL: [ - 1.8, 0, 0 ], shR: [ 0.2, 0, - 0.4 ], elR: [ - 1.6, 0, 0 ],
		thL: [ - 1.3, 0, 0.2 ], knL: [ 1.9, 0, 0 ], ftL: [ - 0.5, 0, 0 ], thR: [ - 0.5, 0, - 0.2 ], knR: [ 1.9, 0, 0 ], ftR: [ - 0.5, 0, 0 ], hipsY: - 0.38,
	},
	uppercut: {
		hips: [ 0, 0.3, 0 ], spine: [ - 0.25, 0, 0 ], chest: [ - 0.1, 0.5, 0 ], head: [ - 0.3, - 0.3, 0 ],
		shR: [ - 2.9, 0, - 0.05 ], elR: [ - 0.9, 0, 0 ], shL: [ - 0.4, 0, 0.5 ], elL: [ - 1.9, 0, 0 ],
		thL: [ - 0.3, 0, 0.1 ], knL: [ 0.1, 0, 0 ], thR: [ 0.3, 0, - 0.1 ], knR: [ 0.1, 0, 0 ], ftR: [ - 0.6, 0, 0 ], hipsY: 0.04,
	},
	overhead: {
		hips: [ 0, 0, 0 ], spine: [ - 0.3, 0, 0 ], chest: [ - 0.15, 0, 0 ], head: [ 0.2, 0, 0 ],
		shL: [ - 3.0, 0, - 0.25 ], elL: [ - 0.7, 0, 0 ], shR: [ - 3.0, 0, 0.25 ], elR: [ - 0.7, 0, 0 ],
		thL: [ - 0.4, 0, 0.15 ], knL: [ 0.3, 0, 0 ], thR: [ 0.3, 0, - 0.15 ], knR: [ 0.3, 0, 0 ],
	},
	smash: {
		hips: [ 0, 0, 0 ], spine: [ 0.6, 0, 0 ], chest: [ 0.3, 0, 0 ], head: [ - 0.6, 0, 0 ],
		shL: [ - 1.0, 0, - 0.25 ], elL: [ - 0.15, 0, 0 ], shR: [ - 1.0, 0, 0.25 ], elR: [ - 0.15, 0, 0 ], haR: [ 1.2, 0, 0 ], haL: [ 1.2, 0, 0 ],
		thL: [ - 0.8, 0, 0.15 ], knL: [ 1.0, 0, 0 ], thR: [ 0.5, 0, - 0.15 ], knR: [ 0.5, 0, 0 ], hipsY: - 0.22, hipsZ: 0.15,
	},
	throwWind: {
		hips: [ 0, - 0.6, 0 ], spine: [ - 0.1, 0, 0 ], chest: [ - 0.1, - 0.5, 0 ], head: [ 0, 1.0, 0 ],
		shR: [ - 2.6, 0, - 0.6 ], elR: [ - 1.8, 0, 0 ], shL: [ - 1.4, 0, 0.3 ], elL: [ - 0.3, 0, 0 ],
		thL: [ - 0.5, 0, 0.2 ], knL: [ 0.3, 0, 0 ], thR: [ 0.4, 0, - 0.2 ], knR: [ 0.4, 0, 0 ],
	},
	throw: {
		hips: [ 0, 0.3, 0 ], spine: [ 0.3, 0, 0 ], chest: [ 0.1, 0.6, 0 ], head: [ 0, - 0.6, 0 ],
		shR: [ - 1.5, 0, 0.1 ], elR: [ - 0.1, 0, 0 ], shL: [ - 0.3, 0, 0.6 ], elL: [ - 1.0, 0, 0 ],
		thL: [ - 0.7, 0, 0.2 ], knL: [ 0.6, 0, 0 ], thR: [ 0.5, 0, - 0.2 ], knR: [ 0.2, 0, 0 ], hipsY: - 0.08, hipsZ: 0.1,
	},
	swingBack: {
		hips: [ 0, - 0.7, 0 ], spine: [ 0.1, 0, 0 ], chest: [ 0, - 0.8, 0 ], head: [ 0, 1.2, 0 ],
		shR: [ - 1.4, 0, - 1.2 ], elR: [ - 0.8, 0, 0 ], shL: [ - 1.6, 0, - 0.4 ], elL: [ - 1.2, 0, 0 ],
		thL: [ - 0.4, 0, 0.2 ], knL: [ 0.4, 0, 0 ], thR: [ 0.4, 0, - 0.2 ], knR: [ 0.4, 0, 0 ], hipsY: - 0.06,
	},
	swingThrough: {
		hips: [ 0, 0.6, 0 ], spine: [ 0.25, 0, 0 ], chest: [ 0.05, 0.9, 0 ], head: [ 0, - 1.2, 0 ],
		shR: [ - 1.5, 0, 0.6 ], elR: [ - 0.2, 0, 0 ], haR: [ 0.9, 0, 0 ], shL: [ - 1.2, 0, 1.0 ], elL: [ - 0.5, 0, 0 ],
		thL: [ - 0.6, 0, 0.2 ], knL: [ 0.6, 0, 0 ], thR: [ 0.5, 0, - 0.2 ], knR: [ 0.2, 0, 0 ], hipsY: - 0.1, hipsZ: 0.1,
	},
	hitHigh: {
		spine: [ - 0.45, 0, 0 ], chest: [ - 0.2, 0, 0.1 ], head: [ - 0.6, 0.3, 0.2 ],
		shL: [ - 0.6, 0, 1.1 ], elL: [ - 0.6, 0, 0 ], shR: [ - 0.4, 0, - 1.2 ], elR: [ - 0.5, 0, 0 ],
		thL: [ - 0.3, 0, 0.2 ], knL: [ 0.5, 0, 0 ], thR: [ 0.4, 0, - 0.2 ], knR: [ 0.2, 0, 0 ], hipsY: - 0.04,
	},
	hitBody: {
		spine: [ 0.6, 0, 0 ], chest: [ 0.3, 0, 0 ], head: [ 0.3, 0, 0 ],
		shL: [ - 0.9, 0, 0.1 ], elL: [ - 1.6, 0, 0 ], shR: [ - 0.9, 0, - 0.1 ], elR: [ - 1.6, 0, 0 ],
		thL: [ - 0.5, 0, 0.1 ], knL: [ 0.8, 0, 0 ], thR: [ - 0.2, 0, - 0.1 ], knR: [ 0.8, 0, 0 ], hipsY: - 0.18, hipsZ: - 0.1,
	},
	dizzy: {
		hips: [ 0, 0, 0 ], spine: [ 0.25, 0, 0.15 ], chest: [ 0.1, 0, 0.1 ], head: [ 0.4, 0, 0.35 ],
		shL: [ - 0.1, 0, 0.25 ], elL: [ - 0.3, 0, 0 ], shR: [ - 0.1, 0, - 0.25 ], elR: [ - 0.3, 0, 0 ],
		thL: [ - 0.2, 0, 0.15 ], knL: [ 0.5, 0, 0 ], thR: [ 0.1, 0, - 0.15 ], knR: [ 0.6, 0, 0 ], hipsY: - 0.12,
	},
	lie: {
		hips: [ 0, 0, 0 ], spine: [ - 0.1, 0, 0 ], chest: [ 0, 0, 0 ], head: [ - 0.3, 0.6, 0 ],
		shL: [ - 2.4, 0, 0.9 ], elL: [ - 0.4, 0, 0 ], shR: [ - 0.6, 0, - 1.3 ], elR: [ - 0.3, 0, 0 ],
		thL: [ - 0.1, 0, 0.3 ], knL: [ 0.2, 0, 0 ], thR: [ - 0.6, 0, - 0.1 ], knR: [ 1.0, 0, 0 ],
	},
	tuck: {
		hips: [ 0, 0, 0 ], spine: [ 0.6, 0, 0 ], chest: [ 0.3, 0, 0 ], head: [ - 0.3, 0, 0 ],
		shL: [ - 1.2, 0, 0.3 ], elL: [ - 2.0, 0, 0 ], shR: [ - 1.2, 0, - 0.3 ], elR: [ - 2.0, 0, 0 ],
		thL: [ - 2.2, 0, 0.1 ], knL: [ 2.3, 0, 0 ], thR: [ - 2.2, 0, - 0.1 ], knR: [ 2.3, 0, 0 ],
	},
	flyingKick: {
		hips: [ 0, 0, 0 ], spine: [ - 0.4, 0, 0 ], chest: [ - 0.1, 0, 0 ], head: [ 0.5, 0, 0 ],
		shL: [ 0.6, 0, 0.9 ], elL: [ - 0.5, 0, 0 ], shR: [ 0.5, 0, - 0.9 ], elR: [ - 0.5, 0, 0 ],
		thL: [ - 1.8, 0, 0.05 ], knL: [ 0.05, 0, 0 ], ftL: [ 0.5, 0, 0 ], thR: [ - 0.4, 0, - 0.1 ], knR: [ 2.2, 0, 0 ],
	},
	kickHigh: {
		hips: [ 0, 0.6, 0 ], spine: [ - 0.5, 0, 0 ], chest: [ 0, - 0.3, 0 ], head: [ 0.4, 0, 0 ],
		shL: [ - 0.6, 0, 0.8 ], elL: [ - 1.2, 0, 0 ], shR: [ 0.2, 0, - 0.7 ], elR: [ - 1.4, 0, 0 ],
		thL: [ - 2.0, 0, 0.3 ], knL: [ 0.05, 0, 0 ], ftL: [ 0.4, 0, 0 ], thR: [ 0.1, 0, - 0.05 ], knR: [ 0.2, 0, 0 ],
	},
	slashHigh: {
		hips: [ 0, - 0.5, 0 ], spine: [ - 0.1, 0, 0 ], chest: [ - 0.1, - 0.5, 0 ], head: [ 0, 0.8, 0 ],
		shR: [ - 2.9, 0, - 0.3 ], elR: [ - 0.8, 0, 0 ], haR: [ 0.2, 0, 0 ], shL: [ - 1.0, 0, 0.5 ], elL: [ - 1.3, 0, 0 ],
		thL: [ - 0.6, 0, 0.25 ], knL: [ 0.7, 0, 0 ], thR: [ 0.3, 0, - 0.25 ], knR: [ 0.7, 0, 0 ], hipsY: - 0.08,
	},
	slashDown: {
		hips: [ 0, 0.4, 0 ], spine: [ 0.45, 0, 0 ], chest: [ 0.2, 0.6, 0 ], head: [ - 0.4, - 0.7, 0 ],
		shR: [ - 0.9, 0, 0.5 ], elR: [ - 0.2, 0, 0 ], haR: [ 1.2, 0, 0 ], shL: [ - 0.5, 0, 0.9 ], elL: [ - 0.8, 0, 0 ],
		thL: [ - 1.0, 0, 0.25 ], knL: [ 1.1, 0, 0 ], thR: [ 0.6, 0, - 0.25 ], knR: [ 0.4, 0, 0 ], hipsY: - 0.25, hipsZ: 0.2,
	},
	slashSide: {
		hips: [ 0, 0.8, 0 ], spine: [ 0.2, 0, 0 ], chest: [ 0, 0.8, 0 ], head: [ 0, - 1.4, 0 ],
		shR: [ - 1.55, 0, 0.9 ], elR: [ - 0.05, 0, 0 ], haR: [ 1.1, 0, 0 ], shL: [ - 0.4, 0, 1.2 ], elL: [ - 0.4, 0, 0 ],
		thL: [ - 0.8, 0, 0.3 ], knL: [ 0.9, 0, 0 ], thR: [ 0.5, 0, - 0.2 ], knR: [ 0.4, 0, 0 ], hipsY: - 0.15, hipsZ: 0.1,
	},
	slashUp: {
		hips: [ 0, - 0.3, 0 ], spine: [ - 0.4, 0, 0 ], chest: [ - 0.2, - 0.3, 0 ], head: [ - 0.2, 0.5, 0 ],
		shR: [ - 3.1, 0, - 0.2 ], elR: [ - 0.1, 0, 0 ], haR: [ 1.0, 0, 0 ], shL: [ 0.3, 0, 0.8 ], elL: [ - 0.6, 0, 0 ],
		thL: [ - 0.2, 0, 0.2 ], knL: [ 0.2, 0, 0 ], thR: [ 0.3, 0, - 0.2 ], knR: [ 0.2, 0, 0 ], ftR: [ - 0.8, 0, 0 ], hipsY: 0.02,
	},
	stab: {
		hips: [ 0, 0.4, 0 ], spine: [ 0.35, 0, 0 ], chest: [ 0.1, 0.5, 0 ], head: [ - 0.3, - 0.7, 0 ],
		shR: [ - 1.6, 0, 0 ], elR: [ 0, 0, 0 ], haR: [ 1.5, 0, 0 ], shL: [ 0.6, 0, 0.6 ], elL: [ - 0.5, 0, 0 ],
		thL: [ - 1.2, 0, 0.2 ], knL: [ 1.0, 0, 0 ], thR: [ 0.9, 0, - 0.2 ], knR: [ 0.1, 0, 0 ], hipsY: - 0.3, hipsZ: 0.25,
	},
	drawSword: {
		hips: [ 0, - 0.3, 0 ], spine: [ 0.1, 0, 0 ], chest: [ 0, - 0.3, 0 ], head: [ 0, 0.4, 0 ],
		shR: [ - 2.6, 0, 0.5 ], elR: [ - 2.2, 0, 0 ], shL: [ - 1.2, 0, 0.3 ], elL: [ - 1.2, 0, 0 ],
		thL: [ - 0.6, 0, 0.25 ], knL: [ 0.8, 0, 0 ], thR: [ 0.3, 0, - 0.25 ], knR: [ 0.8, 0, 0 ], hipsY: - 0.12,
	},
	spinWeapon: {
		hips: [ 0, 0, 0 ], spine: [ 0.1, 0, 0 ], chest: [ 0, 0.3, 0 ], head: [ 0, - 0.3, 0 ],
		shR: [ - 2.0, 0, - 0.5 ], elR: [ - 0.6, 0, 0 ], shL: [ - 1.0, 0, 0.5 ], elL: [ - 1.4, 0, 0 ],
		thL: [ - 0.6, 0, 0.25 ], knL: [ 0.8, 0, 0 ], thR: [ 0.3, 0, - 0.25 ], knR: [ 0.8, 0, 0 ], hipsY: - 0.12,
	},
	victoryTeacher: {
		hips: [ 0, 0, 0 ], spine: [ - 0.1, 0, 0 ], chest: [ - 0.1, 0, 0 ], head: [ - 0.2, 0, 0 ],
		shL: [ - 0.3, 0, 1.4 ], elL: [ - 1.9, 0, 0 ], shR: [ - 0.3, 0, - 1.4 ], elR: [ - 1.9, 0, 0 ],
		thL: [ - 0.1, 0, 0.25 ], knL: [ 0.05, 0, 0 ], thR: [ 0.1, 0, - 0.25 ], knR: [ 0.05, 0, 0 ],
	},
	victoryNinja: {
		hips: [ 0, 0, 0 ], spine: [ 0.05, 0, 0 ], chest: [ 0, 0, 0 ], head: [ - 0.1, 0, 0 ],
		shL: [ - 1.3, 0, - 0.3 ], elL: [ - 1.9, 0, 0 ], shR: [ - 3.0, 0, - 0.2 ], elR: [ - 0.2, 0, 0 ],
		thL: [ - 0.1, 0, 0.12 ], knL: [ 0.05, 0, 0 ], thR: [ 0.1, 0, - 0.12 ], knR: [ 0.05, 0, 0 ],
	},
	bow: {
		hips: [ 0, 0, 0 ], spine: [ 0.6, 0, 0 ], chest: [ 0.2, 0, 0 ], head: [ 0.2, 0, 0 ],
		shL: [ - 0.1, 0, 0.05 ], elL: [ - 0.2, 0, 0 ], shR: [ - 0.1, 0, - 0.05 ], elR: [ - 0.2, 0, 0 ],
	},
	aura: {
		hips: [ 0, 0, 0 ], spine: [ 0.1, 0, 0 ], chest: [ - 0.1, 0, 0 ], head: [ - 0.3, 0, 0 ],
		shL: [ - 0.6, 0, 0.9 ], elL: [ - 1.4, 0, 0 ], shR: [ - 0.6, 0, - 0.9 ], elR: [ - 1.4, 0, 0 ],
		thL: [ - 0.3, 0, 0.35 ], knL: [ 0.6, 0, 0 ], thR: [ - 0.3, 0, - 0.35 ], knR: [ 0.6, 0, 0 ], hipsY: - 0.18,
	},
};

// Euler that turns local +Z toward a direction (weapon blades point along +Z).
function dirEuler( x, y, z ) {

	const q = new THREE.Quaternion().setFromUnitVectors( new THREE.Vector3( 0, 0, 1 ), new THREE.Vector3( x, y, z ).normalize() );
	const e = new THREE.Euler().setFromQuaternion( q );
	return [ e.x, e.y, e.z ];

}

const GEO_CACHE = new Map();
function capsule( r, len ) {

	const k = r.toFixed( 3 ) + ':' + len.toFixed( 3 );
	if ( ! GEO_CACHE.has( k ) ) GEO_CACHE.set( k, new THREE.CapsuleGeometry( r, Math.max( 0.001, len - r * 2 ), 6, 14 ) );
	return GEO_CACHE.get( k );

}

class Fighter {

	constructor( kind ) {

		this.kind = kind;
		this.root = new THREE.Group();
		this.body = new THREE.Group();
		this.root.add( this.body );
		this.j = {};
		this.materials = [];
		this.woundParts = [];
		this.wounds = [];
		this.hp = 4;
		this.idleOn = true;
		this.idleAmp = 1;
		this.cloth = [];
		this.stanceName = 'stance';
		this._t = Math.random() * 10;

	}

	mat( params ) {

		const m = new THREE.MeshStandardMaterial( { roughness: 0.8, metalness: 0, ...params } );
		this.materials.push( m );
		return m;

	}

	joint( name, parent, x = 0, y = 0, z = 0 ) {

		const g = new THREE.Group();
		g.position.set( x, y, z );
		( typeof parent === 'string' ? this.j[ parent ] : parent ).add( g );
		this.j[ name ] = g;
		return g;

	}

	mesh( geo, mat, parent, pos = [ 0, 0, 0 ], scale, rot ) {

		const m = new THREE.Mesh( geo, mat );
		m.position.set( ...pos );
		if ( scale ) m.scale.set( ...scale );
		if ( rot ) m.rotation.set( ...rot );
		m.castShadow = true;
		m.receiveShadow = true;
		( typeof parent === 'string' ? this.j[ parent ] : parent ).add( m );
		return m;

	}

	limb( parent, r, len, mat, wound = true, r2 ) {

		const m = this.mesh( capsule( r, len ), mat, parent, [ 0, - len / 2, 0 ] );
		if ( r2 ) m.scale.set( 1, 1, r2 );
		if ( wound ) this.woundParts.push( m );
		return m;

	}

	// Build the joint skeleton from a dimensions object.
	skeleton( D ) {

		this.hipsY = D.foot + D.shin + D.thigh;
		this.joint( 'hips', this.body, 0, this.hipsY, 0 );
		this.joint( 'spine', 'hips', 0, 0.05, 0 );
		this.joint( 'chest', 'spine', 0, D.spine, 0 );
		this.joint( 'neck', 'chest', 0, D.chestH, 0 );
		this.joint( 'head', 'neck', 0, D.neck, 0 );
		[ [ 'L', 1 ], [ 'R', - 1 ] ].forEach( ( [ s, sg ] ) => {

			this.joint( 'sh' + s, 'chest', sg * D.shW, D.chestH * 0.82, 0 );
			this.joint( 'el' + s, 'sh' + s, 0, - D.upper, 0 );
			this.joint( 'ha' + s, 'el' + s, 0, - D.fore, 0 );
			this.joint( 'th' + s, 'hips', sg * D.hipW, - 0.02, 0 );
			this.joint( 'kn' + s, 'th' + s, 0, - D.thigh, 0 );
			this.joint( 'ft' + s, 'kn' + s, 0, - D.shin, 0 );

		} );
		this.D = D;

	}

	pose( P, dur = 0.25, easing = ease.inOut ) {

		const full = { ...POSES[ this.stanceName ], ...( typeof P === 'string' ? POSES[ P ] : P ) };
		if ( typeof P === 'string' && P.startsWith( 'stance' ) ) Object.assign( full, POSES[ P ] );
		const proms = JOINTS.map( n => tweenXYZ( this.j[ n ].rotation, full[ n ] || [ 0, 0, 0 ], dur, easing ) );
		proms.push( tweenXYZ( this.j.hips.position, [ 0, this.hipsY + ( full.hipsY || 0 ), full.hipsZ || 0 ], dur, easing ) );
		return Promise.all( proms );

	}

	stance( dur = 0.3 ) {

		return this.pose( {}, dur );

	}

	get x() {

		return this.root.position.x;

	}

	// World position of a body point (for FX).
	worldPoint( jointName, offset = [ 0, 0, 0 ] ) {

		const v = new THREE.Vector3( ...offset );
		this.j[ jointName ].updateWorldMatrix( true, false );
		return v.applyMatrix4( this.j[ jointName ].matrixWorld );

	}

	chestPoint() {

		return this.worldPoint( 'chest', [ 0, this.D.chestH * 0.5, 0.1 ] );

	}

	headPoint() {

		return this.worldPoint( 'head', [ 0, this.D.headR, 0 ] );

	}

	moveTo( x, dur, easing = ease.inOut, y = 0 ) {

		return tweenXYZ( this.root.position, [ x, y, this.root.position.z ], dur, easing );

	}

	flash( color = 0xffffff, dur = 0.25 ) {

		// short hit flashes go through the photosensitivity gate; long glows (power-ups) do not flash
		if ( dur < 0.5 && ( flashGate.reduced || ! flashGate.allow() ) ) return Promise.resolve();
		const c = new THREE.Color( color ).multiplyScalar( 0.38 );
		this.materials.forEach( m => {

			if ( m.emissive ) m.emissive.copy( c );

		} );
		return tween( dur, k => {

			const v = 1 - k;
			this.materials.forEach( m => {

				if ( m.emissive ) m.emissive.setRGB( c.r * v, c.g * v, c.b * v );

			} );

		}, ease.out, this.materials );

	}

	// Paint a wound decal onto a random visible body part.
	addWound( kind, camera ) {

		if ( ! this.woundParts.length ) return;
		this.root.updateMatrixWorld( true );
		const ray = new THREE.Raycaster();
		const part = this.woundParts[ Math.floor( Math.random() * this.woundParts.length ) ];
		const center = new THREE.Vector3();
		part.geometry.computeBoundingSphere();
		center.copy( part.geometry.boundingSphere.center ).applyMatrix4( part.matrixWorld );
		const target = center.clone().add( new THREE.Vector3( ( Math.random() - 0.5 ) * 0.08, ( Math.random() - 0.5 ) * 0.12, 0 ) );
		const dir = target.clone().sub( camera.position ).normalize();
		ray.set( camera.position, dir );
		const hit = ray.intersectObject( part, false )[ 0 ];
		if ( ! hit ) return;
		const n = hit.face.normal.clone().transformDirection( part.matrixWorld );
		const helper = new THREE.Object3D();
		helper.position.copy( hit.point );
		helper.lookAt( hit.point.clone().add( n ) );
		helper.rotation.z = Math.random() * Math.PI * 2;
		const size = this.kind === 'teacher' ? 0.26 : 0.2;
		const geo = new DecalGeometry( part, hit.point, helper.rotation, new THREE.Vector3( size, size, size ) );
		geo.applyMatrix4( part.matrixWorld.clone().invert() );
		if ( ! Fighter.decalMats ) Fighter.decalMats = {};
		if ( ! Fighter.decalMats[ kind ] ) {

			Fighter.decalMats[ kind ] = new THREE.MeshStandardMaterial( {
				map: decalTexture( kind ), transparent: true, depthTest: true, depthWrite: false,
				polygonOffset: true, polygonOffsetFactor: - 4, roughness: 0.7,
			} );

		}

		const decal = new THREE.Mesh( geo, Fighter.decalMats[ kind ] );
		decal.renderOrder = 2;
		part.add( decal );
		this.wounds.push( decal );

	}

	clearWounds() {

		this.wounds.forEach( w => {

			w.parent && w.parent.remove( w );
			w.geometry.dispose();

		} );
		this.wounds = [];

	}

	// Wind- and motion-driven cloth chains (headband tails, tie, scarf).
	addClothChain( parent, segs, segLen, width, mat, opts = {} ) {

		const chain = [];
		let p = parent;
		for ( let i = 0; i < segs; i ++ ) {

			const g = new THREE.Group();
			if ( i > 0 ) g.position.y = - segLen;
			p.add( g );
			const m = new THREE.Mesh( new THREE.BoxGeometry( width * ( 1 - i * 0.08 ), segLen, opts.thick || 0.012 ), mat );
			m.position.y = - segLen / 2;
			m.castShadow = true;
			g.add( m );
			chain.push( g );
			p = g;

		}

		this.cloth.push( { chain, phase: Math.random() * 6, ...opts } );
		return chain;

	}

	update( dt ) {

		this._t += dt;
		const t = this._t;
		if ( this.idleOn ) {

			const a = this.idleAmp;
			this.body.position.y = Math.sin( t * 3.2 ) * 0.018 * a;
			this.body.rotation.z = Math.sin( t * 1.6 ) * 0.015 * a;

		}

		const w = wind.strength;
		for ( const c of this.cloth ) {

			c.chain.forEach( ( g, i ) => {

				const f = Math.sin( t * ( 6 + w * 4 ) - i * 0.9 + c.phase ) * ( 0.15 + w * 0.25 );
				if ( c.mode === 'tail' ) {

					g.rotation.x = ( i === 0 ? c.baseX : 0 ) + f * 0.7 - w * 0.1;
					g.rotation.z = f * 0.4 + ( i === 0 ? c.baseZ || 0 : 0 );

				} else {

					g.rotation.x = ( i === 0 ? - 0.25 - w * 0.15 : 0 ) + f * 0.35;
					g.rotation.z = f * 0.3 + ( i === 0 ? c.baseZ || 0 : 0 );

				}

			} );

		}

	}

}

// ------------------------------------------------------------------ Teacher

export class Teacher extends Fighter {

	constructor() {

		super( 'teacher' );
		this.stanceName = 'stanceTeacher';
		this.face = new TeacherFace();
		const D = { foot: 0.08, shin: 0.43, thigh: 0.42, spine: 0.2, chestH: 0.36, neck: 0.07, headR: 0.14, shW: 0.3, hipW: 0.12, upper: 0.29, fore: 0.27 };
		this.skeleton( D );

		const skin = this.mat( { color: 0xc98f6b, roughness: 0.65 } );
		const shirt = this.mat( { map: shirtTexture(), roughness: 0.85 } );
		const vest = this.mat( { map: vestTexture(), roughness: 0.95, side: THREE.DoubleSide } );
		const trousers = this.mat( { map: trouserTexture(), roughness: 0.9 } );
		const shoe = this.mat( { color: 0x3a2416, roughness: 0.4 } );
		const belt = this.mat( { color: 0x231a14, roughness: 0.5 } );
		const gold = this.mat( { color: 0xc9a54a, metalness: 0.8, roughness: 0.3 } );
		const tie = this.mat( { color: 0x9e1b22, roughness: 0.6, side: THREE.DoubleSide } );
		const hair = this.mat( { color: 0x5a4c42, roughness: 0.9 } );
		this.skinMat = skin;

		// legs
		[ 'L', 'R' ].forEach( s => {

			this.limb( 'th' + s, 0.115, D.thigh + 0.06, trousers );
			this.limb( 'kn' + s, 0.095, D.shin + 0.04, trousers );
			this.mesh( new THREE.BoxGeometry( 0.15, 0.09, 0.3 ), shoe, 'ft' + s, [ 0, - 0.03, 0.07 ] );

		} );

		// pelvis + belt + untucked shirt flap
		this.mesh( new THREE.SphereGeometry( 1, 20, 14 ), trousers, 'hips', [ 0, 0, 0 ], [ 0.23, 0.15, 0.17 ] );
		this.mesh( new THREE.CylinderGeometry( 0.215, 0.22, 0.06, 24 ), belt, 'hips', [ 0, 0.09, 0 ], [ 1, 1, 0.8 ] );
		this.mesh( new THREE.BoxGeometry( 0.07, 0.05, 0.02 ), gold, 'hips', [ 0, 0.09, 0.18 ] );
		this.mesh( new THREE.BoxGeometry( 0.12, 0.09, 0.02 ), shirt, 'hips', [ - 0.13, 0.05, 0.15 ], null, [ 0.1, - 0.5, 0.2 ] );

		// belly + chest (big)
		const belly = this.mesh( new THREE.SphereGeometry( 1, 24, 16 ), shirt, 'spine', [ 0, 0.1, 0.01 ], [ 0.23, 0.2, 0.19 ] );
		const chest = this.mesh( new THREE.SphereGeometry( 1, 28, 18 ), shirt, 'chest', [ 0, 0.17, 0 ], [ 0.31, 0.25, 0.2 ] );
		this.woundParts.push( belly, chest, chest );
		[ - 1, 1 ].forEach( s => {

			this.mesh( new THREE.SphereGeometry( 1, 18, 12 ), shirt, 'chest', [ s * 0.11, 0.2, 0.12 ], [ 0.13, 0.11, 0.09 ] );
			// traps
			this.mesh( new THREE.SphereGeometry( 1, 14, 10 ), shirt, 'chest', [ s * 0.15, 0.36, - 0.02 ], [ 0.13, 0.07, 0.1 ] );

		} );
		// vest: open-front shell
		const vestGeo = new THREE.CylinderGeometry( 0.33, 0.25, 0.5, 28, 1, true, 0.42, Math.PI * 2 - 0.84 );
		this.mesh( vestGeo, vest, 'chest', [ 0, 0.12, - 0.005 ], [ 1, 1, 0.72 ] );
		this.mesh( new THREE.CylinderGeometry( 0.26, 0.24, 0.18, 28, 1, true, 0.5, Math.PI * 2 - 1.0 ), vest, 'spine', [ 0, 0.12, 0 ], [ 1, 1, 0.85 ] );
		// vest buttons on the left flap
		for ( let i = 0; i < 3; i ++ ) this.mesh( new THREE.SphereGeometry( 0.012, 6, 6 ), gold, 'chest', [ 0.11, 0.18 - i * 0.12, 0.2 ] );
		// collar
		[ - 1, 1 ].forEach( s => this.mesh( new THREE.BoxGeometry( 0.09, 0.05, 0.02 ), shirt, 'chest', [ s * 0.05, 0.39, 0.12 ], null, [ - 0.3, 0, s * 0.6 ] ) );
		// loosened tie, knot pulled down and askew
		const tieRoot = new THREE.Group();
		tieRoot.position.set( 0.02, 0.36, 0.17 );
		tieRoot.rotation.z = 0.12;
		this.j.chest.add( tieRoot );
		this.mesh( new THREE.BoxGeometry( 0.05, 0.05, 0.03 ), tie, tieRoot, [ 0, 0, 0.01 ] );
		this.addClothChain( tieRoot, 4, 0.08, 0.075, tie, { mode: 'tie', thick: 0.01 } );

		// neck + head
		this.mesh( new THREE.CylinderGeometry( 0.1, 0.12, 0.14, 16 ), skin, 'neck', [ 0, 0.03, 0 ] );
		const R = D.headR;
		const headGroup = new THREE.Group();
		headGroup.position.y = R * 0.95;
		this.j.head.add( headGroup );
		this.headGroup = headGroup;
		this.mesh( new THREE.SphereGeometry( R, 32, 24 ), skin, headGroup, [ 0, 0, 0 ], [ 1, 1.08, 1.02 ] );
		// jaw
		this.mesh( new THREE.SphereGeometry( R * 0.82, 20, 14 ), skin, headGroup, [ 0, - R * 0.45, 0.02 ], [ 1.05, 0.7, 1 ] );
		// face patch (photo)
		const faceGeo = new THREE.SphereGeometry( R * 1.012, 40, 32, Math.PI / 2 - 1.15, 2.3, 0.3, 1.95 );
		this.faceMesh = this.mesh( faceGeo, new THREE.MeshStandardMaterial( { map: this.face.texture, roughness: 0.7, transparent: false } ), headGroup, [ 0, 0, 0 ], [ 1, 1.08, 1.02 ] );
		this.materials.push( this.faceMesh.material );
		// hair cap at back/top + ears
		this.mesh( new THREE.SphereGeometry( R * 1.04, 24, 16, 0, Math.PI * 2, 0, 1.25 ), hair, headGroup, [ 0, 0.008, - 0.035 ], [ 1, 1.08, 1.02 ], [ - 0.5, 0, 0 ] );
		[ - 1, 1 ].forEach( s => this.mesh( new THREE.SphereGeometry( 0.035, 10, 8 ), skin, headGroup, [ s * R * 0.98, - 0.01, - 0.01 ], [ 0.5, 1, 0.8 ] ) );

		// arms: huge deltoids, biceps, rolled sleeves, thick forearms
		[ [ 'L', 1 ], [ 'R', - 1 ] ].forEach( ( [ s, sg ] ) => {

			this.mesh( new THREE.SphereGeometry( 0.13, 18, 14 ), shirt, 'sh' + s, [ sg * 0.02, - 0.02, 0 ] );
			this.limb( 'sh' + s, 0.105, D.upper + 0.05, shirt );
			this.mesh( new THREE.SphereGeometry( 0.095, 16, 12 ), shirt, 'sh' + s, [ 0, - D.upper * 0.5, 0.035 ], [ 1, 1.2, 1 ] );
			this.mesh( new THREE.TorusGeometry( 0.088, 0.03, 8, 18 ), shirt, 'el' + s, [ 0, - 0.02, 0 ], null, [ Math.PI / 2, 0, 0 ] );
			const fore = this.limb( 'el' + s, 0.088, D.fore + 0.03, skin );
			fore.scale.set( 1.05, 1, 0.95 );
			// fist
			this.mesh( new THREE.BoxGeometry( 0.12, 0.12, 0.13 ), skin, 'ha' + s, [ 0, - 0.05, 0.01 ] );
			this.mesh( new THREE.SphereGeometry( 0.04, 8, 6 ), skin, 'ha' + s, [ - sg * 0.055, - 0.04, 0.05 ] );

		} );

		// weapons (props)
		this.ruler = makeRuler();
		this.book = makeBook();
		this.chalk = makeChalk();

		this.root.traverse( o => {

			if ( o.isMesh ) o.castShadow = true;

		} );
		this.root.scale.setScalar( 1.16 );
		this.pose( 'stanceTeacher', 0 );

	}

	setPhoto( img ) {

		this.face.setPhoto( img );

	}

	applyInjury( n, camera ) {

		this.face.setInjuries( n );
		const kinds = [ 'bruise', 'claw', 'tear', 'scar' ];
		this.addWound( kinds[ ( n - 1 ) % kinds.length ], camera );
		this.addWound( n % 2 ? 'bruise' : 'scar', camera );

	}

	reset() {

		this.hp = 4;
		this.face.setInjuries( 0 );
		this.clearWounds();
		[ this.ruler, this.book ].forEach( p => p.parent && p.parent.remove( p ) );

	}

}

// ------------------------------------------------------------------ Ninja

export const WEAPON_ORDER = [ 'katana', 'nunchaku', 'shuriken', 'kunai' ];

export class Ninja extends Fighter {

	constructor() {

		super( 'ninja' );
		this.stanceName = 'stanceNinja';
		this.mask = new NinjaMask();
		const D = { foot: 0.07, shin: 0.42, thigh: 0.41, spine: 0.17, chestH: 0.31, neck: 0.07, headR: 0.125, shW: 0.19, hipW: 0.09, upper: 0.28, fore: 0.26 };
		this.skeleton( D );

		const cloth = this.mat( { map: ninjaClothTexture(), roughness: 0.9 } );
		const cloth2 = this.mat( { map: ninjaClothTexture( '#272f55' ), roughness: 0.9 } );
		const wrap = this.mat( { map: wrapTexture(), roughness: 1 } );
		const red = this.mat( { color: 0xb3202a, roughness: 0.6, side: THREE.DoubleSide } );
		const metal = this.mat( { color: 0x8d96a8, metalness: 0.85, roughness: 0.3 } );
		const leather = this.mat( { color: 0x3a2a20, roughness: 0.7 } );
		const tabi = this.mat( { color: 0x15182a, roughness: 0.8 } );

		[ 'L', 'R' ].forEach( s => {

			this.limb( 'th' + s, 0.085, D.thigh + 0.05, cloth );
			this.limb( 'kn' + s, 0.062, D.shin + 0.03, wrap );
			this.mesh( new THREE.BoxGeometry( 0.1, 0.07, 0.24 ), tabi, 'ft' + s, [ 0, - 0.025, 0.06 ] );
			// shin guard
			this.mesh( new THREE.BoxGeometry( 0.07, 0.24, 0.03 ), metal, 'kn' + s, [ 0, - 0.2, 0.06 ] );

		} );

		this.mesh( new THREE.SphereGeometry( 1, 18, 12 ), cloth, 'hips', [ 0, 0, 0 ], [ 0.17, 0.12, 0.13 ] );
		this.mesh( new THREE.CylinderGeometry( 0.15, 0.16, 0.08, 20 ), red, 'hips', [ 0, 0.08, 0 ], [ 1, 1, 0.85 ] );
		// obi knot tails
		this.addClothChain( this.j.hips, 3, 0.08, 0.05, red, { mode: 'tail', baseX: 0.3, baseZ: 0.2 } ).forEach( () => {} );
		const belly = this.mesh( new THREE.CapsuleGeometry( 0.13, 0.08, 6, 14 ), cloth2, 'spine', [ 0, 0.08, 0 ], [ 1, 1, 0.8 ] );
		const chest = this.mesh( new THREE.SphereGeometry( 1, 24, 16 ), cloth, 'chest', [ 0, 0.15, 0 ], [ 0.2, 0.2, 0.14 ] );
		this.woundParts.push( belly, chest, chest );
		// crossed lapel
		this.mesh( new THREE.BoxGeometry( 0.05, 0.3, 0.01 ), cloth2, 'chest', [ 0.02, 0.15, 0.135 ], null, [ 0, 0, 0.5 ] );
		// bandolier strap across chest
		const strap = this.mesh( new THREE.BoxGeometry( 0.05, 0.52, 0.02 ), leather, 'chest', [ 0, 0.14, 0.14 ], null, [ 0.15, 0, - 0.75 ] );
		strap.castShadow = false;
		// scarf
		this.mesh( new THREE.TorusGeometry( 0.085, 0.035, 8, 16 ), red, 'neck', [ 0, 0.0, 0 ], null, [ Math.PI / 2, 0, 0 ] );
		const scarfRoot = new THREE.Group();
		scarfRoot.position.set( - 0.03, 0.0, - 0.08 );
		this.j.neck.add( scarfRoot );
		this.addClothChain( scarfRoot, 5, 0.1, 0.08, red, { mode: 'tail', baseX: 1.2, baseZ: - 0.2 } );

		// head with hood + face mask texture
		const R = D.headR;
		const headGroup = new THREE.Group();
		headGroup.position.y = R * 0.95;
		this.j.head.add( headGroup );
		this.headGroup = headGroup;
		this.mesh( new THREE.SphereGeometry( R, 28, 20 ), cloth, headGroup, [ 0, 0, 0 ], [ 1, 1.1, 1.05 ] );
		const maskGeo = new THREE.SphereGeometry( R * 1.01, 36, 28, Math.PI / 2 - 0.95, 1.9, 0.45, 1.8 );
		this.maskMesh = this.mesh( maskGeo, new THREE.MeshStandardMaterial( { map: this.mask.texture, roughness: 0.85 } ), headGroup, [ 0, 0, 0 ], [ 1, 1.1, 1.05 ] );
		this.materials.push( this.maskMesh.material );
		// headband + tails
		this.mesh( new THREE.TorusGeometry( R * 1.04, 0.016, 6, 28 ), red, headGroup, [ 0, R * 0.42, 0 ], [ 1, 1, 1.03 ], [ Math.PI / 2 + 0.15, 0, 0 ] );
		const plate = this.mesh( new THREE.BoxGeometry( 0.09, 0.04, 0.01 ), metal, headGroup, [ 0, R * 0.47, R * 1.05 ], null, [ - 0.15, 0, 0 ] );
		plate.castShadow = false;
		const knot = new THREE.Group();
		knot.position.set( 0, R * 0.35, - R * 1.02 );
		headGroup.add( knot );
		this.addClothChain( knot, 5, 0.09, 0.035, red, { mode: 'tail', baseX: 1.3, baseZ: 0.25 } );
		this.addClothChain( knot, 5, 0.085, 0.03, red, { mode: 'tail', baseX: 1.1, baseZ: - 0.25 } );

		[ [ 'L', 1 ], [ 'R', - 1 ] ].forEach( ( [ s, sg ] ) => {

			this.mesh( new THREE.SphereGeometry( 0.07, 14, 10 ), cloth, 'sh' + s );
			// shoulder guard
			this.mesh( new THREE.SphereGeometry( 0.085, 14, 8, 0, Math.PI * 2, 0, 1.2 ), metal, 'sh' + s, [ sg * 0.01, 0.01, 0 ], [ 1, 0.8, 1 ], [ 0, 0, sg * - 0.6 ] );
			this.limb( 'sh' + s, 0.058, D.upper + 0.03, cloth );
			this.limb( 'el' + s, 0.05, D.fore + 0.02, wrap );
			// bracer
			this.mesh( new THREE.CylinderGeometry( 0.058, 0.052, 0.16, 12, 1, true, - 0.8, 1.6 ), metal, 'el' + s, [ 0, - 0.14, 0 ] );
			this.mesh( new THREE.BoxGeometry( 0.075, 0.09, 0.06 ), tabi, 'ha' + s, [ 0, - 0.04, 0.005 ] );

		} );

		// ---- weapons and their holsters ----
		this.weapons = {};
		const katana = makeKatana();
		const sheath = new THREE.Mesh( new THREE.CylinderGeometry( 0.022, 0.018, 0.78, 10 ), this.mat( { color: 0x111216, roughness: 0.35 } ) );
		sheath.rotation.x = Math.PI / 2;
		sheath.position.z = 0.48;
		const sheathHolder = new THREE.Group();
		sheathHolder.add( sheath );
		const backDir = dirEuler( 0.5, - 0.86, - 0.12 );
		sheathHolder.position.set( - 0.12, 0.42, - 0.17 );
		sheathHolder.rotation.set( ...backDir );
		this.j.chest.add( sheathHolder );
		this.addWeapon( 'katana', katana, this.j.chest, [ - 0.12, 0.42, - 0.17 ], backDir );

		const nunchaku = makeNunchaku();
		this.addWeapon( 'nunchaku', nunchaku, this.j.hips, [ 0.15, 0.06, 0.02 ], dirEuler( 0.15, - 1, 0.2 ) );

		const shuriken = new THREE.Group();
		for ( let i = 0; i < 3; i ++ ) {

			const s = makeShuriken();
			s.position.set( 0, i * 0.09, 0 );
			shuriken.add( s );

		}

		this.addWeapon( 'shuriken', shuriken, this.j.chest, [ - 0.06, 0.08, 0.15 ], [ 0, 0, - 0.75 ] );

		const kunai = makeKunai();
		this.addWeapon( 'kunai', kunai, this.j.thR, [ - 0.1, - 0.12, 0.0 ], dirEuler( - 0.05, - 1, 0.05 ) );
		// thigh strap
		this.mesh( new THREE.TorusGeometry( 0.088, 0.012, 6, 16 ), leather, 'thR', [ 0, - 0.2, 0 ], null, [ Math.PI / 2, 0, 0 ] );

		this.root.traverse( o => {

			if ( o.isMesh ) o.castShadow = true;

		} );
		this.pose( 'stanceNinja', 0 );

	}

	addWeapon( name, obj, parent, pos, rot ) {

		obj.position.set( ...pos );
		obj.rotation.set( ...rot );
		parent.add( obj );
		this.weapons[ name ] = { obj, parent, pos, rot, lost: false };

	}

	available() {

		return WEAPON_ORDER.filter( n => ! this.weapons[ n ].lost );

	}

	// Move a weapon into the right hand (blade along hand +Z).
	grab( name, hand = 'haR', dur = 0.12, grip = [ 0, - 0.06, 0.02 ], rot = [ 0, 0, 0 ] ) {

		const w = this.weapons[ name ];
		this.j[ hand ].attach( w.obj );
		return Promise.all( [
			tweenXYZ( w.obj.position, grip, dur, ease.out ),
			tweenXYZ( w.obj.rotation, rot, dur, ease.out ),
		] );

	}

	holster( name, dur = 0.15 ) {

		const w = this.weapons[ name ];
		if ( w.lost ) return Promise.resolve();
		w.parent.attach( w.obj );
		return Promise.all( [
			tweenXYZ( w.obj.position, w.pos, dur, ease.out ),
			tweenXYZ( w.obj.rotation, w.rot, dur, ease.out ),
		] );

	}

	applyInjury( n, camera ) {

		this.mask.setInjuries( n );
		this.addWound( 'tear', camera );
		this.addWound( n % 2 ? 'scar' : 'bruise', camera );

	}

	reset() {

		this.hp = 4;
		this.mask.setInjuries( 0 );
		this.clearWounds();
		for ( const n of WEAPON_ORDER ) {

			const w = this.weapons[ n ];
			w.lost = false;
			w.parent.add( w.obj );
			w.obj.position.set( ...w.pos );
			w.obj.rotation.set( ...w.rot );
			w.obj.scale.setScalar( 1 );

		}

		this.weapons.nunchaku.obj.userData.hinge.rotation.set( 0, 0, 0 );

	}

}

// ------------------------------------------------------------------ props

const metalMat = () => new THREE.MeshStandardMaterial( { color: 0xd6dde8, metalness: 1, roughness: 0.18, emissive: 0x000000 } );

export function makeKatana() {

	const g = new THREE.Group();
	const handle = new THREE.Mesh( new THREE.CylinderGeometry( 0.02, 0.02, 0.24, 8 ), new THREE.MeshStandardMaterial( { color: 0x1c1c28, roughness: 0.8 } ) );
	handle.rotation.x = Math.PI / 2;
	handle.position.z = - 0.06;
	g.add( handle );
	// wrap diamonds
	for ( let i = 0; i < 5; i ++ ) {

		const d = new THREE.Mesh( new THREE.BoxGeometry( 0.044, 0.012, 0.025 ), new THREE.MeshStandardMaterial( { color: 0xe6d9b8 } ) );
		d.position.z = - 0.15 + i * 0.045;
		d.rotation.z = Math.PI / 4;
		g.add( d );

	}

	const tsuba = new THREE.Mesh( new THREE.CylinderGeometry( 0.05, 0.05, 0.012, 16 ), new THREE.MeshStandardMaterial( { color: 0xc9a54a, metalness: 0.8, roughness: 0.3 } ) );
	tsuba.rotation.x = Math.PI / 2;
	tsuba.position.z = 0.07;
	g.add( tsuba );
	// slightly curved blade, three segments
	const bladeMat = metalMat();
	for ( let i = 0; i < 3; i ++ ) {

		const b = new THREE.Mesh( new THREE.BoxGeometry( 0.008, 0.032 - i * 0.004, 0.26 ), bladeMat );
		b.position.set( 0, i * i * 0.006, 0.2 + i * 0.255 );
		b.rotation.x = - i * 0.04;
		b.castShadow = true;
		g.add( b );

	}

	const tip = new THREE.Mesh( new THREE.ConeGeometry( 0.013, 0.08, 4 ), bladeMat );
	tip.rotation.x = Math.PI / 2;
	tip.position.set( 0, 0.03, 0.88 );
	g.add( tip );
	g.userData.tipLocal = new THREE.Vector3( 0, 0.03, 0.9 );
	return g;

}

export function makeNunchaku() {

	const g = new THREE.Group();
	const wood = new THREE.MeshStandardMaterial( { color: 0x6b3b1e, roughness: 0.5 } );
	const stick = new THREE.Mesh( new THREE.CylinderGeometry( 0.018, 0.02, 0.3, 10 ), wood );
	stick.rotation.x = Math.PI / 2;
	stick.position.z = 0.08;
	g.add( stick );
	const hinge = new THREE.Group();
	hinge.position.z = 0.24;
	g.add( hinge );
	const chain = new THREE.Mesh( new THREE.CylinderGeometry( 0.005, 0.005, 0.08, 4 ), new THREE.MeshStandardMaterial( { color: 0xaaaaaa, metalness: 1, roughness: 0.3 } ) );
	chain.rotation.x = Math.PI / 2;
	chain.position.z = 0.0;
	hinge.add( chain );
	const stick2 = stick.clone();
	stick2.position.z = 0.19;
	hinge.add( stick2 );
	g.userData.hinge = hinge;
	return g;

}

let shurikenGeo = null;
export function makeShuriken() {

	if ( ! shurikenGeo ) {

		const s = new THREE.Shape();
		for ( let i = 0; i < 8; i ++ ) {

			const a = i / 8 * Math.PI * 2;
			const r = i % 2 === 0 ? 0.07 : 0.018;
			if ( i === 0 ) s.moveTo( Math.cos( a ) * r, Math.sin( a ) * r );
			else s.lineTo( Math.cos( a ) * r, Math.sin( a ) * r );

		}

		const hole = new THREE.Path();
		hole.absarc( 0, 0, 0.008, 0, Math.PI * 2, true );
		s.holes.push( hole );
		shurikenGeo = new THREE.ExtrudeGeometry( s, { depth: 0.006, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.003, bevelSegments: 1 } );
		shurikenGeo.center();

	}

	const m = new THREE.Mesh( shurikenGeo, metalMat() );
	m.castShadow = true;
	return m;

}

export function makeKunai() {

	const g = new THREE.Group();
	const blade = new THREE.Mesh( new THREE.ConeGeometry( 0.028, 0.18, 4 ), metalMat() );
	blade.rotation.x = Math.PI / 2;
	blade.scale.set( 1, 1, 0.3 );
	blade.position.z = 0.15;
	g.add( blade );
	const grip = new THREE.Mesh( new THREE.CylinderGeometry( 0.012, 0.012, 0.11, 8 ), new THREE.MeshStandardMaterial( { color: 0x2a1c14 } ) );
	grip.rotation.x = Math.PI / 2;
	g.add( grip );
	const ring = new THREE.Mesh( new THREE.TorusGeometry( 0.02, 0.005, 6, 12 ), metalMat() );
	ring.position.z = - 0.075;
	ring.rotation.y = Math.PI / 2;
	g.add( ring );
	return g;

}

function makeRuler() {

	const g = new THREE.Group();
	const m = new THREE.Mesh( new THREE.BoxGeometry( 0.12, 0.018, 1.25 ), [
		new THREE.MeshStandardMaterial( { color: 0xb98340 } ), new THREE.MeshStandardMaterial( { color: 0xb98340 } ),
		new THREE.MeshStandardMaterial( { map: rulerTexture(), roughness: 0.6 } ), new THREE.MeshStandardMaterial( { color: 0xb98340 } ),
		new THREE.MeshStandardMaterial( { color: 0xb98340 } ), new THREE.MeshStandardMaterial( { color: 0xb98340 } ),
	] );
	m.material[ 2 ].map.rotation = Math.PI / 2;
	m.material[ 2 ].map.center.set( 0.5, 0.5 );
	m.position.z = 0.55;
	m.castShadow = true;
	g.add( m );
	g.userData.tipLocal = new THREE.Vector3( 0, 0, 1.15 );
	return g;

}

function makeBook() {

	const g = new THREE.Group();
	const cover = new THREE.MeshStandardMaterial( { map: bookTexture(), roughness: 0.7 } );
	const pages = new THREE.MeshStandardMaterial( { color: 0xf1ead8, roughness: 0.9 } );
	const spine = new THREE.MeshStandardMaterial( { color: 0x6a1418, roughness: 0.7 } );
	const m = new THREE.Mesh( new THREE.BoxGeometry( 0.12, 0.5, 0.36 ), [ cover, cover, pages, pages, pages, spine ] );
	m.position.set( 0, 0, 0.2 );
	m.rotation.y = Math.PI / 2;
	m.castShadow = true;
	g.add( m );
	return g;

}

function makeChalk() {

	const m = new THREE.Mesh( new THREE.CylinderGeometry( 0.018, 0.018, 0.11, 8 ), new THREE.MeshStandardMaterial( { color: 0xfafaf4, roughness: 1, emissive: 0x222222 } ) );
	m.castShadow = true;
	return m;

}
