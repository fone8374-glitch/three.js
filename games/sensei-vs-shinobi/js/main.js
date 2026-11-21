import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { initLang, t, getLang, onLang } from './i18n.js';
import { update as tick, clock, wait, ease, tweenXYZ, halt } from './tween.js';
import { World, wind } from './world.js';
import { Teacher, Ninja, WEAPON_ORDER } from './fighters.js';
import { FX, hideInk, speedLines } from './fx.js';
import { initAudio, sfx, startMusic, stopMusic, setMusicIntensity, setMuted, isMuted, announce, setWind, hasVoice } from './audio.js';
import { initSetup, state as setupState, normalize } from './setup.js';
import { pickNinjaAttack, pickTeacherAttack, teacherFinisher, ninjaFinale, resetPositions, T_HOME, N_HOME } from './moves.js';

const $ = id => document.getElementById( id );
const REDUCED = matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

initLang();

// ------------------------------------------------------------------ renderer & scene

const renderer = new THREE.WebGLRenderer( { antialias: true, powerPreference: 'high-performance' } );
renderer.setPixelRatio( Math.min( devicePixelRatio, 2 ) );
renderer.setSize( innerWidth, innerHeight );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$( 'stage' ).appendChild( renderer.domElement );

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 42, innerWidth / innerHeight, 0.1, 2000 );
camera.position.set( 0, 2, 7 );

const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
const bloom = new UnrealBloomPass( new THREE.Vector2( innerWidth, innerHeight ), 0.45, 0.5, 0.88 );
composer.addPass( bloom );
composer.addPass( new OutputPass() );

const world = new World( scene );
const teacher = new Teacher();
const ninja = new Ninja();
scene.add( teacher.root, ninja.root );
const fx = new FX( scene, camera );

// ------------------------------------------------------------------ camera director

class Director {

	constructor( cam ) {

		this.cam = cam;
		this.pos = cam.position.clone();
		this.look = new THREE.Vector3( 0, 1.2, 0 );
		this.goalPos = this.pos.clone();
		this.goalLook = this.look.clone();
		this.mode = 'setup';
		this.rate = 3;
		this.trauma = 0;
		this.viewShift = 0;
		this.viewShiftGoal = 0;
		this.t = 0;

	}

	focus( look, dist = 4.5, dur = 0.4 ) {

		this.mode = 'focus';
		this.goalLook.copy( look );
		this.goalPos.set( look.x * 0.92, look.y + 0.3 + dist * 0.06, look.z + dist );
		this.rate = 3 / Math.max( 0.1, dur );

	}

	auto( dur = 0.8 ) {

		this.mode = 'auto';
		this.rate = 3 / dur;

	}

	setup() {

		this.mode = 'setup';
		this.rate = 1.5;

	}

	shake( a ) {

		this.trauma = Math.min( 1.2, this.trauma + ( REDUCED ? a * 0.25 : a ) );

	}

