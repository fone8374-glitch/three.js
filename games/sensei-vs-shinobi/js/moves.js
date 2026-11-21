import * as THREE from 'three';
import { clock, wait, tweenXYZ, tween, tweenNum, ease } from './tween.js';
import { sfx, announce } from './audio.js';
import { callout, screenFlash, speedLines, inkSplash } from './fx.js';
import { makeShuriken, makeKunai, POSES } from './fighters.js';
import { t, getLang } from './i18n.js';

export const T_HOME = - 1.55, N_HOME = 1.55;
export const FACE_T = Math.PI / 2 - 0.32, FACE_N = - ( Math.PI / 2 - 0.32 );

const V = ( x, y, z ) => new THREE.Vector3( x, y, z );

// ---------------------------------------------------------------- shared helpers

function impact( G, target, pos, { power = 1, sound = 'punch', text, color = 0xffd27a, shake } = {} ) {

	clock.hitstop = Math.max( clock.hitstop, 0.05 + 0.05 * power );
	G.cam.shake( shake ?? 0.12 + 0.18 * power );
	G.fx.flash( pos, 0.6 + power * 0.5 );
	G.fx.sparks( pos, { count: Math.round( 16 + 26 * power ), color, speed: 4 + power * 3 } );
	if ( sound && sfx[ sound ] ) sfx[ sound ]( power );
	target.flash( 0xffffff, 0.18 );
	if ( text ) callout( text, G.project( pos ), { size: 0.7 + power * 0.35 } );

}

async function react( f, dir, power = 1, kind = 'hitHigh' ) {

	f.pose( kind, 0.07, ease.out );
	tweenXYZ( f.root.position, [ f.root.position.x + dir * 0.25 * power, 0, f.root.position.z ], 0.18, ease.out );
	await wait( 0.22 + 0.1 * power );
	if ( f.hp > 0 ) f.stance( 0.25 );

}

async function dash( G, f, x, dur = 0.16, ghosts = true ) {

	sfx.whoosh( 0.8 );
	if ( ghosts ) {

		const n = 4;
		for ( let i = 0; i < n; i ++ ) setTimeout( () => G.fx.ghost( f, f.kind === 'ninja' ? 0x7fc8ff : 0xff8a5a, 0.35 ), i * dur * 1000 / n );

	}

	G.fx.dust( f.root.position, 10 );
	await f.moveTo( x, dur, ease.out );

}

// Heavy stomping walk for the teacher.
async function stomp( G, f, x, dur = 0.5 ) {

	const steps = 3;
	const from = f.root.position.x;
	for ( let i = 0; i < steps; i ++ ) {

		const nx = from + ( x - from ) * ( i + 1 ) / steps;
		f.pose( i % 2 ? { thL: [ - 0.7, 0, 0.1 ], knL: [ 0.7, 0, 0 ] } : { thR: [ - 0.5, 0, - 0.1 ], knR: [ 0.8, 0, 0 ] }, dur / steps * 0.5 );
		await f.moveTo( nx, dur / steps, ease.inOut );
		sfx.punch( 0.35 );
		G.cam.shake( 0.05 );
		G.fx.dust( f.root.position, 6 );

	}

	f.stance( 0.12 );

}

function faceToward( f, dirX ) {

	f.root.rotation.y = dirX > 0 ? FACE_T : FACE_N;

}

// ---------------------------------------------------------------- damage application

function damageNinja( G, power = 1.2 ) {

	const n = G.ninja;
	n.hp = Math.max( 0, n.hp - 1 );
	n.applyInjury( 4 - n.hp, G.camera );
	G.hud.setHP( 'ninja', n.hp );
	// lose a weapon
	const left = n.available();
	if ( left.length ) {

		const name = left[ Math.floor( Math.random() * left.length ) ];
		const w = n.weapons[ name ];
		w.lost = true;
		const body = G.fx.dropProp( w.obj, V( 1.5 + Math.random() * 2, 4 + Math.random() * 2, ( Math.random() - 0.2 ) * 2 ), V( Math.random() * 14, Math.random() * 10, Math.random() * 14 ) );
		body.onBounce = () => {

			sfx.drop();
			G.fx.sparks( w.obj.position.clone(), { count: 12, color: 0xffffff, speed: 3, size: 0.06 } );

		};
		G.hud.weaponLost( name );
		setTimeout( () => callout( t( 'lostWeapon', t( 'weapons' )[ name ] ), G.project( n.headPoint().add( V( 0, 0.5, 0 ) ) ), { size: 0.55, rotate: - 4, cls: 'callout-text' } ), 250 );

	}

	G.world.kickLeaves( n.root.position, 25, 4 * power );
	sfx.grunt( 1.3 );

}

