// Every sound is synthesized with WebAudio, so the game works offline.
// The announcer uses the browser's speech synthesis.

let ctx = null, master, sfxBus, musicBus, ambBus, reverb, reverbSend, noiseBuf;
let muted = false;
let musicTimer = null, musicStep = 0, musicNext = 0, musicIntensity = 1;
let windNodes = null;
const pluckCache = new Map();

export function initAudio() {

	if ( ctx ) {

		if ( ctx.state === 'suspended' ) ctx.resume();
		return;

	}

	const AC = window.AudioContext || window.webkitAudioContext;
	if ( ! AC ) return;
	ctx = new AC();

	const comp = ctx.createDynamicsCompressor();
	comp.threshold.value = - 14;
	comp.ratio.value = 4;
	master = ctx.createGain();
	master.gain.value = muted ? 0 : 0.9;
	master.connect( comp ).connect( ctx.destination );

	sfxBus = ctx.createGain();
	sfxBus.gain.value = 0.9;
	musicBus = ctx.createGain();
	musicBus.gain.value = 0.32;
	ambBus = ctx.createGain();
	ambBus.gain.value = 0.5;
	sfxBus.connect( master );
	musicBus.connect( master );
	ambBus.connect( master );

	// Generated impulse response for a temple-courtyard reverb.
	reverb = ctx.createConvolver();
	const len = ctx.sampleRate * 2.4;
	const ir = ctx.createBuffer( 2, len, ctx.sampleRate );
	for ( let c = 0; c < 2; c ++ ) {

		const d = ir.getChannelData( c );
		for ( let i = 0; i < len; i ++ ) d[ i ] = ( Math.random() * 2 - 1 ) * Math.pow( 1 - i / len, 3 );

	}

	reverb.buffer = ir;
	reverbSend = ctx.createGain();
	reverbSend.gain.value = 0.35;
	reverbSend.connect( reverb ).connect( master );

	noiseBuf = ctx.createBuffer( 1, ctx.sampleRate * 2, ctx.sampleRate );
	const nd = noiseBuf.getChannelData( 0 );
	for ( let i = 0; i < nd.length; i ++ ) nd[ i ] = Math.random() * 2 - 1;

	startWind();

}

export function setMuted( m ) {

	muted = m;
	if ( master ) master.gain.setTargetAtTime( m ? 0 : 0.9, ctx.currentTime, 0.05 );
	if ( m && window.speechSynthesis ) speechSynthesis.cancel();

}

export function isMuted() {

	return muted;

}

// ---------- building blocks ----------

function now() {

	return ctx.currentTime;

}

function out( node, wet = 0.2 ) {

	node.connect( sfxBus );
	if ( wet > 0 ) {

		const g = ctx.createGain();
		g.gain.value = wet;
		node.connect( g ).connect( reverbSend );

	}

}

function env( gainNode, t, a, peak, d, sustain = 0.0001 ) {

	const g = gainNode.gain;
	g.cancelScheduledValues( t );
	g.setValueAtTime( 0.0001, t );
	g.exponentialRampToValueAtTime( peak, t + a );
	g.exponentialRampToValueAtTime( Math.max( sustain, 0.0001 ), t + a + d );

}

function noise( t, dur, { type = 'bandpass', f0 = 1000, f1 = f0, q = 1, gain = 0.5, a = 0.005, wet = 0.2, pan = 0 } = {} ) {

	const src = ctx.createBufferSource();
	src.buffer = noiseBuf;
	src.loop = true;
	const filt = ctx.createBiquadFilter();
	filt.type = type;
	filt.Q.value = q;
	filt.frequency.setValueAtTime( f0, t );
	filt.frequency.exponentialRampToValueAtTime( Math.max( 20, f1 ), t + dur );
	const g = ctx.createGain();
	env( g, t, a, gain, dur );
	let last = g;
	if ( pan && ctx.createStereoPanner ) {

		const p = ctx.createStereoPanner();
		p.pan.value = pan;
		g.connect( p );
		last = p;

	}

	src.connect( filt ).connect( g );
	out( last, wet );
	src.start( t, Math.random() * 1.5 );
	src.stop( t + a + dur + 0.05 );

}

function tone( t, dur, { type = 'sine', f0 = 440, f1 = f0, gain = 0.4, a = 0.004, wet = 0.15, detune = 0 } = {} ) {

	const o = ctx.createOscillator();
	o.type = type;
	o.detune.value = detune;
	o.frequency.setValueAtTime( f0, t );
	if ( f1 !== f0 ) o.frequency.exponentialRampToValueAtTime( Math.max( 10, f1 ), t + dur );
	const g = ctx.createGain();
	env( g, t, a, gain, dur );
	o.connect( g );
	out( g, wet );
	o.start( t );
	o.stop( t + a + dur + 0.05 );

}