	update( dt, realDt ) {

		this.t += realDt;
		if ( this.mode === 'auto' ) {

			const mid = ( teacher.x + ninja.x ) / 2;
			const spread = Math.abs( teacher.x - ninja.x );
			const dist = 5.0 + spread * 0.45;
			this.goalLook.set( mid, 1.5, 0 );
			this.goalPos.set( mid * 0.8, 1.8, dist );

		} else if ( this.mode === 'setup' ) {

			const a = Math.sin( this.t * 0.12 ) * 0.25;
			this.goalLook.set( 0, 1.35, 0 );
			this.goalPos.set( Math.sin( a ) * 6.4, 1.75 + Math.sin( this.t * 0.2 ) * 0.15, Math.cos( a ) * 6.4 );

		} else if ( this.mode === 'portrait' ) {

			// look straight into the face, whichever way the head is turned
			teacher.headGroup.updateWorldMatrix( true, false );
			const h = new THREE.Vector3().setFromMatrixPosition( teacher.headGroup.matrixWorld );
			const dir = new THREE.Vector3( 0, 0, 1 ).transformDirection( teacher.headGroup.matrixWorld );
			dir.y = 0;
			dir.normalize();
			this.goalLook.copy( h ).add( new THREE.Vector3( 0, - 0.08, 0 ) );
			this.goalPos.copy( h ).addScaledVector( dir, 0.8 ).add( new THREE.Vector3( 0, 0.04, 0 ) );

		} else if ( this.mode === 'intro' ) {

			// goal set externally

		}

		const k = 1 - Math.exp( - this.rate * realDt );
		this.pos.lerp( this.goalPos, k );
		this.look.lerp( this.goalLook, k );
		this.trauma = Math.max( 0, this.trauma - realDt * 1.6 );
		const s = this.trauma * this.trauma;
		const n = ( f, o ) => Math.sin( this.t * f + o ) * 0.5 + Math.sin( this.t * f * 2.3 + o * 2 ) * 0.5;
		this.cam.position.set( this.pos.x + n( 37, 1 ) * s * 0.35, this.pos.y + n( 41, 2 ) * s * 0.3, this.pos.z );
		this.cam.lookAt( this.look.x + n( 29, 3 ) * s * 0.15, this.look.y + n( 33, 4 ) * s * 0.15, this.look.z );

		// keep the scene centred in the space beside the setup board
		this.viewShift += ( this.viewShiftGoal - this.viewShift ) * Math.min( 1, realDt * 4 );
		const w = innerWidth, h = innerHeight;
		if ( Math.abs( this.viewShift ) > 0.5 ) this.cam.setViewOffset( w, h, - this.viewShift, 0, w, h );
		else this.cam.clearViewOffset();

	}

}

const cam = new Director( camera );

// ------------------------------------------------------------------ HUD

const WEAPON_SVG = {
	katana: '<svg viewBox="0 0 24 24"><path d="M4 20l3-3M7 17l11-11 2-3-3 2L6 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 14l5 5" stroke="currentColor" stroke-width="2"/></svg>',
	nunchaku: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="4" height="10" rx="2" fill="currentColor"/><rect x="15" y="11" width="4" height="10" rx="2" transform="rotate(-30 17 16)" fill="currentColor"/><path d="M5 13c1 4 6 5 9 1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/></svg>',
	shuriken: '<svg viewBox="0 0 24 24"><path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="#f0e6cf"/></svg>',
	kunai: '<svg viewBox="0 0 24 24"><path d="M12 2l3 8-3 3-3-3z" fill="currentColor"/><path d="M12 13v6" stroke="currentColor" stroke-width="2.5"/><circle cx="12" cy="21" r="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
};

const hud = {
	setHP( who, hp ) {

		const bar = $( who === 'teacher' ? 'bar-t' : 'bar-n' );
		const s = `scaleX(${ hp / 4 })`;
		bar.querySelector( '.bar-fill' ).style.transform = s;
		bar.querySelector( '.bar-trail' ).style.transform = s;
		bar.classList.toggle( 'low', hp === 1 );
		sfx.hpDrain();
		drawPortraits();

	},
	weaponLost( name ) {

		const li = document.querySelector( `#weapons li[data-w="${ name }"]` );
		if ( li ) li.classList.add( 'lost' );

	},
	announce( text, cls = 'show' ) {

		const el = $( 'announcer' );
		el.className = 'announcer';
		el.textContent = text;
		void el.offsetWidth;
		el.classList.add( cls );

	},
	reset() {

		[ 'bar-t', 'bar-n' ].forEach( id => {

			const b = $( id );
			b.classList.remove( 'low' );
			b.querySelectorAll( '.bar-fill, .bar-trail' ).forEach( e => {

				e.style.transition = 'none';
				e.style.transform = 'scaleX(1)';
				void e.offsetWidth;
				e.style.transition = '';

			} );

		} );
		renderWeapons();
		drawPortraits();

	},
};

