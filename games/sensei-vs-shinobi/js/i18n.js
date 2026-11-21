// Bilingual strings (English / Arabic). Arabic switches the document to RTL.

const STRINGS = {
	en: {
		title: 'Sensei vs Shinobi',
		tagline: 'Answer right and the ninja strikes. Answer wrong and the teacher does.',
		langToggle: 'العربية',
		fighters: 'Fighters',
		teacherName: 'Teacher name',
		teacherNamePh: 'Mr. Kareem',
		studentName: 'Student name',
		studentNamePh: 'Layla',
		photo: 'Teacher photo',
		photoHint: 'Upload a front-facing photo. It becomes the teacher\'s face.',
		photoChoose: 'Choose photo',
		photoRemove: 'Remove photo',
		photoZoom: 'Zoom',
		photoDrag: 'Drag the photo to center the face.',
		questions: 'Questions',
		qCount: n => n === 1 ? '1 question ready' : `${n} questions ready`,
		qEmpty: 'No questions yet. Upload an Excel sheet or add one below.',
		uploadExcel: 'Upload Excel sheet',
		downloadTemplate: 'Download template',
		addQuestion: 'Add question',
		loadSamples: 'Use sample questions',
		clearAll: 'Clear all',
		excelHelp: 'Columns: Question, Option A, Option B, Option C, Option D, Answer. Answer can be a letter (A–D) or the exact text. Leave the options empty for a typed answer.',
		qPh: 'Type the question',
		optPh: l => `Option ${l}`,
		answer: 'Answer',
		answerPh: 'Correct answer',
		typedAnswer: 'Typed answer',
		remove: 'Remove',
		timePer: 'Seconds per question',
		noTimer: 'No timer',
		startFight: 'Start the fight',
		needQuestion: 'Add at least one question with a correct answer to start.',
		imported: n => `Imported ${n} questions from the sheet.`,
		importFail: 'That file has no readable questions. Check the columns match the template.',
		round: 'Round 1',
		fight: 'Fight!',
		finishHim: 'Finish him!',
		koJp: '完全勝利',
		koSub: 'Complete victory!',
		correct: 'Correct!',
		wrong: 'Wrong!',
		timeUp: 'Time is up!',
		correctWas: 'Correct answer:',
		typeHere: 'Type your answer',
		submit: 'Answer',
		qLabel: ( i, n ) => n ? `Question ${i} of ${n}` : `Question ${i}`,
		pause: 'Pause',
		paused: 'Paused',
		pausedSub: 'The fight and the timer are frozen. Press Esc to resume.',
		resume: 'Resume',
		cleared: n => n === 1 ? 'Cleared 1 question.' : `Cleared ${n} questions.`,
		removed: i => `Removed question ${i}.`,
		replacedSamples: 'Replaced the list with sample questions.',
		undo: 'Undo',
		restored: 'Questions restored.',
		downloadFail: 'Saving files isn\'t available here. Make a sheet with the columns listed below instead.',
		wins: name => `${name} wins!`,
		studentWinsSub: 'The ninja beat the teacher. Every answer landed.',
		teacherWinsSub: 'The teacher wins this round. Review the questions and fight again.',
		score: (c, t) => `${c} of ${t} correct`,
		review: 'Questions to review',
		noMistakes: 'No mistakes. Flawless.',
		yourAnswer: 'Your answer:',
		playAgain: 'Fight again',
		editSetup: 'Edit questions',
		sound: 'Sound',
		weapons: { katana: 'Katana', nunchaku: 'Nunchaku', shuriken: 'Shuriken', kunai: 'Kunai' },
		teacherDefault: 'Sensei',
		studentDefault: 'Shinobi',
		keysHint: 'Press 1–4 to answer',
		detention: 'Detention!',
		flawless: 'Flawless victory',
		lostWeapon: w => `Lost the ${w}!`,
		loading: 'Preparing the arena…',
	},
	ar: {
		title: 'المعلّم ضد النينجا',
		tagline: 'أجب صحيحًا فيضرب النينجا، وأخطئ فيضرب المعلّم.',
		langToggle: 'English',
		fighters: 'المقاتلون',
		teacherName: 'اسم المعلّم',
		teacherNamePh: 'الأستاذ كريم',
		studentName: 'اسم الطالب',
		studentNamePh: 'ليلى',
		photo: 'صورة المعلّم',
		photoHint: 'ارفع صورة أمامية للوجه، وستصبح وجه شخصية المعلّم.',
		photoChoose: 'اختر صورة',
		photoRemove: 'احذف الصورة',
		photoZoom: 'تكبير',
		photoDrag: 'اسحب الصورة لتوسيط الوجه.',
		questions: 'الأسئلة',
		qCount: n => n === 1 ? 'سؤال واحد جاهز' : (n === 2 ? 'سؤالان جاهزان' : `${n} أسئلة جاهزة`),
		qEmpty: 'لا توجد أسئلة بعد. ارفع ملف إكسل أو أضف سؤالًا بالأسفل.',
		uploadExcel: 'ارفع ملف إكسل',
		downloadTemplate: 'نزّل النموذج',
		addQuestion: 'أضف سؤالًا',
		loadSamples: 'استخدم أسئلة تجريبية',
		clearAll: 'امسح الكل',
		excelHelp: 'الأعمدة: السؤال، الخيار أ، الخيار ب، الخيار ج، الخيار د، الإجابة. اكتب الإجابة حرفًا (أ–د أو A–D) أو نصها كما هو. اترك الخيارات فارغة لإجابة مكتوبة.',
		qPh: 'اكتب السؤال',
		optPh: l => `الخيار ${l}`,
		answer: 'الإجابة',
		answerPh: 'الإجابة الصحيحة',
		typedAnswer: 'إجابة مكتوبة',
		remove: 'احذف',
		timePer: 'ثوانٍ لكل سؤال',
		noTimer: 'بلا مؤقت',
		startFight: 'ابدأ النزال',
		needQuestion: 'أضف سؤالًا واحدًا على الأقل مع إجابته الصحيحة للبدء.',
		imported: n => `تم استيراد ${n} من الأسئلة من الملف.`,
		importFail: 'لا يحتوي الملف على أسئلة مقروءة. تأكد أن الأعمدة تطابق النموذج.',
		round: 'الجولة الأولى',
		fight: 'قاتِل!',
		finishHim: 'أجهِز عليه!',
		koJp: '完全勝利',
		koSub: 'انتصار ساحق!',
		correct: 'إجابة صحيحة!',
		wrong: 'إجابة خاطئة!',
		timeUp: 'انتهى الوقت!',
		correctWas: 'الإجابة الصحيحة:',
		typeHere: 'اكتب إجابتك',
		submit: 'أجب',
		qLabel: ( i, n ) => n ? `السؤال ${i} من ${n}` : `السؤال ${i}`,
		pause: 'إيقاف مؤقت',
		paused: 'متوقف مؤقتًا',
		pausedSub: 'النزال والمؤقت متوقفان. اضغط Esc للمتابعة.',
		resume: 'تابِع',
		cleared: n => n === 1 ? 'تم مسح سؤال واحد.' : `تم مسح ${n} من الأسئلة.`,
		removed: i => `تم حذف السؤال ${i}.`,
		replacedSamples: 'تم استبدال القائمة بأسئلة تجريبية.',
		undo: 'تراجع',
		restored: 'تمت استعادة الأسئلة.',
		downloadFail: 'حفظ الملفات غير متاح هنا. أنشئ ملفًا بالأعمدة المذكورة بالأسفل.',
		wins: name => `فاز ${name}!`,
		studentWinsSub: 'هزم النينجا المعلّم، وأصابت كل إجابة هدفها.',
		teacherWinsSub: 'فاز المعلّم بهذه الجولة. راجع الأسئلة ثم نازل من جديد.',
		score: (c, t) => `${c} من ${t} صحيحة`,
		review: 'أسئلة للمراجعة',
		noMistakes: 'بلا أخطاء. أداء مثالي.',
		yourAnswer: 'إجابتك:',
		playAgain: 'نازل من جديد',
		editSetup: 'عدّل الأسئلة',
		sound: 'الصوت',
		weapons: { katana: 'الكاتانا', nunchaku: 'النونشاكو', shuriken: 'الشوريكن', kunai: 'الكوناي' },
		teacherDefault: 'المعلّم',
		studentDefault: 'النينجا',
		keysHint: 'اضغط 1–4 للإجابة',
		detention: 'حجز بعد الدوام!',
		flawless: 'انتصار بلا خدش',
		lostWeapon: w => `فقد ${w}!`,
		loading: 'نجهّز ساحة النزال…',
	}
};