function damageTeacher( G, power = 1.2 ) {

	const tc = G.teacher;
	tc.hp = Math.max( 0, tc.hp - 1 );
	tc.applyInjury( 4 - tc.hp, G.camera );
	G.hud.setHP( 'teacher', tc.hp );
	G.world.kickLeaves( tc.root.position, 25, 4 * power );
	sfx.grunt( 0.7 );

}

// ================================================================= TEACHER ATTACKS

async function rulerSmash( G ) {

	const { teacher: T, ninja: N } = G;
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.2, 0 ), 4.6, 0.5 );
	T.j.haR.add( T.ruler );
	T.ruler.position.set( 0, - 0.06, 0.02 );
	T.ruler.rotation.set( 0, 0, 0 );
	T.ruler.scale.setScalar( 0.2 );
	tweenXYZ( T.ruler.scale, [ 1, 1, 1 ], 0.3, ease.back );
	sfx.ruler();
	await stomp( G, T, N.x - 1.75, 0.5 );
	await T.pose( 'overhead', 0.28, ease.out );
	sfx.whoosh( 1.3 );
	await T.pose( 'smash', 0.1, ease.in );
	const p = N.headPoint();
	impact( G, N, p, { power: 1.4, sound: 'heavy', text: 'バシッ!' } );
	sfx.ruler();
	G.fx.shockwave( V( N.x, 0, 0 ) );
	G.fx.dust( N.root.position, 30 );
	damageNinja( G );
	screenFlash( '#fff', 120 );
	await react( N, 1, 1.4, 'hitBody' );
	await wait( 0.2 );
	await T.stance( 0.25 );
	T.j.haR.remove( T.ruler );
	await T.moveTo( T_HOME, 0.4 );

}

async function chalkBarrage( G ) {

	const { teacher: T, ninja: N } = G;
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.3, 0 ), 5, 0.4 );
	callout( '!', G.project( T.headPoint().add( V( 0, 0.3, 0 ) ) ), { size: 1.2, color: '#EF7B2D' } );
	for ( let i = 0; i < 6; i ++ ) {

		const big = i === 5;
		await T.pose( 'throwWind', big ? 0.25 : 0.07, ease.out );
		await T.pose( 'throw', 0.06, ease.in );
		sfx.whoosh( 0.5 );
		const c = T.chalk.clone();
		c.material = T.chalk.material;
		if ( big ) c.scale.setScalar( 4 );
		const from = T.worldPoint( 'haR', [ 0, - 0.05, 0 ] );
		const to = N.chestPoint().add( V( 0, ( Math.random() - 0.4 ) * 0.4, 0 ) );
		G.fx.projectile( c, from, to, { dur: big ? 0.25 : 0.16, arc: 0.1, spin: [ 25, 0, 30 ], trail: 0xffffff, trailSize: big ? 0.25 : 0.08 } ).then( () => {

			G.fx.chalkDust( to, big ? 60 : 18 );
			sfx.chalk();
			if ( big ) {

				impact( G, N, to, { power: 1.3, sound: 'heavy', text: 'ドン!', color: 0xffffff } );
				damageNinja( G );
				react( N, 1, 1.5, 'hitHigh' );

			} else {

				N.flash( 0xffffff, 0.1 );
				N.pose( 'hitHigh', 0.05 );
				setTimeout( () => N.hp > 0 && N.stance( 0.1 ), 90 );
				G.cam.shake( 0.05 );

			}

		} );
		if ( ! big ) await wait( 0.05 );

	}

	await wait( 0.7 );
	await T.stance( 0.25 );

}