function renderWeapons() {

	const ul = $( 'weapons' );
	ul.innerHTML = '';
	WEAPON_ORDER.forEach( w => {

		const li = document.createElement( 'li' );
		li.dataset.w = w;
		li.innerHTML = WEAPON_SVG[ w ] + `<span>${ t( 'weapons' )[ w ] }</span>`;
		if ( ninja.weapons[ w ].lost ) li.classList.add( 'lost' );
		ul.appendChild( li );

	} );

}

function drawPortraits() {

	const pt = $( 'portrait-t' ).getContext( '2d' );
	pt.drawImage( teacher.face.canvas, 86, 70, 340, 340, 0, 0, 96, 96 );
	const pn = $( 'portrait-n' ).getContext( '2d' );
	pn.drawImage( ninja.mask.canvas, 40, 110, 432, 432, 0, 0, 96, 96 );

}

function names() {

	return {
		teacher: setupState.teacherName.trim() || t( 'teacherDefault' ),
		student: setupState.studentName.trim() || t( 'studentDefault' ),
	};

}

const _v = new THREE.Vector3();
function project( p ) {

	_v.copy( p ).project( camera );
	return { x: ( _v.x * 0.5 + 0.5 ) * innerWidth, y: ( - _v.y * 0.5 + 0.5 ) * innerHeight };

}

const G = { teacher, ninja, fx, world, cam, hud, camera, project };

// ------------------------------------------------------------------ questions

let game = null;
let abortQuestion = null;
// Questions continue across rounds, so a long sheet is worked through instead of
// replaying the first few. The cursor resets when the question set changes.
let cursor = 0, cursorKey = '';

function askQuestion( q, index, total ) {

	return new Promise( resolve => {

		const card = $( 'question-card' );
		const opts = $( 'q-options' );
		const typed = $( 'q-typed' );
		const fb = $( 'q-feedback' );
		const timerEl = $( 'timer' );
		$( 'q-index' ).textContent = t( 'qLabel', index, total );
		$( 'q-text' ).textContent = q.q;
		fb.textContent = '';
		fb.className = 'q-feedback';
		opts.innerHTML = '';
		card.hidden = false;
		card.style.animation = 'none';
		void card.offsetWidth;
		card.style.animation = '';
		let done = false;
		const buttons = [];

		const finish = ( correct, given, timedOut = false ) => {

			if ( done ) return;
			done = true;
			abortQuestion = null;
			clearInterval( timer );
			timerEl.classList.remove( 'urgent' );
			document.removeEventListener( 'keydown', onKey );
			buttons.forEach( b => b.disabled = true );
			typed.querySelector( 'input' ).disabled = true;
			const answerText = q.options.length ? q.options[ q.answer ] : q.answer;
			if ( correct ) {

				sfx.correct();
				fb.textContent = t( 'correct' );
				fb.classList.add( 'good' );

			} else {

				sfx.wrong();
				fb.textContent = ( timedOut ? t( 'timeUp' ) + ' ' : t( 'wrong' ) + ' ' ) + t( 'correctWas' ) + ' ' + answerText;
				fb.classList.add( 'bad' );

			}

			if ( q.options.length ) {

				buttons.forEach( ( b, i ) => {

					if ( i === q.answer ) b.classList.add( 'is-correct' );
					else if ( i === given ) b.classList.add( 'is-wrong' );
					else b.classList.add( 'dim' );

				} );

			}

			setTimeout( () => {

				card.hidden = true;
				resolve( { correct, given: typeof given === 'number' ? q.options[ given ] : given, answerText } );

			}, correct ? 900 : 1900 );

		};

		if ( q.options.length ) {

			typed.hidden = true;
			q.options.forEach( ( o, i ) => {

				const b = document.createElement( 'button' );
				b.type = 'button';
				b.className = 'opt';
				b.innerHTML = `<span class="key">${ i + 1 }</span><span class="txt" dir="auto"></span>`;
				b.querySelector( '.txt' ).textContent = o;
				b.addEventListener( 'click', () => finish( i === q.answer, i ) );
				opts.appendChild( b );
				buttons.push( b );

			} );
			setTimeout( () => buttons[ 0 ]?.focus( { preventScroll: true } ), 60 );

		} else {

			typed.hidden = false;
			const inp = typed.querySelector( 'input' );
			inp.value = '';
			inp.disabled = false;
			setTimeout( () => inp.focus( { preventScroll: true } ), 60 );
			typed.onsubmit = e => {

				e.preventDefault();
				if ( ! inp.value.trim() || clock.paused ) return;
				finish( normalize( inp.value ) === normalize( q.answer ), inp.value );

			};

		}

		const onKey = e => {

			if ( ! q.options.length || clock.paused ) return;
			const n = Number( e.key );
			if ( n >= 1 && n <= q.options.length ) finish( n - 1 === q.answer, n - 1 );

		};

		document.addEventListener( 'keydown', onKey );

		let left = setupState.timePer;
		timerEl.textContent = left > 0 ? left : '∞';
		const timer = left > 0 ? setInterval( () => {

			if ( clock.paused ) return;
			left --;
			timerEl.textContent = Math.max( 0, left );
			if ( left <= 5 ) {

				timerEl.classList.add( 'urgent' );
				sfx.tick( true );

			}

			if ( left <= 0 ) finish( false, null, true );

		}, 1000 ) : null;

		abortQuestion = () => {

			done = true;
			clearInterval( timer );
			document.removeEventListener( 'keydown', onKey );
			timerEl.classList.remove( 'urgent' );
			card.hidden = true;

		};

	} );

}