function guard( fn ) {

	return ( ...args ) => {

		if ( ! ctx || muted ) return;
		try {

			fn( ...args );

		} catch ( e ) { /* ignore audio errors */ }

	};

}

// ---------- sound effects ----------

export const sfx = {
	whoosh: guard( ( strength = 1 ) => {

		const t = now();
		noise( t, 0.28 * strength, { f0: 300, f1: 2600, q: 2.5, gain: 0.35 * strength, a: 0.06, wet: 0.1 } );

	} ),
	punch: guard( ( heavy = 1 ) => {

		const t = now();
		tone( t, 0.18 * heavy, { f0: 160, f1: 45, gain: 0.9, type: 'sine', wet: 0.15 } );
		noise( t, 0.12, { type: 'lowpass', f0: 2500, f1: 300, gain: 0.7 * heavy, wet: 0.2 } );
		noise( t, 0.03, { type: 'highpass', f0: 3000, gain: 0.4 } );

	} ),
	heavy: guard( () => {

		const t = now();
		tone( t, 0.5, { f0: 120, f1: 30, gain: 1.0, wet: 0.35 } );
		tone( t, 0.35, { f0: 60, f1: 25, gain: 0.8, type: 'triangle', wet: 0.3 } );
		noise( t, 0.4, { type: 'lowpass', f0: 1800, f1: 120, gain: 0.9, wet: 0.4 } );

	} ),
	slash: guard( () => {

		const t = now();
		noise( t, 0.22, { type: 'highpass', f0: 1500, f1: 7000, gain: 0.45, a: 0.02, wet: 0.2 } );
		[ 2630, 3510, 4980 ].forEach( ( f, i ) => tone( t + 0.02, 0.5 - i * 0.1, { f0: f, gain: 0.07, wet: 0.5 } ) );

	} ),
	clang: guard( () => {

		const t = now();
		[ 523, 1187, 1765, 2399, 3302 ].forEach( ( f, i ) => tone( t, 0.9 - i * 0.12, { f0: f, gain: 0.14 - i * 0.02, type: i ? 'sine' : 'triangle', wet: 0.5 } ) );
		noise( t, 0.05, { type: 'highpass', f0: 4000, gain: 0.5 } );

	} ),
	shuriken: guard( () => {

		const t = now();
		const o = ctx.createOscillator();
		o.frequency.setValueAtTime( 2200, t );
		o.frequency.exponentialRampToValueAtTime( 900, t + 0.45 );
		const lfo = ctx.createOscillator();
		lfo.frequency.value = 38;
		const lg = ctx.createGain();
		lg.gain.value = 260;
		lfo.connect( lg ).connect( o.frequency );
		const g = ctx.createGain();
		env( g, t, 0.02, 0.12, 0.45 );
		o.connect( g );
		out( g, 0.3 );
		o.start( t );
		lfo.start( t );
		o.stop( t + 0.55 );
		lfo.stop( t + 0.55 );
		noise( t, 0.35, { f0: 3000, f1: 6000, q: 6, gain: 0.15 } );

	} ),
	chain: guard( () => {

		const t = now();
		for ( let i = 0; i < 6; i ++ ) noise( t + i * 0.035 + Math.random() * 0.02, 0.03, { f0: 5000 + Math.random() * 2000, q: 8, gain: 0.25 } );

	} ),
	smoke: guard( () => {

		const t = now();
		noise( t, 0.7, { type: 'lowpass', f0: 2400, f1: 200, gain: 0.6, a: 0.01, wet: 0.5 } );
		tone( t, 0.4, { f0: 90, f1: 40, gain: 0.5 } );

	} ),
	boom: guard( () => {

		const t = now();
		tone( t, 1.4, { f0: 70, f1: 22, gain: 1.0, wet: 0.5 } );
		noise( t, 1.2, { type: 'lowpass', f0: 900, f1: 60, gain: 1.0, wet: 0.6 } );
		noise( t, 0.15, { type: 'highpass', f0: 2000, gain: 0.5 } );

	} ),
	drop: guard( () => {

		const t = now();
		[ 0, 0.16, 0.27, 0.34 ].forEach( ( d, i ) => {

			[ 900, 1730, 2650 ].forEach( f => tone( t + d, 0.25, { f0: f * ( 1 + Math.random() * 0.05 ), gain: 0.09 / ( i + 1 ), wet: 0.3 } ) );

		} );

	} ),
	chalk: guard( () => {

		const t = now();
		noise( t, 0.07, { type: 'highpass', f0: 2500, gain: 0.5 } );
		noise( t, 0.3, { type: 'lowpass', f0: 1200, f1: 300, gain: 0.25, wet: 0.2 } );

	} ),
	ruler: guard( () => {

		const t = now();
		tone( t, 0.25, { f0: 320, f1: 140, type: 'triangle', gain: 0.5 } );
		noise( t, 0.15, { f0: 1400, q: 3, gain: 0.7 } );

	} ),
	correct: guard( () => {

		const t = now();
		[ 659, 784, 988, 1319 ].forEach( ( f, i ) => tone( t + i * 0.07, 0.5, { f0: f, type: 'triangle', gain: 0.22, wet: 0.4 } ) );
		bell( t + 0.28, 1568, 0.25 );

	} ),
	wrong: guard( () => {

		const t = now();
		tone( t, 0.5, { f0: 147, type: 'sawtooth', gain: 0.25, wet: 0.1 } );
		tone( t, 0.5, { f0: 156, type: 'sawtooth', gain: 0.25, wet: 0.1 } );
		tone( t + 0.25, 0.4, { f0: 110, f1: 90, type: 'square', gain: 0.12 } );

	} ),
	tick: guard( ( urgent ) => {

		const t = now();
		tone( t, 0.05, { f0: urgent ? 1600 : 1100, type: 'square', gain: 0.08, wet: 0 } );

	} ),
	gong: guard( () => {

		const t = now();
		[ 98, 196.7, 263, 351, 497, 612 ].forEach( ( f, i ) => tone( t, 3.5 - i * 0.4, { f0: f, f1: f * 0.98, gain: 0.3 / ( 1 + i * 0.6 ), a: 0.01, wet: 0.7 } ) );
		noise( t, 0.2, { type: 'lowpass', f0: 600, gain: 0.5 } );

	} ),
	taiko: guard( ( v = 1 ) => taiko( now(), v ) ),
	stinger: guard( () => {

		const t = now();
		// reverse cymbal swell then a hit
		const src = ctx.createBufferSource();
		src.buffer = noiseBuf;
		const f = ctx.createBiquadFilter();
		f.type = 'highpass';
		f.frequency.value = 3000;
		const g = ctx.createGain();
		g.gain.setValueAtTime( 0.0001, t );
		g.gain.exponentialRampToValueAtTime( 0.5, t + 1.0 );
		g.gain.exponentialRampToValueAtTime( 0.0001, t + 1.08 );
		src.connect( f ).connect( g );
		out( g, 0.6 );
		src.start( t );
		src.stop( t + 1.2 );
		taiko( t + 1.0, 1.4 );
		tone( t + 1.0, 2.2, { f0: 55, f1: 40, gain: 0.8, wet: 0.6 } );

	} ),
	aura: guard( () => {

		const t = now();
		tone( t, 1.6, { f0: 80, f1: 220, type: 'sawtooth', gain: 0.12, a: 0.3, wet: 0.5 } );
		noise( t, 1.6, { f0: 200, f1: 3000, q: 4, gain: 0.3, a: 0.4, wet: 0.4 } );

	} ),
	teleport: guard( () => {

		const t = now();
		tone( t, 0.25, { f0: 2400, f1: 300, type: 'triangle', gain: 0.25, wet: 0.4 } );
		noise( t, 0.3, { f0: 6000, f1: 800, q: 3, gain: 0.3 } );

	} ),
	grunt: guard( ( low = 1 ) => {

		// rough vocal "ugh": filtered sawtooth with falling pitch
		const t = now();
		const o = ctx.createOscillator();
		o.type = 'sawtooth';
		o.frequency.setValueAtTime( 180 * low, t );
		o.frequency.exponentialRampToValueAtTime( 90 * low, t + 0.25 );
		const f1 = ctx.createBiquadFilter();
		f1.type = 'bandpass';
		f1.frequency.value = 700;
		f1.Q.value = 5;
		const f2 = ctx.createBiquadFilter();
		f2.type = 'bandpass';
		f2.frequency.value = 1150;
		f2.Q.value = 6;
		const g = ctx.createGain();
		env( g, t, 0.02, 0.7, 0.28 );
		o.connect( f1 ).connect( g );
		o.connect( f2 ).connect( g );
		out( g, 0.2 );
		o.start( t );
		o.stop( t + 0.4 );

	} ),
	kiai: guard( () => {

		// sharp shout "hya!"
		const t = now();
		const o = ctx.createOscillator();
		o.type = 'sawtooth';
		o.frequency.setValueAtTime( 420, t );
		o.frequency.linearRampToValueAtTime( 520, t + 0.08 );
		o.frequency.exponentialRampToValueAtTime( 300, t + 0.3 );
		const f = ctx.createBiquadFilter();
		f.type = 'bandpass';
		f.frequency.setValueAtTime( 2400, t );
		f.frequency.exponentialRampToValueAtTime( 900, t + 0.3 );
		f.Q.value = 3;
		const g = ctx.createGain();
		env( g, t, 0.01, 0.5, 0.3 );
		o.connect( f ).connect( g );
		out( g, 0.3 );
		o.start( t );
		o.stop( t + 0.4 );
		noise( t, 0.08, { f0: 4000, q: 2, gain: 0.3 } );

	} ),
	hpDrain: guard( () => {

		const t = now();
		tone( t, 0.6, { f0: 600, f1: 150, type: 'square', gain: 0.06, wet: 0.2 } );

	} ),
	leaves: guard( () => {

		const t = now();
		for ( let i = 0; i < 8; i ++ ) noise( t + Math.random() * 0.4, 0.08, { f0: 3000 + Math.random() * 3000, q: 1, gain: 0.08 } );

	} ),
};