async function bookSlam( G ) {

	const { teacher: T, ninja: N } = G;
	T.j.haR.add( T.book );
	T.book.position.set( 0, - 0.1, 0.02 );
	T.book.rotation.set( 0, 0, 0 );
	T.book.scale.setScalar( 0.2 );
	tweenXYZ( T.book.scale, [ 1.3, 1.3, 1.3 ], 0.3, ease.back );
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.2, 0 ), 4.4, 0.5 );
	await stomp( G, T, N.x - 1.15, 0.45 );
	await T.pose( 'swingBack', 0.3, ease.out );
	sfx.whoosh( 1.5 );
	await T.pose( 'swingThrough', 0.1, ease.in );
	const p = N.chestPoint();
	impact( G, N, p, { power: 1.6, sound: 'heavy', text: 'ドカッ!' } );
	damageNinja( G );
	speedLines( true, 500 );
	// spin away
	N.pose( 'hitHigh', 0.06 );
	const ry = N.root.rotation.y;
	tween( 0.55, k => {

		N.root.rotation.y = ry - k * Math.PI * 2;

	}, ease.out );
	await tweenXYZ( N.root.position, [ N.x + 0.9, 0, 0 ], 0.45, ease.out );
	N.root.rotation.y = FACE_N;
	G.fx.dust( N.root.position, 20 );
	if ( N.hp > 0 ) N.stance( 0.3 );
	await wait( 0.25 );
	await T.stance( 0.25 );
	T.j.haR.remove( T.book );
	await T.moveTo( T_HOME, 0.4 );

}

async function uppercutCombo( G ) {

	const { teacher: T, ninja: N } = G;
	G.cam.focus( V( N.x - 0.6, 1.3, 0 ), 4.0, 0.4 );
	await stomp( G, T, N.x - 1.0, 0.4 );
	await T.pose( 'punchL', 0.07, ease.snap );
	impact( G, N, N.headPoint(), { power: 0.5, text: 'バキ!' } );
	N.pose( 'hitHigh', 0.05 );
	await wait( 0.12 );
	await T.pose( 'punchR', 0.08, ease.snap );
	impact( G, N, N.chestPoint(), { power: 0.6 } );
	N.pose( 'hitBody', 0.05 );
	await wait( 0.12 );
	await T.pose( 'crouch', 0.15, ease.out );
	sfx.whoosh( 1.4 );
	await T.pose( 'uppercut', 0.1, ease.snap );
	impact( G, N, N.headPoint(), { power: 1.6, sound: 'heavy', text: 'ゴッ!' } );
	damageNinja( G );
	screenFlash( '#ffe0a0', 160 );
	// launch
	N.pose( 'hitHigh', 0.08 );
	await tweenXYZ( N.root.position, [ N.x + 0.6, 1.4, 0 ], 0.3, ease.out );
	await tweenXYZ( N.root.position, [ N.x + 0.3, 0, 0 ], 0.3, ease.in );
	sfx.punch( 1.2 );
	G.fx.dust( N.root.position, 28 );
	G.cam.shake( 0.2 );
	if ( N.hp > 0 ) N.pose( 'crouch', 0.1 );
	await wait( 0.25 );
	if ( N.hp > 0 ) N.stance( 0.3 );
	await T.stance( 0.2 );
	await T.moveTo( T_HOME, 0.4 );

}

export const TEACHER_ATTACKS = [ rulerSmash, chalkBarrage, bookSlam, uppercutCombo ];