// ------------------------------------------------------------------ flow

async function intro() {

	cam.mode = 'intro';
	cam.rate = 0.9;
	cam.pos.set( 8, 9, - 4 );
	cam.look.set( 14, 40, - 300 );
	cam.goalPos.set( 2.5, 3, 9 );
	cam.goalLook.set( 0, 2, - 40 );
	await wait( 1.6 );
	cam.focus( new THREE.Vector3( 0, 1.3, 0 ), 5.6, 1.0 );
	await wait( 1.0 );
	const ar = getLang() === 'ar' && hasVoice( 'ar' );
	hud.announce( t( 'round' ) );
	announce( ar ? 'الجولة الأولى' : 'Round one', { lang: ar ? 'ar' : 'en', pitch: 0.3 } );
	sfx.taiko( 1.2 );
	await wait( 1.5 );
	hud.announce( t( 'fight' ) );
	announce( ar ? 'قاتِل!' : 'Fight!', { lang: ar ? 'ar' : 'en', pitch: 0.3, rate: 1 } );
	sfx.gong();
	world.gustBurst( 1 );
	fx.dust( teacher.root.position, 20 );
	fx.dust( ninja.root.position, 20 );
	teacher.pose( 'punchR', 0.15 ).then( () => teacher.stance( 0.3 ) );
	ninja.pose( 'spinWeapon', 0.15 ).then( () => ninja.stance( 0.3 ) );
	await wait( 1.0 );
	cam.auto( 0.9 );

}

function resetFight() {

	clock.scale = 1;
	clock.hitstop = 0;
	teacher.reset();
	ninja.reset();
	fx.clearBodies();
	resetPositions( G );
	hud.reset();
	hideInk();

}