function bell( t, f, gain ) {

	[ 1, 2.76, 5.4 ].forEach( ( m, i ) => tone( t, 1.4 - i * 0.4, { f0: f * m, gain: gain / ( 1 + i * 2 ), wet: 0.5 } ) );

}

function taiko( t, v = 1 ) {

	tone( t, 0.45, { f0: 110 * ( 0.9 + 0.2 * Math.random() ), f1: 48, gain: 0.9 * v, a: 0.002, wet: 0.35 } );
	noise( t, 0.12, { type: 'lowpass', f0: 1200, f1: 200, gain: 0.5 * v, wet: 0.3 } );

}

// ---------- wind ambience ----------

function startWind() {

	const src = ctx.createBufferSource();
	src.buffer = noiseBuf;
	src.loop = true;
	const lp = ctx.createBiquadFilter();
	lp.type = 'bandpass';
	lp.frequency.value = 500;
	lp.Q.value = 0.6;
	const g = ctx.createGain();
	g.gain.value = 0.15;
	src.connect( lp ).connect( g ).connect( ambBus );
	src.start();
	windNodes = { lp, g };

}

export function setWind( strength ) {

	if ( ! windNodes ) return;
	const t = ctx.currentTime;
	windNodes.g.gain.setTargetAtTime( 0.06 + strength * 0.22, t, 0.3 );
	windNodes.lp.frequency.setTargetAtTime( 320 + strength * 900, t, 0.3 );

}

