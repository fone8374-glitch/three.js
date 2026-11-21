// Game clock with slow-motion + hit-stop, promise-based waits and tweens.

export const clock = { time: 0, scale: 1, hitstop: 0, real: 0, paused: false };

const tweens = new Map(); // key -> tween
let anon = 0;
const waits = [];

export const ease = {
	linear: k => k,
	in: k => k * k * k,
	out: k => 1 - Math.pow( 1 - k, 3 ),
	inOut: k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow( - 2 * k + 2, 3 ) / 2,
	back: k => {

		const c1 = 1.70158, c3 = c1 + 1;
		return 1 + c3 * Math.pow( k - 1, 3 ) + c1 * Math.pow( k - 1, 2 );

	},
	snap: k => 1 - Math.pow( 1 - k, 6 ),
	expoIn: k => k === 0 ? 0 : Math.pow( 2, 10 * k - 10 ),
};

export function update( realDt ) {

	clock.real += realDt;
	if ( clock.paused ) return 0;
	let dt = realDt;
	if ( clock.hitstop > 0 ) {

		clock.hitstop -= realDt;
		dt = 0;

	}

	dt *= clock.scale;
	clock.time += dt;

	for ( const [ key, tw ] of tweens ) {

		tw.t += dt;
		const k = tw.dur <= 0 ? 1 : Math.min( 1, tw.t / tw.dur );
		tw.apply( tw.ease( k ) );
		if ( k >= 1 ) {

			tweens.delete( key );
			tw.resolve();

		}

	}

	for ( let i = waits.length - 1; i >= 0; i -- ) {

		if ( clock.time >= waits[ i ].at ) {

			waits[ i ].resolve();
			waits.splice( i, 1 );

		}

	}

	return dt;

}

export function wait( sec ) {

	return new Promise( resolve => waits.push( { at: clock.time + sec, resolve } ) );

}

export function tween( dur, apply, easing = ease.inOut, key ) {

	if ( key === undefined ) key = 'anon' + ( anon ++ );
	const prev = tweens.get( key );
	if ( prev ) {

		tweens.delete( key );
		prev.resolve();

	}

	return new Promise( resolve => {

		tweens.set( key, { t: 0, dur, apply, ease: easing, resolve } );
		if ( dur <= 0 ) {

			apply( 1 );

		}

	} );

}

// Tween x/y/z of a Vector3 or Euler towards [x, y, z].
export function tweenXYZ( target, to, dur, easing = ease.inOut ) {

	const from = [ target.x, target.y, target.z ];
	return tween( dur, k => {

		target.x = from[ 0 ] + ( to[ 0 ] - from[ 0 ] ) * k;
		target.y = from[ 1 ] + ( to[ 1 ] - from[ 1 ] ) * k;
		target.z = from[ 2 ] + ( to[ 2 ] - from[ 2 ] ) * k;

	}, easing, target );

}

export function tweenNum( obj, prop, to, dur, easing = ease.inOut ) {

	const from = obj[ prop ];
	const key = obj.__twkey || ( obj.__twkey = {} );
	key[ prop ] = key[ prop ] || { };
	return tween( dur, k => {

		obj[ prop ] = from + ( to - from ) * k;

	}, easing, key[ prop ] );

}

// Abandon every pending tween and wait without resolving them, so any running
// choreography stops dead instead of finishing behind the next screen.
export function halt() {

	tweens.clear();
	waits.length = 0;

}

export function clearAll() {

	for ( const [ , tw ] of tweens ) tw.resolve();
	tweens.clear();
	waits.splice( 0 ).forEach( w => w.resolve() );

}