async function startGame( qs ) {

	initAudio();
	resetFight();
	const n = names();
	$( 'name-t' ).textContent = n.teacher;
	$( 'name-n' ).textContent = n.student;
	$( 'setup' ).classList.add( 'away' );
	$( 'results' ).hidden = true;
	$( 'hud' ).hidden = false;
	$( 'question-card' ).hidden = true;
	$( 'timer' ).textContent = setupState.timePer > 0 ? setupState.timePer : '∞';
	cam.viewShiftGoal = 0;
	startMusic();
	setMusicIntensity( 0.7 );
	const key = JSON.stringify( qs );
	if ( key !== cursorKey ) {

		cursor = 0;
		cursorKey = key;

	}

	const g = game = { qs, asked: 0, correct: 0, missed: [], aborted: false };

	await intro();
	if ( g.aborted ) return;

	while ( teacher.hp > 0 && ninja.hp > 0 ) {

		const qi = cursor % qs.length;
		cursor ++;
		const q = qs[ qi ];
		g.asked ++;
		cam.auto( 0.8 );
		const res = await askQuestion( q, qi + 1, qs.length );
		if ( g.aborted ) return;
		if ( res.correct ) {

			g.correct ++;
			if ( teacher.hp === 1 ) await ninjaFinale( G );
			else await pickNinjaAttack( ninja )( G );

		} else {

			g.missed.push( { q: q.q, answer: res.answerText, given: res.given } );
			await pickTeacherAttack()( G );
			if ( ninja.hp === 0 ) await teacherFinisher( G );

		}

		if ( g.aborted ) return;

		setMusicIntensity( 0.7 + ( 4 - Math.min( teacher.hp, ninja.hp ) ) * 0.1 );
		if ( teacher.hp > 0 && ninja.hp > 0 ) {

			cam.auto( 0.8 );
			await wait( 0.35 );

		}

	}

	if ( g.aborted ) return;
	g.over = true;
	showResults();

}

// ------------------------------------------------------------------ pause / quit

function canPause() {

	return game && ! game.over && ! game.aborted && ! $( 'hud' ).hidden;

}

function setPaused( on ) {

	if ( on && ! canPause() ) return;
	clock.paused = on;
	$( 'pause' ).hidden = ! on;
	$( 'hud' ).inert = on;
	if ( window.speechSynthesis ) on ? speechSynthesis.pause() : speechSynthesis.resume();
	setMusicIntensity( on ? 0.1 : 0.7 );
	if ( on ) $( 'resume-btn' ).focus();
	else document.querySelector( '#question-card:not([hidden]) .opt, #question-card:not([hidden]) input' )?.focus( { preventScroll: true } );

}

// Abandon the running fight: freeze its choreography for good and clear the stage.
function abortGame() {

	if ( ! game ) return;
	game.aborted = true;
	halt();
	abortQuestion?.();
	abortQuestion = null;
	fx.clearItems();
	clock.paused = false;
	$( 'pause' ).hidden = true;
	$( 'hud' ).inert = false;
	$( 'announcer' ).className = 'announcer';
	speedLines( false );
	if ( window.speechSynthesis ) speechSynthesis.cancel();

}

$( 'pause-btn' ).addEventListener( 'click', () => setPaused( true ) );
$( 'resume-btn' ).addEventListener( 'click', () => setPaused( false ) );
$( 'quit-btn' ).addEventListener( 'click', () => {

	abortGame();
	backToSetup();

} );
addEventListener( 'keydown', e => {

	if ( e.key !== 'Escape' ) return;
	if ( clock.paused ) setPaused( false );
	else if ( canPause() ) setPaused( true );

} );

function showResults() {

	const n = names();
	const studentWon = teacher.hp <= 0;
	const winner = studentWon ? n.student : n.teacher;
	const ar = getLang() === 'ar' && hasVoice( 'ar' );
	announce( ar ? `فاز ${ winner }` : `${ winner } wins!`, { lang: ar ? 'ar' : 'en', pitch: 0.35 } );
	setMusicIntensity( 0.3 );
	$( 'res-title' ).textContent = t( 'wins', winner );
	$( 'res-sub' ).textContent = studentWon ? ( game.missed.length ? t( 'studentWinsSub' ) : t( 'flawless' ) ) : t( 'teacherWinsSub' );
	$( 'res-score' ).textContent = t( 'score', game.correct, game.asked );
	const list = $( 'res-list' );
	list.innerHTML = '';
	if ( ! game.missed.length ) {

		const li = document.createElement( 'li' );
		li.className = 'flawless';
		li.textContent = t( 'noMistakes' );
		list.appendChild( li );

	}

	game.missed.forEach( m => {

		const li = document.createElement( 'li' );
		const rq = document.createElement( 'span' );
		rq.className = 'rq';
		rq.dir = 'auto';
		rq.textContent = m.q;
		const ra = document.createElement( 'span' );
		ra.className = 'ra';
		ra.append( t( 'correctWas' ) + ' ' );
		const b = document.createElement( 'b' );
		b.textContent = m.answer;
		ra.appendChild( b );
		if ( m.given ) {

			const u = document.createElement( 'span' );
			u.className = 'ru';
			u.textContent = ` · ${ t( 'yourAnswer' ) } ${ m.given }`;
			ra.appendChild( u );

		}

		li.append( rq, ra );
		list.appendChild( li );

	} );
	$( 'results' ).hidden = false;
	$( 'again-btn' ).focus();

}