// ---------- music: taiko + shamisen-like plucks in the miyako-bushi scale ----------

function pluckBuffer( freq ) {

	const key = Math.round( freq );
	if ( pluckCache.has( key ) ) return pluckCache.get( key );
	const sr = ctx.sampleRate;
	const len = Math.floor( sr * 1.2 );
	const buf = ctx.createBuffer( 1, len, sr );
	const d = buf.getChannelData( 0 );
	const period = Math.floor( sr / freq );
	const ring = new Float32Array( period );
	for ( let i = 0; i < period; i ++ ) ring[ i ] = Math.random() * 2 - 1;
	let idx = 0, prev = 0;
	for ( let i = 0; i < len; i ++ ) {

		const cur = ring[ idx ];
		const next = ring[ ( idx + 1 ) % period ];
		const v = 0.497 * ( cur + next );
		ring[ idx ] = v;
		d[ i ] = cur * 0.6 + ( cur - prev ) * 0.6; // brighter, twangy
		prev = cur;
		idx = ( idx + 1 ) % period;

	}

	pluckCache.set( key, buf );
	return buf;

}

function pluck( t, freq, gain = 0.5 ) {

	const src = ctx.createBufferSource();
	src.buffer = pluckBuffer( freq );
	const g = ctx.createGain();
	g.gain.value = gain;
	src.connect( g );
	g.connect( musicBus );
	const s = ctx.createGain();
	s.gain.value = 0.3;
	g.connect( s ).connect( reverbSend );
	src.start( t );

}