// "FINISH HIM!" then the teacher's finisher on a dizzy ninja.
export async function teacherFinisher( G ) {

	const { teacher: T, ninja: N } = G;
	// ninja dizzy
	N.idleOn = false;
	N.pose( 'dizzy', 0.4 );
	const sway = { on: true };
	( async () => {

		let s = 1;
		while ( sway.on ) {

			tweenXYZ( N.body.rotation, [ 0, 0, 0.1 * s ], 0.5 );
			await wait( 0.5 );
			s *= - 1;

		}

	} )();
	G.cam.focus( V( N.x - 0.7, 1.25, 0 ), 3.8, 0.8 );
	await wait( 0.5 );
	G.hud.announce( t( 'finishHim' ), 'finish' );
	announce( 'Finish him!', { lang: 'en', pitch: 0.1, rate: 0.7 } );
	sfx.stinger();
	await wait( 2.0 );

	// teacher powers up
	G.cam.focus( V( T.x, 1.4, 0 ), 3.4, 0.5 );
	sfx.aura();
	G.fx.aura( T, 0xff4a1a, 1.6 );
	T.pose( 'aura', 0.4 );
	T.flash( 0xff3010, 1.2 );
	callout( '罰', G.project( T.headPoint().add( V( 0, 0.5, 0 ) ) ), { size: 2.2, color: '#C0262D', rotate: 0 } );
	await wait( 1.3 );

	// grab the giant textbook and leap
	T.j.haR.add( T.book );
	T.book.position.set( 0, - 0.1, 0.02 );
	T.book.rotation.set( 0, 0, 0 );
	T.book.scale.setScalar( 0.5 );
	tweenXYZ( T.book.scale, [ 3.2, 3.2, 3.2 ], 0.5, ease.back );
	G.cam.focus( V( ( T.x + N.x ) / 2, 2.2, 0 ), 7.5, 0.5 );
	await T.pose( 'crouch', 0.2 );
	sfx.whoosh( 2 );
	G.fx.dust( T.root.position, 30 );
	T.pose( 'overhead', 0.35 );
	await tweenXYZ( T.root.position, [ N.x - 1.6, 3.2, 0 ], 0.55, ease.out );
	await wait( 0.15 );
	clock.scale = 0.5;
	sfx.whoosh( 2 );
	T.pose( 'smash', 0.15, ease.in );
	await tweenXYZ( T.root.position, [ N.x - 1.6, 0, 0 ], 0.22, ease.in );
	clock.scale = 1;
	sway.on = false;
	// IMPACT
	const p = N.headPoint();
	clock.hitstop = 0.25;
	G.cam.shake( 1.0 );
	sfx.boom();
	sfx.heavy();
	screenFlash( '#fff', 300 );
	speedLines( true, 900 );
	G.fx.flash( p, 1.8 );
	G.fx.sparks( p, { count: 140, speed: 10, size: 0.18 } );
	G.fx.shockwave( V( N.x, 0, 0 ), { size: 8, life: 0.9 } );
	G.fx.shockwave( V( N.x, 0, 0 ), { size: 5, life: 0.6, color: 0xff8040 } );
	G.fx.dust( N.root.position, 60 );
	G.world.kickLeaves( N.root.position, 120, 8 );
	G.world.gustBurst( 1.5 );
	N.flash( 0xffffff, 0.4 );
	N.applyInjury( 4, G.camera );
	callout( 'ドォォン!', G.project( p ), { size: 2.0 } );
	// ninja launched and lands on his back
	N.pose( 'hitHigh', 0.1 );
	tween( 0.9, k => {

		N.body.rotation.x = - k * Math.PI * 2.5;

	}, ease.out );
	await tweenXYZ( N.root.position, [ N.x + 2.4, 2.0, 0 ], 0.45, ease.out );
	await tweenXYZ( N.root.position, [ N.x + 1.2, 0, 0 ], 0.4, ease.in );
	N.body.rotation.set( - Math.PI / 2, 0, 0 );
	N.body.position.y = 0.12;
	N.pose( 'lie', 0.2 );
	sfx.heavy();
	G.cam.shake( 0.4 );
	G.fx.dust( N.root.position, 40 );
	await wait( 0.6 );
	T.j.haR.remove( T.book );
	T.pose( 'victoryTeacher', 0.5 );
	G.cam.focus( V( T.x, 1.5, 0 ), 3.0, 1.0 );
	inkSplash( '罰', t( 'detention' ) );
	sfx.gong();
	await wait( 2.6 );

}

// ================================================================= NINJA ATTACKS