function backToSetup() {

	$( 'results' ).hidden = true;
	$( 'hud' ).hidden = true;
	$( 'setup' ).classList.remove( 'away' );
	stopMusic();
	resetFight();
	cam.setup();
	updateViewShift();

}

$( 'again-btn' ).addEventListener( 'click', () => startGame( game.qs ) );
$( 'edit-btn' ).addEventListener( 'click', backToSetup );
$( 'sound-btn' ).addEventListener( 'click', () => {

	initAudio();
	setMuted( ! isMuted() );
	$( 'sound-btn' ).setAttribute( 'aria-pressed', String( ! isMuted() ) );

} );

onLang( () => {

	renderWeapons();
	if ( game ) {

		const n = names();
		$( 'name-t' ).textContent = n.teacher;
		$( 'name-n' ).textContent = n.student;

	}

	updateViewShift();

} );

// ------------------------------------------------------------------ setup hooks

let portraitTimer = null;
initSetup( {
	onStart: qs => startGame( qs ),
	photoChanged: canvas => {

		teacher.setPhoto( canvas );
		drawPortraits();
		if ( ! $( 'setup' ).classList.contains( 'away' ) && canvas ) {

			// push in so the teacher sees their own face on the fighter
			cam.mode = 'portrait';
			cam.rate = 3;
			clearTimeout( portraitTimer );
			portraitTimer = setTimeout( () => cam.setup(), 3500 );

		}

	},
} );

function updateViewShift() {

	const setupOpen = ! $( 'setup' ).classList.contains( 'away' );
	if ( setupOpen && innerWidth > 720 ) {

		const panel = Math.min( 620, innerWidth ) / 2;
		cam.viewShiftGoal = getLang() === 'ar' ? - panel : panel;

	} else {

		cam.viewShiftGoal = 0;

	}

}

// ------------------------------------------------------------------ loop

resetPositions( G );
renderWeapons();
drawPortraits();
updateViewShift();
cam.pos.set( 0, 1.8, 6.4 );

addEventListener( 'resize', () => {

	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( innerWidth, innerHeight );
	composer.setSize( innerWidth, innerHeight );
	updateViewShift();

} );

const timer = new THREE.Timer();
let windTick = 0;
function frame( ts ) {

	requestAnimationFrame( frame );
	timer.update( ts );
	const realDt = Math.min( 0.05, timer.getDelta() );
	const dt = tick( realDt );
	world.update( dt, clock.time );
	teacher.update( dt );
	ninja.update( dt );
	fx.update( dt );
	cam.update( dt, realDt );
	windTick += realDt;
	if ( windTick > 0.25 ) {

		windTick = 0;
		setWind( Math.min( 1.5, wind.strength ) / 1.5 );

	}

	composer.render();

}

requestAnimationFrame( frame );
requestAnimationFrame( () => $( 'loading' ).classList.add( 'done' ) );

// start ambient audio on first interaction with the setup screen
addEventListener( 'pointerdown', () => initAudio(), { once: true } );

// expose for debugging in the console
window.__svs = { G, teacher, ninja, startGame, clock, T_HOME, N_HOME, ease, tweenXYZ };
