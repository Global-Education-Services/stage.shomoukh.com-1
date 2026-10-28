// Language of the current page (set on <html lang> by scripts/build-arabic.mjs) and the
// text the scripts write into it. Arabic pages live under /ar/ at the same paths.

export const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
export const isArabic = lang === 'ar';
export const LANGUAGE_KEY = 'shomoukh-lang';

const messages = {
  en: {
    searchResults: 'Search results',
    searchEmpty: 'Enter a topic to search this website.',
    searching: 'Searching website content…',
    searchCount: count => `${count} matching pages and sections`,
    searchNone: 'No matching content found. Try a different topic, such as admissions, campuses or tours.',
    searchFailed: 'Search could not load. Please use the website menu or try again.',
    officialSource: ' · Official GES source',
    playVideo: 'Play background video',
    pauseVideo: 'Pause background video',
    playLabel: 'PLAY VIDEO',
    pauseLabel: 'PAUSE VIDEO',
    videoFailed: 'The video could not play. Please try again.',
    sending: 'Sending…',
    securityError: 'Security check could not load. Please refresh the page or contact the campus.',
    securityCode: code => `(Error ${code})`,
    chooseDay: 'Please select at least one preferred attendance day.',
    applyFailed: 'Unable to send application',
    submitFailed: 'Unable to submit.',
    tryAgain: 'Please try again or contact the campus directly.',
    thanksApply: 'Thank you for applying.',
    thanksVisit: 'Thank you for booking a visit.',
    thanksContact: 'Thank you for contacting us.',
    thanksApplyBody: 'Thank you for enrolling. Our admissions team will be in touch.',
    thanksBody: 'Our team will be in touch.',
    successEyebrow: 'SHOMOUKH NURSERY SCHOOL',
  },
  ar: {
    searchResults: 'نتائج البحث',
    searchEmpty: 'اكتب موضوعًا للبحث في هذا الموقع.',
    searching: 'جارٍ البحث في محتوى الموقع…',
    searchCount: count => count === 1 ? 'نتيجة واحدة مطابقة' : count === 2 ? 'نتيجتان مطابقتان' : count <= 10 ? `${count} نتائج مطابقة` : `${count} نتيجة مطابقة`,
    searchNone: 'لم نعثر على محتوى مطابق. جرّب موضوعًا آخر، مثل القبول أو الفروع أو الجولات.',
    searchFailed: 'تعذّر تحميل البحث. يُرجى استخدام قائمة الموقع أو المحاولة مرة أخرى.',
    officialSource: ' · مصدر رسمي من GES',
    playVideo: 'تشغيل فيديو الخلفية',
    pauseVideo: 'إيقاف فيديو الخلفية مؤقتًا',
    playLabel: 'تشغيل الفيديو',
    pauseLabel: 'إيقاف الفيديو',
    videoFailed: 'تعذّر تشغيل الفيديو. يُرجى المحاولة مرة أخرى.',
    sending: 'جارٍ الإرسال…',
    securityError: 'تعذّر تحميل التحقق الأمني. يُرجى تحديث الصفحة أو التواصل مع الفرع.',
    securityCode: code => `(رمز الخطأ ${code})`,
    chooseDay: 'يُرجى اختيار يوم حضور مفضّل واحد على الأقل.',
    applyFailed: 'تعذّر إرسال الطلب.',
    submitFailed: 'تعذّر الإرسال.',
    tryAgain: 'يُرجى المحاولة مرة أخرى أو التواصل مع الفرع مباشرةً.',
    thanksApply: 'شكرًا لتقديمك الطلب.',
    thanksVisit: 'شكرًا لحجزك زيارة.',
    thanksContact: 'شكرًا لتواصلك معنا.',
    thanksApplyBody: 'شكرًا لتسجيلك. سيتواصل معك فريق القبول قريبًا.',
    thanksBody: 'سيتواصل معك فريقنا قريبًا.',
    successEyebrow: 'حضانة شموخ',
  },
};

export function t(key, ...args) {
  const value = messages[lang][key] ?? messages.en[key];
  return typeof value === 'function' ? value(...args) : value;
}