async function katanaCombo( G ) {

	const { teacher: T, ninja: N } = G;
	await N.pose( 'drawSword', 0.14, ease.out );
	sfx.slash();
	await N.grab( 'katana', 'haR', 0.1 );
	N.stance( 0.1 );
	G.cam.focus( V( T.x + 0.5, 1.3, 0 ), 4.2, 0.3 );
	await dash( G, N, T.x + 1.15, 0.16 );
	const facing = - 1;
	const hitAt = () => T.chestPoint();

	await N.pose( 'slashHigh', 0.09, ease.out );
	sfx.slash();
	await N.pose( 'slashDown', 0.07, ease.snap );
	G.fx.slash( hitAt(), { rotZ: 0.9, facing, radius: 0.95 } );
	impact( G, T, hitAt(), { power: 0.6, sound: 'clang', text: 'ズバッ!', color: 0xbfe4ff } );
	T.pose( 'hitBody', 0.06 );
	await wait( 0.1 );

	sfx.slash();
	await N.pose( 'slashSide', 0.08, ease.snap );
	G.fx.slash( hitAt().add( V( 0, 0.1, 0 ) ), { rotZ: 0.0, facing, radius: 1.05 } );
	impact( G, T, hitAt(), { power: 0.6, sound: 'clang', color: 0xbfe4ff } );
	T.pose( 'hitHigh', 0.06 );
	await wait( 0.1 );

	await N.pose( 'crouch', 0.08 );
	sfx.kiai();
	sfx.slash();
	await N.pose( 'slashUp', 0.08, ease.snap );
	tweenXYZ( N.root.position, [ N.x, 0.6, 0 ], 0.15, ease.out );
	G.fx.slash( hitAt(), { rotZ: - 1.6, facing, radius: 1.2, width: 0.5, color: 0xffffff } );
	impact( G, T, T.headPoint(), { power: 1.5, sound: 'slash', text: '斬!', color: 0xbfe4ff } );
	damageTeacher( G );
	screenFlash( '#dff2ff', 140 );
	react( T, - 1, 1.4, 'hitHigh' );
	await wait( 0.15 );
	await tweenXYZ( N.root.position, [ N.x, 0, 0 ], 0.15, ease.in );
	await dash( G, N, N_HOME, 0.2, false );
	await N.holster( 'katana', 0.15 );
	N.stance( 0.2 );
	await T.moveTo( T_HOME, 0.3 );

}

async function shurikenStorm( G ) {

	const { teacher: T, ninja: N } = G;
	G.cam.focus( V( 0, 1.8, 0 ), 6.2, 0.4 );
	sfx.whoosh( 1 );
	N.pose( 'tuck', 0.15 );
	tween( 0.5, k => {

		N.body.rotation.x = k * Math.PI * 2;

	}, ease.inOut );
	await tweenXYZ( N.root.position, [ N.x + 0.4, 1.9, 0 ], 0.5, ease.out );
	N.body.rotation.x = 0;
	const hits = [];
	for ( let i = 0; i < 3; i ++ ) {

		await N.pose( i % 2 ? 'punchL' : 'throw', 0.06, ease.snap );
		sfx.shuriken();
		const s = makeShuriken();
		s.scale.setScalar( 1.6 );
		const from = N.worldPoint( i % 2 ? 'haL' : 'haR' );
		const to = ( i === 1 ? T.headPoint() : T.chestPoint() ).add( V( 0, ( i - 1 ) * 0.15, 0.05 ) );
		hits.push( G.fx.projectile( s, from, to, { dur: 0.22, arc: 0.05, spin: [ 0, 0, 50 ], trail: 0xbfe4ff } ).then( () => {

			const last = i === 2;
			impact( G, T, to, { power: last ? 1.3 : 0.5, sound: 'clang', text: last ? 'シュッ!' : null, color: 0xbfe4ff } );
			T.pose( 'hitHigh', 0.05 );
			if ( last ) {

				damageTeacher( G );
				react( T, - 1, 1.2, 'hitHigh' );

			}

		} ) );
		await N.pose( 'tuck', 0.06 );

	}

	await tweenXYZ( N.root.position, [ N_HOME, 0, 0 ], 0.35, ease.in );
	G.fx.dust( N.root.position, 15 );
	N.stance( 0.15 );
	await Promise.all( hits );
	await wait( 0.4 );
	await T.moveTo( T_HOME, 0.3 );

}