let lang = 'en';
const listeners = new Set();

export function t( key, ...args ) {

	const v = STRINGS[ lang ][ key ] ?? STRINGS.en[ key ];
	return typeof v === 'function' ? v( ...args ) : v;

}

export function getLang() {

	return lang;

}

export function setLang( l ) {

	lang = l === 'ar' ? 'ar' : 'en';
	document.documentElement.lang = lang;
	document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
	try {

		localStorage.setItem( 'svs-lang', lang );

	} catch ( e ) { /* storage unavailable */ }

	applyStatic();
	listeners.forEach( fn => fn( lang ) );

}

export function onLang( fn ) {

	listeners.add( fn );

}

// Fill every element carrying data-i18n / data-i18n-ph.
export function applyStatic( root = document ) {

	root.querySelectorAll( '[data-i18n]' ).forEach( el => {

		el.textContent = t( el.dataset.i18n );

	} );
	root.querySelectorAll( '[data-i18n-ph]' ).forEach( el => {

		el.placeholder = t( el.dataset.i18nPh );

	} );
	root.querySelectorAll( '[data-i18n-label]' ).forEach( el => {

		el.setAttribute( 'aria-label', t( el.dataset.i18nLabel ) );

	} );

}

export function initLang() {

	let saved = null;
	try {

		saved = localStorage.getItem( 'svs-lang' );

	} catch ( e ) { /* storage unavailable */ }

	if ( ! saved ) saved = ( navigator.language || 'en' ).startsWith( 'ar' ) ? 'ar' : 'en';
	setLang( saved );

}