// Errors returned by /api/form-submission are English; show Arabic visitors the same meaning.
const serverErrors = {
  'Submission is too large.': 'حجم الطلب كبير جدًا.',
  'Invalid submission.': 'الطلب غير صالح.',
  'Invalid JSON.': 'الطلب غير صالح.',
  'Method not allowed.': 'الطلب غير مسموح به.',
  'Unsupported request type.': 'نوع الطلب غير مدعوم.',
  'Invalid request origin.': 'مصدر الطلب غير صالح.',
  'Submissions are temporarily unavailable. Please contact the campus.': 'الإرسال غير متاح مؤقتًا. يُرجى التواصل مع الفرع.',
  'Too many submissions. Please wait a minute and try again.': 'عدد كبير من محاولات الإرسال. يُرجى الانتظار دقيقة ثم المحاولة مجددًا.',
  'Invalid submission fields.': 'بعض حقول الطلب غير صالحة.',
  'Please complete the security check.': 'يُرجى إكمال التحقق الأمني.',
  'Security check is temporarily unavailable. Please try again.': 'التحقق الأمني غير متاح مؤقتًا. يُرجى المحاولة مرة أخرى.',
  'Security check expired or failed. Please try again.': 'انتهت صلاحية التحقق الأمني أو لم ينجح. يُرجى المحاولة مرة أخرى.',
  'We could not deliver your submission. Please try again later or contact the campus.': 'تعذّر إيصال طلبك. يُرجى المحاولة لاحقًا أو التواصل مع الفرع.',
  'Unable to confirm delivery. Please try again.': 'تعذّر تأكيد الإرسال. يُرجى المحاولة مرة أخرى.',
  'Unable to deliver submission. Please try again later or contact the campus.': 'تعذّر إيصال الطلب. يُرجى المحاولة لاحقًا أو التواصل مع الفرع.',
};
export const localizeServerError = message => isArabic ? serverErrors[message] || message : message;

// The same page in the other language: /about <-> /ar/about, keeping query and hash.
export function alternatePath(target, {pathname, search, hash} = location) {
  const arabicPath = pathname === '/ar' || pathname.startsWith('/ar/');
  if (target === 'ar') return (arabicPath ? pathname : `/ar${pathname === '/' ? '/' : pathname}`) + search + hash;
  return (arabicPath ? pathname.slice(3) || '/' : pathname) + search + hash;
}

export function rememberLanguage(value) {
  try { localStorage.setItem(LANGUAGE_KEY, value); } catch { /* Storage blocked: the URL still carries the language. */ }
}

// Browsers phrase built-in validation in the browser's language; Arabic pages say it in Arabic.
export function localizeValidation(root = document) {
  if (!isArabic) return;
  const message = field => {
    const {validity} = field;
    if (validity.valueMissing) return field.type === 'checkbox' ? 'يُرجى تحديد هذا المربع للمتابعة.' : field.type === 'radio' || field.tagName === 'SELECT' ? 'يُرجى اختيار أحد الخيارات.' : 'يُرجى تعبئة هذا الحقل.';
    if (validity.typeMismatch) return field.type === 'email' ? 'يُرجى إدخال بريد إلكتروني صحيح.' : 'يُرجى إدخال قيمة صحيحة.';
    if (validity.tooLong) return `يُرجى ألّا يتجاوز النص ${field.maxLength} حرفًا.`;
    if (validity.tooShort) return `يُرجى إدخال ${field.minLength} أحرف على الأقل.`;
    if (validity.rangeUnderflow || validity.rangeOverflow) return field.type === 'date' ? 'يُرجى اختيار تاريخ ضمن النطاق المسموح.' : 'يُرجى إدخال قيمة ضمن النطاق المسموح.';
    if (validity.patternMismatch || validity.badInput) return 'يُرجى إدخال قيمة بالصيغة المطلوبة.';
    return '';
  };
  root.addEventListener('invalid', event => {
    const field = event.target;
    field.setCustomValidity('');
    if (!field.validity.valid) field.setCustomValidity(message(field));
  }, true);
  root.addEventListener('input', event => event.target.setCustomValidity?.(''), true);
  root.addEventListener('change', event => event.target.setCustomValidity?.(''), true);
}
