import { t, getLang, setLang, onLang, SAMPLE_QUESTIONS } from './i18n.js';

const $ = id => document.getElementById( id );
const STORE = 'svs-setup-v1';

export const state = {
	teacherName: '',
	studentName: '',
	timePer: 20,
	questions: [],
	photo: null, // HTMLCanvasElement 512x512 (cropped)
	photoSrc: null, // data URL of source image (downscaled)
	crop: { zoom: 1.2, x: 0, y: 0 },
};

let onPhotoChange = () => {};
let sourceImg = null;

// ---------------------------------------------------------------- answers

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function normalize( s ) {

	return String( s ?? '' )
		.replace( /[٠-٩]/g, d => AR_DIGITS.indexOf( d ) )
		.replace( /[ً-ْـ]/g, '' ) // Arabic diacritics + tatweel
		.replace( /[أإآ]/g, 'ا' ).replace( /ؤ/g, 'و' ).replace( /ئ/g, 'ي' ).replace( /ة/g, 'ه' ).replace( /ى/g, 'ي' )
		.toLowerCase()
		.replace( /[\s.,!?؟،'"“”()\-_:;]+/g, ' ' )
		.trim();

}

function resolveAnswer( ans, opts ) {

	const a = normalize( ans );
	if ( ! a ) return - 1;
	const letters = { a: 0, b: 1, c: 2, d: 3, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3 };
	if ( a in letters ) return letters[ a ];
	const m = a.match( /^(?:option|الخيار)?\s*([abcd1-4ابجد])$/ );
	if ( m ) return m[ 1 ] in letters ? letters[ m[ 1 ] ] : Number( m[ 1 ] ) - 1;
	if ( /^[1-4]$/.test( a ) ) return Number( a ) - 1;
	return opts.findIndex( o => o && normalize( o ) === a );

}

export function parseRows( rows ) {

	const out = [];
	if ( ! rows || ! rows.length ) return out;
	let start = 0;
	const head = ( rows[ 0 ] || [] ).map( c => normalize( c ) ).join( ' ' );
	if ( /question|سوال|السوال|answer|اجابه|الاجابه|option|خيار/.test( head ) ) start = 1;
	for ( const r of rows.slice( start ) ) {

		const cells = ( r || [] ).map( c => String( c ?? '' ).trim() );
		const q = cells[ 0 ];
		if ( ! q ) continue;
		const filled = cells.filter( Boolean ).length;
		if ( cells.length <= 2 || ( filled === 2 && cells[ 1 ] && ! cells[ 2 ] ) ) {

			if ( cells[ 1 ] ) out.push( { q, options: [], answer: cells[ 1 ] } );
			continue;

		}

		const opts = cells.slice( 1, 5 );
		while ( opts.length < 4 ) opts.push( '' );
		const ans = cells[ 5 ] ?? '';
		const present = opts.map( ( o, i ) => ( { o, i } ) ).filter( x => x.o );
		if ( ! present.length ) {

			if ( ans ) out.push( { q, options: [], answer: ans } );
			continue;

		}

		const idx = resolveAnswer( ans, opts );
		if ( idx < 0 || ! opts[ idx ] ) continue;
		out.push( { q, options: present.map( x => x.o ), answer: present.findIndex( x => x.i === idx ) } );

	}

	return out;

}

export function isValid( q ) {

	if ( ! q.q || ! q.q.trim() ) return false;
	if ( ! q.options.length ) return typeof q.answer === 'string' && q.answer.trim().length > 0;
	const opts = q.options.filter( o => o.trim() );
	return opts.length >= 2 && typeof q.answer === 'number' && q.options[ q.answer ] && q.options[ q.answer ].trim();

}

// Clean a question for play: drop empty options, remap answer index.
export function playable() {

	return state.questions.filter( isValid ).map( q => {

		if ( ! q.options.length ) return { ...q };
		const keep = q.options.map( ( o, i ) => ( { o: o.trim(), i } ) ).filter( x => x.o );
		return { q: q.q.trim(), options: keep.map( x => x.o ), answer: keep.findIndex( x => x.i === q.answer ) };

	} );

}

// ---------------------------------------------------------------- persistence

function save() {

	try {

		localStorage.setItem( STORE, JSON.stringify( {
			teacherName: state.teacherName, studentName: state.studentName, timePer: state.timePer,
			questions: state.questions, photoSrc: state.photoSrc, crop: state.crop,
		} ) );

	} catch ( e ) {

		// quota exceeded: retry without the photo
		try {

			localStorage.setItem( STORE, JSON.stringify( { ...state, photo: null, photoSrc: null } ) );

		} catch ( e2 ) { /* storage unavailable */ }

	}

}

function load() {

	try {

		const raw = localStorage.getItem( STORE );
		if ( ! raw ) return false;
		const d = JSON.parse( raw );
		Object.assign( state, {
			teacherName: d.teacherName || '', studentName: d.studentName || '',
			timePer: Number.isFinite( d.timePer ) ? d.timePer : 20,
			questions: Array.isArray( d.questions ) ? d.questions : [],
			photoSrc: d.photoSrc || null, crop: d.crop || state.crop,
		} );
		return true;

	} catch ( e ) {

		return false;

	}

}

// ---------------------------------------------------------------- question editor

function renderQuestions() {

	const list = $( 'q-list' );
	list.innerHTML = '';
	if ( ! state.questions.length ) {

		const li = document.createElement( 'li' );
		li.className = 'q-empty';
		li.textContent = t( 'qEmpty' );
		list.appendChild( li );

	}

	state.questions.forEach( ( q, qi ) => list.appendChild( questionItem( q, qi ) ) );
	updateCount();

}

function updateCount() {

	const n = state.questions.filter( isValid ).length;
	$( 'q-count' ).textContent = t( 'qCount', n );
	document.querySelectorAll( '.q-item' ).forEach( ( el, i ) => {

		const q = state.questions[ i ];
		if ( q ) el.classList.toggle( 'invalid', ! isValid( q ) && !! q.q );

	} );

}

const LETTERS = { en: [ 'A', 'B', 'C', 'D' ], ar: [ 'أ', 'ب', 'ج', 'د' ] };

function questionItem( q, qi ) {

	const li = document.createElement( 'li' );
	li.className = 'q-item';
	const typed = ! q.options.length;
	const L = LETTERS[ getLang() ];

	const ta = document.createElement( 'textarea' );
	ta.rows = 1;
	ta.dir = 'auto';
	ta.value = q.q;
	ta.placeholder = t( 'qPh' );
	ta.setAttribute( 'aria-label', t( 'qLabel', qi + 1 ) );
	ta.addEventListener( 'input', () => {

		q.q = ta.value;
		changed();

	} );
	li.appendChild( ta );

	if ( ! typed ) {

		const grid = document.createElement( 'div' );
		grid.className = 'q-opts';
		for ( let i = 0; i < 4; i ++ ) {

			const row = document.createElement( 'label' );
			row.className = 'q-opt';
			const r = document.createElement( 'input' );
			r.type = 'radio';
			r.name = 'correct-' + qi;
			r.checked = q.answer === i;
			r.setAttribute( 'aria-label', `${ t( 'answer' ) } ${ L[ i ] }` );
			r.addEventListener( 'change', () => {

				q.answer = i;
				changed();

			} );
			const inp = document.createElement( 'input' );
			inp.type = 'text';
			inp.dir = 'auto';
			inp.value = q.options[ i ] || '';
			inp.placeholder = t( 'optPh', L[ i ] );
			inp.addEventListener( 'input', () => {

				q.options[ i ] = inp.value;
				changed();

			} );
			row.append( r, inp );
			grid.appendChild( row );

		}

		li.appendChild( grid );

	}

	const row = document.createElement( 'div' );
	row.className = 'q-row';
	const tl = document.createElement( 'label' );
	const cb = document.createElement( 'input' );
	cb.type = 'checkbox';
	cb.checked = typed;
	cb.addEventListener( 'change', () => {

		if ( cb.checked ) {

			const prev = typeof q.answer === 'number' ? q.options[ q.answer ] : '';
			q.options = [];
			q.answer = prev || '';

		} else {

			const prev = typeof q.answer === 'string' ? q.answer : '';
			q.options = [ prev, '', '', '' ];
			q.answer = 0;

		}

		changed();
		renderQuestions();

	} );
	tl.append( cb, document.createTextNode( t( 'typedAnswer' ) ) );
	row.appendChild( tl );

	if ( typed ) {

		const wrap = document.createElement( 'label' );
		wrap.className = 'q-typed-answer';
		const inp = document.createElement( 'input' );
		inp.type = 'text';
		inp.dir = 'auto';
		inp.value = q.answer || '';
		inp.placeholder = t( 'answerPh' );
		inp.addEventListener( 'input', () => {

			q.answer = inp.value;
			changed();

		} );
		wrap.appendChild( inp );
		row.appendChild( wrap );

	}

	const rm = document.createElement( 'button' );
	rm.type = 'button';
	rm.className = 'btn-link q-remove';
	rm.textContent = t( 'remove' );
	rm.addEventListener( 'click', () => {

		state.questions.splice( qi, 1 );
		changed();
		renderQuestions();

	} );
	row.appendChild( rm );
	li.appendChild( row );
	return li;

}

function changed() {

	updateCount();
	$( 'start-msg' ).textContent = '';
	save();

}

// ---------------------------------------------------------------- Excel

function importFile( file ) {

	const msg = $( 'import-msg' );
	msg.classList.remove( 'error' );
	const reader = new FileReader();
	reader.onload = () => {

		try {

			let rows;
			if ( window.XLSX ) {

				const wb = window.XLSX.read( new Uint8Array( reader.result ), { type: 'array' } );
				const ws = wb.Sheets[ wb.SheetNames[ 0 ] ];
				rows = window.XLSX.utils.sheet_to_json( ws, { header: 1, raw: false, defval: '' } );

			} else {

				// fallback: CSV only
				const text = new TextDecoder().decode( reader.result );
				rows = text.split( /\r?\n/ ).map( l => l.split( /,|;|\t/ ) );

			}

			const qs = parseRows( rows );
			if ( ! qs.length ) throw new Error( 'empty' );
			// an uploaded sheet replaces the built-in samples; otherwise it adds to the teacher's own list
			const untouched = [ 'en', 'ar' ].some( l => JSON.stringify( state.questions ) === JSON.stringify( SAMPLE_QUESTIONS[ l ] ) );
			state.questions = untouched ? qs : state.questions.filter( q => q.q && q.q.trim() ).concat( qs );
			msg.textContent = t( 'imported', qs.length );
			changed();
			renderQuestions();

		} catch ( e ) {

			if ( e.message !== 'empty' ) console.error( e );
			msg.textContent = t( 'importFail' );
			msg.classList.add( 'error' );

		}

	};

	reader.readAsArrayBuffer( file );

}

function downloadTemplate() {

	const ar = getLang() === 'ar';
	const head = ar ? [ 'السؤال', 'الخيار أ', 'الخيار ب', 'الخيار ج', 'الخيار د', 'الإجابة' ] : [ 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer' ];
	const samples = SAMPLE_QUESTIONS[ ar ? 'ar' : 'en' ].slice( 0, 4 ).map( q => [ q.q, ...q.options, [ 'A', 'B', 'C', 'D' ][ q.answer ] ] );
	samples.push( ar ? [ 'اكتب اسم عاصمة اليابان.', '', '', '', '', 'طوكيو' ] : [ 'Type the capital city of Japan.', '', '', '', '', 'Tokyo' ] );
	const rows = [ head, ...samples ];
	const name = ar ? 'نموذج-الأسئلة' : 'questions-template';
	if ( window.XLSX ) {

		const ws = window.XLSX.utils.aoa_to_sheet( rows );
		ws[ '!cols' ] = [ { wch: 48 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 } ];
		if ( ar ) ws[ '!views' ] = [ { RTL: true } ];
		const wb = window.XLSX.utils.book_new();
		if ( ar ) wb.Workbook = { Views: [ { RTL: true } ] };
		window.XLSX.utils.book_append_sheet( wb, ws, ar ? 'الأسئلة' : 'Questions' );
		window.XLSX.writeFile( wb, name + '.xlsx' );

	} else {

		const csv = '﻿' + rows.map( r => r.map( c => `"${ String( c ).replace( /"/g, '""' ) }"` ).join( ',' ) ).join( '\n' );
		const a = document.createElement( 'a' );
		a.href = URL.createObjectURL( new Blob( [ csv ], { type: 'text/csv' } ) );
		a.download = name + '.csv';
		a.click();

	}

}

// ---------------------------------------------------------------- photo cropper

function loadPhotoFile( file ) {

	const url = URL.createObjectURL( file );
	const img = new Image();
	img.onload = () => {

		// downscale the source so it fits in storage
		const max = 720;
		const s = Math.min( 1, max / Math.max( img.width, img.height ) );
		const c = document.createElement( 'canvas' );
		c.width = Math.round( img.width * s );
		c.height = Math.round( img.height * s );
		c.getContext( '2d' ).drawImage( img, 0, 0, c.width, c.height );
		state.photoSrc = c.toDataURL( 'image/jpeg', 0.85 );
		state.crop = { zoom: 1.45, x: 0, y: 0.02 };
		URL.revokeObjectURL( url );
		setSource( c );
		save();

	};

	img.src = url;

}

function setSource( img ) {

	sourceImg = img;
	$( 'photo-frame' ).classList.toggle( 'has-photo', !! img );
	$( 'zoom-wrap' ).hidden = ! img;
	$( 'photo-remove' ).hidden = ! img;
	$( 'photo-hint' ).textContent = img ? t( 'photoDrag' ) : t( 'photoHint' );
	$( 'photo-zoom' ).value = state.crop.zoom;
	renderCrop();

}

function renderCrop() {

	const pv = $( 'photo-canvas' );
	const g = pv.getContext( '2d' );
	g.clearRect( 0, 0, pv.width, pv.height );
	if ( ! sourceImg ) {

		state.photo = null;
		onPhotoChange( null );
		return;

	}

	const out = state.photo || document.createElement( 'canvas' );
	out.width = out.height = 512;
	drawCrop( out.getContext( '2d' ), 512 );
	state.photo = out;
	g.drawImage( out, 0, 0, pv.width, pv.height );
	onPhotoChange( out );

}

function drawCrop( g, S ) {

	const img = sourceImg;
	const { zoom, x, y } = state.crop;
	const base = S / Math.min( img.width, img.height );
	const s = base * zoom;
	const w = img.width * s, h = img.height * s;
	g.fillStyle = '#c98f6b';
	g.fillRect( 0, 0, S, S );
	g.drawImage( img, S / 2 - w / 2 + x * S, S / 2 - h / 2 + y * S, w, h );

}

function bindCropper() {

	const frame = $( 'photo-frame' );
	let drag = null;
	frame.addEventListener( 'pointerdown', e => {

		if ( ! sourceImg ) return;
		frame.setPointerCapture( e.pointerId );
		drag = { x: e.clientX, y: e.clientY, cx: state.crop.x, cy: state.crop.y, w: frame.clientWidth };

	} );
	frame.addEventListener( 'pointermove', e => {

		if ( ! drag ) return;
		state.crop.x = drag.cx + ( e.clientX - drag.x ) / drag.w;
		state.crop.y = drag.cy + ( e.clientY - drag.y ) / drag.w;
		renderCrop();

	} );
	const end = () => {

		if ( drag ) save();
		drag = null;

	};

	frame.addEventListener( 'pointerup', end );
	frame.addEventListener( 'pointercancel', end );
	frame.addEventListener( 'wheel', e => {

		if ( ! sourceImg ) return;
		e.preventDefault();
		state.crop.zoom = Math.min( 3, Math.max( 1, state.crop.zoom - e.deltaY * 0.001 ) );
		$( 'photo-zoom' ).value = state.crop.zoom;
		renderCrop();
		save();

	}, { passive: false } );
	frame.tabIndex = 0;
	frame.addEventListener( 'keydown', e => {

		if ( ! sourceImg ) return;
		const step = 0.02;
		const map = { ArrowLeft: [ - step, 0 ], ArrowRight: [ step, 0 ], ArrowUp: [ 0, - step ], ArrowDown: [ 0, step ] };
		if ( map[ e.key ] ) {

			e.preventDefault();
			state.crop.x += map[ e.key ][ 0 ];
			state.crop.y += map[ e.key ][ 1 ];
			renderCrop();
			save();

		}

	} );
	$( 'photo-zoom' ).addEventListener( 'input', e => {

		state.crop.zoom = Number( e.target.value );
		renderCrop();

	} );
	$( 'photo-zoom' ).addEventListener( 'change', save );

}

// ---------------------------------------------------------------- init

export function initSetup( { onStart, photoChanged } ) {

	onPhotoChange = photoChanged;
	const hadSaved = load();
	if ( ! hadSaved || ! state.questions.length ) state.questions = structuredClone( SAMPLE_QUESTIONS[ getLang() ] );

	$( 'teacher-name' ).value = state.teacherName;
	$( 'student-name' ).value = state.studentName;
	$( 'time-per' ).value = String( state.timePer );
	$( 'teacher-name' ).addEventListener( 'input', e => {

		state.teacherName = e.target.value;
		save();

	} );
	$( 'student-name' ).addEventListener( 'input', e => {

		state.studentName = e.target.value;
		save();

	} );
	$( 'time-per' ).addEventListener( 'change', e => {

		state.timePer = Number( e.target.value );
		save();

	} );

	$( 'photo-input' ).addEventListener( 'change', e => {

		const f = e.target.files[ 0 ];
		if ( f ) loadPhotoFile( f );
		e.target.value = '';

	} );
	$( 'photo-remove' ).addEventListener( 'click', () => {

		state.photoSrc = null;
		setSource( null );
		save();

	} );
	bindCropper();
	if ( state.photoSrc ) {

		const img = new Image();
		img.onload = () => setSource( img );
		img.src = state.photoSrc;

	}

	$( 'excel-input' ).addEventListener( 'change', e => {

		const f = e.target.files[ 0 ];
		if ( f ) importFile( f );
		e.target.value = '';

	} );
	$( 'template-btn' ).addEventListener( 'click', downloadTemplate );
	$( 'add-q-btn' ).addEventListener( 'click', () => {

		state.questions.push( { q: '', options: [ '', '', '', '' ], answer: 0 } );
		changed();
		renderQuestions();
		const items = document.querySelectorAll( '.q-item textarea' );
		items[ items.length - 1 ]?.focus();

	} );
	$( 'sample-btn' ).addEventListener( 'click', () => {

		state.questions = structuredClone( SAMPLE_QUESTIONS[ getLang() ] );
		changed();
		renderQuestions();

	} );
	$( 'clear-btn' ).addEventListener( 'click', () => {

		state.questions = [];
		changed();
		renderQuestions();

	} );
	$( 'lang-btn' ).addEventListener( 'click', () => setLang( getLang() === 'ar' ? 'en' : 'ar' ) );
	onLang( () => {

		renderQuestions();
		$( 'photo-hint' ).textContent = sourceImg ? t( 'photoDrag' ) : t( 'photoHint' );

	} );

	$( 'start-btn' ).addEventListener( 'click', () => {

		const qs = playable();
		if ( ! qs.length ) {

			$( 'start-msg' ).textContent = t( 'needQuestion' );
			return;

		}

		onStart( qs );

	} );

	renderQuestions();

}