async function nunchakuFlurry( G ) {

	const { teacher: T, ninja: N } = G;
	const nun = N.weapons.nunchaku.obj;
	await N.grab( 'nunchaku', 'haR', 0.1 );
	G.cam.focus( V( T.x + 0.4, 1.3, 0 ), 4.0, 0.3 );
	N.pose( 'spinWeapon', 0.12 );
	// spin it up
	let spinning = true;
	( async () => {

		while ( spinning ) {

			N.j.haR.rotation.y += 0.9;
			nun.userData.hinge.rotation.x = Math.sin( N.j.haR.rotation.y ) * 1.4;
			await wait( 0.016 );

		}

		N.j.haR.rotation.y = 0;
		nun.userData.hinge.rotation.x = 0;

	} )();
	sfx.whoosh( 0.6 );
	setTimeout( () => sfx.whoosh( 0.6 ), 150 );
	sfx.chain();
	await dash( G, N, T.x + 0.95, 0.3 );
	const poses = [ 'punchR', 'punchL', 'punchR', 'slashSide' ];
	for ( let i = 0; i < poses.length; i ++ ) {

		await N.pose( poses[ i ], 0.06, ease.snap );
		sfx.chain();
		const p = ( i % 2 ? T.headPoint() : T.chestPoint() ).add( V( 0, 0, 0.1 ) );
		impact( G, T, p, { power: 0.45, sound: 'punch', text: [ 'バシ!', 'ビシ!', 'バシ!', 'ドン!' ][ i ] } );
		T.pose( i % 2 ? 'hitHigh' : 'hitBody', 0.05 );
		await wait( 0.08 );

	}

	spinning = false;
	// spinning roundhouse finisher
	sfx.kiai();
	const ry = N.root.rotation.y;
	tween( 0.25, k => {

		N.root.rotation.y = ry + k * Math.PI * 2;

	}, ease.out );
	await N.pose( 'kickHigh', 0.18, ease.out );
	N.root.rotation.y = FACE_N;
	impact( G, T, T.headPoint(), { power: 1.5, sound: 'heavy', text: 'ドカッ!' } );
	damageTeacher( G );
	speedLines( true, 450 );
	react( T, - 1, 1.6, 'hitHigh' );
	await wait( 0.2 );
	await N.holster( 'nunchaku' );
	N.stance( 0.15 );
	await dash( G, N, N_HOME, 0.2, false );
	await wait( 0.2 );
	await T.moveTo( T_HOME, 0.3 );

}

async function kunaiAssassin( G ) {

	const { teacher: T, ninja: N } = G;
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.3, 0 ), 5.2, 0.3 );
	// smoke bomb vanish
	sfx.smoke();
	G.fx.puff( N.chestPoint(), { count: 40, size: 0.9, spread: 0.5 } );
	await wait( 0.12 );
	N.root.visible = false;
	await wait( 0.3 );
	// reappear behind the teacher
	N.root.position.x = T.x - 0.95;
	faceToward( N, 1 );
	sfx.teleport();
	G.fx.puff( V( N.x, 1, 0 ), { count: 25, size: 0.7 } );
	N.root.visible = true;
	G.cam.focus( V( T.x - 0.3, 1.3, 0 ), 3.6, 0.2 );
	callout( '!?', G.project( T.headPoint().add( V( 0, 0.3, 0 ) ) ), { size: 1.1, color: '#E3B341' } );
	await N.grab( 'kunai', 'haR', 0.08 );
	await N.pose( 'stab', 0.08, ease.snap );
	impact( G, T, T.chestPoint().add( V( - 0.15, 0, 0 ) ), { power: 0.8, sound: 'slash', text: 'グサッ!', color: 0xff5a5a } );
	T.pose( 'hitBody', 0.05 );
	await wait( 0.15 );
	// vault over the teacher with a kick
	N.pose( 'tuck', 0.1 );
	sfx.whoosh( 1.2 );
	tween( 0.4, k => {

		N.body.rotation.x = k * Math.PI * 2;

	}, ease.inOut );
	await tweenXYZ( N.root.position, [ T.x + 0.2, 2.2, 0 ], 0.25, ease.out );
	faceToward( N, - 1 );
	await tweenXYZ( N.root.position, [ T.x + 1.0, 0.9, 0 ], 0.15, ease.in );
	N.body.rotation.x = 0;
	await N.pose( 'flyingKick', 0.06, ease.snap );
	impact( G, T, T.headPoint(), { power: 1.5, sound: 'heavy', text: 'ドン!' } );
	damageTeacher( G );
	react( T, - 1, 1.5, 'hitHigh' );
	await tweenXYZ( N.root.position, [ T.x + 1.6, 0, 0 ], 0.25, ease.in );
	await N.holster( 'kunai', 0.12 );
	N.stance( 0.15 );
	await dash( G, N, N_HOME, 0.2, false );
	await T.moveTo( T_HOME, 0.3 );

}