export const SAMPLE_QUESTIONS = {
	en: [
		{ q: 'What is 7 × 8?', options: [ '54', '56', '64', '48' ], answer: 1 },
		{ q: 'Which planet is known as the Red Planet?', options: [ 'Venus', 'Jupiter', 'Mars', 'Mercury' ], answer: 2 },
		{ q: 'What is the tallest mountain in Japan?', options: [ 'Mount Fuji', 'Mount Kita', 'Mount Aso', 'Mount Haku' ], answer: 0 },
		{ q: 'Water boils at what temperature at sea level?', options: [ '90 °C', '50 °C', '120 °C', '100 °C' ], answer: 3 },
		{ q: 'How many sides does a hexagon have?', options: [ '5', '6', '7', '8' ], answer: 1 },
		{ q: 'What gas do plants absorb from the air?', options: [ 'Oxygen', 'Nitrogen', 'Carbon dioxide', 'Helium' ], answer: 2 },
		{ q: 'Type the capital city of Japan.', options: [], answer: 'Tokyo' },
		{ q: 'What is 15% of 200?', options: [ '15', '20', '30', '35' ], answer: 2 },
	],
	ar: [
		{ q: 'كم يساوي ٧ × ٨؟', options: [ '٥٤', '٥٦', '٦٤', '٤٨' ], answer: 1 },
		{ q: 'أي كوكب يُعرف بالكوكب الأحمر؟', options: [ 'الزهرة', 'المشتري', 'المريخ', 'عطارد' ], answer: 2 },
		{ q: 'ما أعلى جبل في اليابان؟', options: [ 'جبل فوجي', 'جبل كيتا', 'جبل آسو', 'جبل هاكو' ], answer: 0 },
		{ q: 'عند أي درجة يغلي الماء عند مستوى سطح البحر؟', options: [ '٩٠ °م', '٥٠ °م', '١٢٠ °م', '١٠٠ °م' ], answer: 3 },
		{ q: 'كم ضلعًا للشكل السداسي؟', options: [ '٥', '٦', '٧', '٨' ], answer: 1 },
		{ q: 'ما الغاز الذي تمتصه النباتات من الهواء؟', options: [ 'الأكسجين', 'النيتروجين', 'ثاني أكسيد الكربون', 'الهيليوم' ], answer: 2 },
		{ q: 'اكتب اسم عاصمة اليابان.', options: [], answer: 'طوكيو' },
		{ q: 'كم يساوي ١٥٪ من ٢٠٠؟', options: [ '١٥', '٢٠', '٣٠', '٣٥' ], answer: 2 },
	]
};