// D miyako-bushi: D Eb G A Bb
const SCALE = [ 146.8, 155.6, 196.0, 220.0, 233.1, 293.7, 311.1, 392.0, 440.0, 466.2 ];
const MELODY = [ 5, - 1, 6, 5, 3, - 1, 4, 3, 2, - 1, 3, 2, 0, - 1, 1, 0, 5, 7, 6, 5, 8, - 1, 7, 6, 5, - 1, 3, 4, 2, - 1, - 1, - 1 ];
const DRUMS = [ 1, 0, 0, 0.5, 0, 0, 1, 0, 1, 0, 0.6, 0, 0, 0.5, 0, 0.5 ];

export function startMusic() {

	if ( ! ctx || musicTimer ) return;
	musicStep = 0;
	musicNext = ctx.currentTime + 0.1;
	const stepDur = 60 / 132 / 2;
	musicTimer = setInterval( () => {

		if ( muted ) {

			musicNext = ctx.currentTime + 0.1;
			return;

		}

		while ( musicNext < ctx.currentTime + 0.25 ) {

			const s = musicStep;
			const dv = DRUMS[ s % 16 ];
			if ( dv && musicIntensity > 0.2 ) taikoMusic( musicNext, dv * 0.55 * musicIntensity );
			if ( s % 4 === 2 ) noiseMusic( musicNext );
			const m = MELODY[ s % MELODY.length ];
			if ( m >= 0 ) pluck( musicNext, SCALE[ m ], 0.45 );
			if ( s % 8 === 0 ) pluck( musicNext, SCALE[ 0 ] / 2, 0.5 );
			musicStep ++;
			musicNext += stepDur;

		}

	}, 60 );

}

function taikoMusic( t, v ) {

	const o = ctx.createOscillator();
	o.frequency.setValueAtTime( 95, t );
	o.frequency.exponentialRampToValueAtTime( 45, t + 0.3 );
	const g = ctx.createGain();
	env( g, t, 0.003, v, 0.35 );
	o.connect( g ).connect( musicBus );
	o.start( t );
	o.stop( t + 0.45 );

}

function noiseMusic( t ) {

	const src = ctx.createBufferSource();
	src.buffer = noiseBuf;
	const f = ctx.createBiquadFilter();
	f.type = 'highpass';
	f.frequency.value = 6000;
	const g = ctx.createGain();
	env( g, t, 0.002, 0.12, 0.05 );
	src.connect( f ).connect( g ).connect( musicBus );
	src.start( t, Math.random() );
	src.stop( t + 0.1 );

}

export function setMusicIntensity( v ) {

	musicIntensity = v;
	if ( musicBus ) musicBus.gain.setTargetAtTime( 0.12 + 0.22 * v, ctx.currentTime, 0.4 );

}

export function stopMusic() {

	clearInterval( musicTimer );
	musicTimer = null;

}

// ---------- announcer ----------

let voices = [];
function loadVoices() {

	if ( window.speechSynthesis ) voices = speechSynthesis.getVoices();

}

if ( window.speechSynthesis ) {

	loadVoices();
	speechSynthesis.onvoiceschanged = loadVoices;

}

function pickVoice( lang ) {

	if ( ! voices.length ) loadVoices();
	const male = v => /male|daniel|fred|alex|google uk english male|otoya|ichiro|keita|tarik|maged|hamed/i.test( v.name ) && ! /female/i.test( v.name );
	const list = voices.filter( v => v.lang && v.lang.toLowerCase().startsWith( lang ) );
	return list.find( male ) || list[ 0 ] || null;

}

export function hasVoice( lang ) {

	return !! pickVoice( lang );

}

// Dramatic announcer line. lang: 'en' | 'ja' | 'ar'
export function announce( text, { lang = 'en', pitch = 0.4, rate = 0.82, volume = 1, fallback } = {} ) {

	if ( muted || ! window.speechSynthesis ) return;
	try {

		speechSynthesis.cancel();
		let voice = pickVoice( lang );
		let say = text;
		if ( ! voice && fallback ) {

			say = fallback;
			voice = pickVoice( 'en' );

		}

		const u = new SpeechSynthesisUtterance( say );
		if ( voice ) {

			u.voice = voice;
			u.lang = voice.lang;

		} else {

			u.lang = lang === 'ja' ? 'ja-JP' : lang === 'ar' ? 'ar-SA' : 'en-US';

		}

		u.pitch = pitch;
		u.rate = rate;
		u.volume = volume;
		speechSynthesis.speak( u );

	} catch ( e ) { /* speech unavailable */ }

}