async function flyingKick( G ) {

	const { teacher: T, ninja: N } = G;
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.5, 0 ), 5.2, 0.3 );
	await N.pose( 'crouch', 0.12 );
	sfx.kiai();
	N.pose( 'flyingKick', 0.15 );
	await tweenXYZ( N.root.position, [ ( T.x + N.x ) / 2 + 0.3, 1.3, 0 ], 0.18, ease.out );
	await tweenXYZ( N.root.position, [ T.x + 0.9, 0.9, 0 ], 0.1, ease.in );
	impact( G, T, T.headPoint(), { power: 1.4, sound: 'heavy', text: 'ドン!' } );
	damageTeacher( G );
	react( T, - 1, 1.6, 'hitHigh' );
	N.pose( 'tuck', 0.1 );
	tween( 0.45, k => {

		N.body.rotation.x = - k * Math.PI * 2;

	}, ease.inOut );
	await tweenXYZ( N.root.position, [ N_HOME, 0, 0 ], 0.45, ease.inOut );
	N.body.rotation.x = 0;
	await N.stance( 0.15 );
	await T.moveTo( T_HOME, 0.3 );

}

const NINJA_MOVES = { katana: katanaCombo, shuriken: shurikenStorm, nunchaku: nunchakuFlurry, kunai: kunaiAssassin };
let lastNinja = null;

export function pickNinjaAttack( ninja ) {

	const opts = ninja.available().map( n => NINJA_MOVES[ n ] );
	opts.push( flyingKick );
	let pool = opts.filter( f => f !== lastNinja );
	if ( ! pool.length ) pool = opts;
	// weapon moves first: flying kick only occasionally
	if ( pool.length > 1 && Math.random() < 0.75 ) pool = pool.filter( f => f !== flyingKick );
	const pick = pool[ Math.floor( Math.random() * pool.length ) ];
	lastNinja = pick;
	return pick;

}

let teacherBag = [];
export function pickTeacherAttack() {

	if ( ! teacherBag.length ) teacherBag = [ ...TEACHER_ATTACKS ].sort( () => Math.random() - 0.5 );
	return teacherBag.pop();

}

// Ninja's finishing move on the teacher: shadow-clone cuts then iaido sheath.
export async function ninjaFinale( G ) {

	const { teacher: T, ninja: N } = G;
	const weapon = [ 'katana', 'kunai', 'nunchaku', 'shuriken' ].find( w => ! N.weapons[ w ].lost );
	G.cam.focus( V( N.x, 1.4, 0 ), 3.2, 0.4 );
	sfx.aura();
	G.fx.aura( N, 0x5ab8ff, 1.2 );
	N.pose( 'drawSword', 0.3 );
	await wait( 0.9 );
	if ( weapon ) await N.grab( weapon, 'haR', 0.1 );
	G.cam.focus( V( T.x, 1.3, 0 ), 5.0, 0.3 );
	speedLines( true, 1600 );
	const cuts = [ 1, - 1, 1, - 1, 1, - 1 ];
	for ( let i = 0; i < cuts.length; i ++ ) {

		const side = cuts[ i ];
		G.fx.ghost( N, 0x7fc8ff, 0.4 );
		N.root.position.set( T.x + side * 1.0, i % 3 === 2 ? 0.8 : 0, ( Math.random() - 0.5 ) * 0.6 );
		faceToward( N, - side );
		sfx.teleport();
		await N.pose( i % 2 ? 'slashSide' : 'slashDown', 0.06, ease.snap );
		sfx.slash();
		const p = T.chestPoint().add( V( 0, ( Math.random() - 0.5 ) * 0.5, 0 ) );
		G.fx.slash( p, { rotZ: Math.random() * 3, facing: - side, radius: 1.0 + Math.random() * 0.4, color: i % 2 ? 0xffffff : 0x9fd4ff } );
		G.fx.sparks( p, { count: 20, color: 0xbfe4ff, speed: 5 } );
		T.flash( 0xffffff, 0.08 );
		T.pose( i % 2 ? 'hitHigh' : 'hitBody', 0.05 );
		G.cam.shake( 0.12 );
		await wait( 0.09 );

	}

	// land facing away, sheath slowly; the cut lands afterwards
	N.root.position.set( T.x + 1.7, 0, 0 );
	faceToward( N, 1 );
	N.pose( 'stanceNinja', 0.2 );
	T.pose( 'dizzy', 0.3 );
	clock.scale = 0.35;
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.3, 0 ), 4.0, 0.5 );
	await wait( 0.35 );
	if ( weapon ) await N.holster( weapon, 0.4 );
	sfx.clang();
	callout( 'チン', G.project( N.chestPoint() ), { size: 0.8, color: '#dff2ff', rotate: 0 } );
	await wait( 0.2 );
	clock.scale = 1;
	// delayed explosion of cuts
	const p = T.chestPoint();
	clock.hitstop = 0.2;
	G.cam.shake( 0.9 );
	sfx.boom();
	sfx.slash();
	screenFlash( '#fff', 350 );
	G.fx.flash( p, 1.8, 0xdff2ff );
	G.fx.sparks( p, { count: 160, color: 0xbfe4ff, speed: 11, size: 0.16 } );
	for ( let i = 0; i < 4; i ++ ) G.fx.slash( p, { rotZ: i * 0.8, facing: 1, radius: 1.3 + i * 0.2, width: 0.5, color: 0xffffff } );
	G.fx.shockwave( V( T.x, 0, 0 ), { size: 7, color: 0x9fd4ff } );
	G.world.kickLeaves( T.root.position, 120, 8 );
	G.world.gustBurst( 1.5 );
	damageTeacher( G, 2 );
	callout( '斬!!', G.project( p ), { size: 2.2 } );
	// teacher topples in slow motion
	clock.scale = 0.45;
	T.idleOn = false;
	T.pose( 'hitHigh', 0.2 );
	G.cam.focus( V( T.x - 0.5, 1.0, 0 ), 3.4, 0.8 );
	tweenXYZ( T.root.position, [ T.x - 1.0, 0, 0 ], 1.1, ease.out );
	await tween( 1.1, k => {

		T.body.rotation.x = - k * Math.PI / 2;
		T.body.position.y = k * 0.14;

	}, ease.in );
	clock.scale = 1;
	T.pose( 'lie', 0.2 );
	sfx.boom();
	G.cam.shake( 0.6 );
	G.fx.dust( T.root.position, 70 );
	G.fx.shockwave( V( T.x - 1, 0, 0 ), { size: 5 } );
	await wait( 0.4 );
	G.cam.focus( V( ( T.x + N.x ) / 2, 1.1, 0 ), 5.2, 0.8 );
	// dramatic Japanese anime call
	inkSplash( t( 'koJp' ), t( 'koSub' ) );
	announce( '完全勝利！', { lang: 'ja', pitch: 1.4, rate: 0.85, fallback: 'Kanzen shouri!' } );
	sfx.gong();
	N.pose( 'victoryNinja', 0.5 );
	faceToward( N, - 1 );
	await wait( 2.8 );

}

export async function teacherKO( G ) {

	return ninjaFinale( G );

}

export function resetPositions( G ) {

	const { teacher: T, ninja: N } = G;
	[ T, N ].forEach( f => {

		f.body.rotation.set( 0, 0, 0 );
		f.body.position.set( 0, 0, 0 );
		f.root.visible = true;
		f.idleOn = true;

	} );
	T.root.position.set( T_HOME, 0, 0 );
	N.root.position.set( N_HOME, 0, 0 );
	T.root.rotation.y = FACE_T;
	N.root.rotation.y = FACE_N;
	T.pose( 'stanceTeacher', 0 );
	N.pose( 'stanceNinja', 0 );
	void POSES;
	void tweenNum;
	void getLang;

}
