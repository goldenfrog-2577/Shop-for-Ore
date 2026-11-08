// --- Цензура: мат и ругательства → «***» ---
// Где: общий чат и сообщения бота (chat/chat.js), !msg / !reply, !say, !report, префиксы (!prefix, !tag rank:) —
// префикс с ругательством не ставится вовсе. Для всех, включая персонал; без переключателя.
// Как ищем. Сообщение режется на слова (буквы, цифры, @ и $; точки, дефисы, звёздочки и §-коды внутри слова — часть слова,
// «б.л.я» и «бл§aять» — одно слово). Подряд идущие однобуквенные слова через пробел склеиваются («х у й»).
// У слова три вида: как есть (строчные, без разделителей), «кириллицей» (латинские и цифровые двойники → кириллица:
// xyй, 6ля, пuзда) и «латиницей» (кириллические и цифровые двойники → латиница, без диакритики: blyat, sh1t, fück).
// У каждого вида проверяется и вариант со сжатыми повторами («бляяя» → «бля»).
// Корни ищем с начала слова или после типичной приставки, а не в любом месте — иначе «употреблять», «ребёнок», «computadora»,
// «class», «Scunthorpe» стали бы звёздочками. Короткие или многозначные слова — только целым словом (EXACT).
// Белый список — для оставшихся совпадений с обычными словами. Набор проверок: tools/tests/censor.mjs.

export const MASK = '***';

// Кириллица (вид «кириллицей», ё → е)
const RU_PFX = '(?:на|по|за|у|вы|от|до|раз|рас|из|ис|съ|въ|об|при|про|пере|под|недо|долбо|ни|вз|вь)?';
const CYR = [
	new RegExp(`^${RU_PFX}ху[йеияю]`),                               // хуй, нахуй, похуй, хуёвый, хуйня (не «хулиган», «художник»)
	/пизд/, /пезд/,                                                   // пизда, пиздец, распиздяй
	new RegExp(`^${RU_PFX}еб(?:а|у|л|н|е|и|о|ищ|ыр|уч|$)`),          // ебать, заебись, уебан, долбоёб (не «ребёнок», «небо», «себе», «Эбола»)
	new RegExp(`^${RU_PFX}їб`),                                       // їбати, заїбав
	new RegExp(`^${RU_PFX}бля`), /^выбляд/,                            // бля, блять, блядь (не «употреблять», «рубля»)
	/^сук(?:а|и|е|у|ой|ам|ами|ах|ин|ина|ины|ино)$/, /^суч(?:к|ар|ье|ий|ара)/, // сука, сукин, сучка (не «сукно», «сук»)
	/^муд(?:ак|ил|озвон|оеб|ач)/,                                      // мудак (не «мудрый»)
	/^пид(?:о|а)р/, /^пидр/, /^педик(?:и|а|ов|ам)?$/,                  // не «педикюр»
	/^г(?:а|о)ндон/,                                                  // не «гондола»
	/шлюх/, /залуп/, new RegExp(`^${RU_PFX}дроч`),
	/^манд(?:а|ы|у|ой|е)$/, /^мандавошк/,                             // не «мандарин», «мандат»
	/курв/,
	// Лёгкие ругательства
	/жоп/, /^срак/, /^дуп(?:а|ы|у|ой|е)$/, /говн/, /дерьм/,
	new RegExp(`^${RU_PFX}(?:срать|срал(?:а|и|о|ся)?|сру|срут|срет|срешь|срем|срете|срач|сран(?:ый|ая|ое|ые|ого|ой|ую|ь)|сральн[а-я]*)$`), // не «сразу», «сруб»
	/^(?:на|по|ни|за)?хер(?:ня|ни|ню|ов|ова|ово|овый|овая|а|ом)?$/,    // хер, херня, нахер (не «Херсон», «херувим»)
	/^(?:на|по|ни|за)?хрен/,
	// Оскорбления
	/^дебил/, /^долба/, /^мраз/, /^твар(?:ь|и|ью|ей|ям)$/, /^гнид/, /^падл/, /^ублюд/,
	/^урод(?:ы|а|у|ом|ина|ец|ов|ливый|ливая)?$/, /^чмо(?:шник|шница)?$/, /^чмыр/, /^лох(?:и|а|у|ом|ов|ушка)?$/, /^даун(?:ы|а|ом|ов)?$/,   // не «чмокнуть»
	/^придур/, /^идиот/, /^дура(?:к|ч|чок|чина)?/, /^дуры$/, /^кретин/, /^скотин/
];
// Латиница (вид «латиницей»: без диакритики, ß → ss)
const LAT = [
	/fuck/, /^fuk/, /^fck/,                                            // fuck, motherfucker
	/^shit/, /bulshit/, /horseshit/, /dipshit/,                        // не «shiitake» (белый список)
	/bitch/, /cunt/, /^ashole/, /^asshole/, /^bastard/, /^whor/, /^slut/, /^dickhead/, /^wank/, /^twat/,
	/^pricks?$/, /^douch/, /^jackas/, /^damn/, /^goddamn/, /^craps?$/, /^crapp/, /^pis(?:s|sed|sing|ed|ing)$/, /^retard/,
	/^nig(?:g)?(?:er|a|ah|az|as)s?$/, /^fag(?:got|ot)?s?$/,
	// Русский мат транслитом
	/^(?:na|po|ni)?(?:h|x|kh)u[iyj]/, /^(?:na|po|ni)?xy(?:i|j|y|u)/, /pizd/, /pezd/,
	/^(?:za|na|po|vy|wy|ot|do|raz|roz|prze|dolbo)?(?:j|y)?eb(?:a|u|l|n)/,  // ebat, zaebis, jebać (не «ebay» — белый список, не «Sebastián»)
	/^bl(?:y|j)a/, /^suk(?:a|i)$/, /^mudak/, /^durak/, /^debil/, /^idiot/, /^moron/, /^kretin/, /^pid(?:o|a)r/, /^g(?:a|o)ndon/, /kurw/, /kurv/,
	// Polski
	/^(?:ch|h)uj/, /pierd/, /^cip(?:a|y|e|o)$/, /^dup(?:a|y)$/, /^gown(?:o|a)$/, /^kutas/,
	// Deutsch
	/scheis/, /^fick/, /^arsch/, /^fotz/, /^wichs/, /hurensohn/, /^schlampe$/, /^kack/, /^verdamt/, /^mistst/,       // не «schlampig», «verdampfen»
	// Français
	/^putain/, /merd/, /^conar/, /^conas/, /^encul/, /^bordel$/, /^niqu(?:e|er|es|ez)?$/, /^putes?$/, /^chier/, /^couil/,
	// Italiano
	/^caz(?:o|i)$/, /^cazat/, /fancul/, /^stronz/, /^putan/, /^coglion/, /^minchi/,
	// Português
	/^pora$/, /^caralh/, /^fod(?:a|e|er|ase|ido|ida|idos|idas)$/, /^cona$/, /^buceta/, /^viados?$/,
	// Español
	/^put(?:a|o|as|os)$/, /^hij(?:o|ue)put/, /^mierd/, /^joder/, /^jodid/, /^cabron/, /^gilipol/, /^pendej/, /^verga$/,
	/^culer(?:o|a|os|as)$/, /^maric(?:on|ones|a|as)$/, /^cojon/, /^culo$/, /^ching(?:ar|a|ada|ado|on)$/, /^tocapelotas/,
	// Türkçe
	/^amk$/, /^siktir/, /^sikerim/, /^orospu/,
	// Čeština / Svenska / Nederlands
	/^kokot/, /^hovn/, /^javl/, /^klotzak/, /^godverdom/, /^kanker/
];
// Только целым словом, как написано (строчные, без разделителей): короткие и многозначные
const EXACT = new Set(['ass', 'asses', 'cock', 'cocks', 'dick', 'dicks', 'coño', 'amına', 'göt', 'piç', 'píča', 'kut', 'kuk', 'fitta', 'helvete']);
// Обычные слова, которые иначе совпали бы
const WHITE = new Set(['scunthorpe', 'shiitake', 'shitake', 'ebay', 'damnation', 'бляха', 'бляхи', 'бляху', 'бляхой']);

const CYR_MAP = { a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м', o: 'о', p: 'р', t: 'т', x: 'х', y: 'у', u: 'и', 3: 'з', 6: 'б', 0: 'о', '@': 'а', 4: 'ч', 'ё': 'е' };
const LAT_MAP = { 'а': 'a', 'в': 'b', 'с': 'c', 'е': 'e', 'ё': 'e', 'н': 'h', 'к': 'k', 'м': 'm', 'о': 'o', 'р': 'p', 'т': 't', 'х': 'x', 'у': 'y',
	0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', '$': 's', 'ß': 'ss', 'ı': 'i' };
const squeeze = (s) => s.replace(/(.)\1+/g, '$1');
const map = (s, m) => [...s].map(ch => m[ch] ?? ch).join('');
// Диакритика: normalize('NFD') и снять знаки; если движок не умеет normalize — таблица самых частых букв
const ACCENTS = { 'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a', 'ą': 'a', 'ç': 'c', 'ć': 'c', 'č': 'c', 'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e', 'ę': 'e', 'ě': 'e',
	'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ł': 'l', 'ñ': 'n', 'ń': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ř': 'r', 'ś': 's', 'š': 's', 'ş': 's', 'ù': 'u', 'ú': 'u',
	'û': 'u', 'ü': 'u', 'ů': 'u', 'ý': 'y', 'ÿ': 'y', 'ź': 'z', 'ż': 'z', 'ž': 'z', 'ğ': 'g' };
const deaccent = (s) => {
	try { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch { return [...s].map(ch => ACCENTS[ch] ?? ch).join(''); }
};

/** Ругательство ли слово (без пробелов). */
export function isProfane(word) {
	const raw = word.toLowerCase().replace(/§./g, '').replace(/[.\-_*'’]/g, '');
	if (!raw || WHITE.has(raw)) return false;
	if (EXACT.has(raw)) return true;
	const lat = deaccent(map(raw, LAT_MAP)).replace(/ı/g, 'i');
	if (WHITE.has(lat)) return false;
	const cyr = map(raw, CYR_MAP);
	for (const v of new Set([cyr, squeeze(cyr)])) if (CYR.some(r => r.test(v))) return true;
	for (const v of new Set([lat, squeeze(lat)])) if (LAT.some(r => r.test(v))) return true;
	return false;
}

// Слово: буквы, цифры, @ и $; внутри — §-коды и разделители . - _ * '
// Без классов свойств Юникода (\p с фигурными скобками): движок скриптов 1.19.50 их не знает — SyntaxError в игре. Диапазоны явно:
// латиница с диакритикой (À–ɏ без × и ÷), греческий, кириллица с дополнением
const WORD = /(?:§.|[0-9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u052F@$])+(?:[.\-_*'’]+(?:§.|[0-9A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F\u0370-\u03FF\u0400-\u052F@$])+)*/g;

/** Заменить ругательства на «***». Возвращает новый текст (тот же, если менять нечего). */
export function censor(text) {
	const words = [...String(text).matchAll(WORD)].map(m => ({ start: m.index, end: m.index + m[0].length, text: m[0] }));
	const spans = [];
	for (let i = 0; i < words.length; i++) {
		// «х у й», «f u c k» — подряд однобуквенные слова через пробелы склеиваем
		if ([...words[i].text.replace(/§./g, '')].length === 1) {
			let j = i;
			while (j + 1 < words.length && [...words[j + 1].text.replace(/§./g, '')].length === 1 && /^\s+$/.test(text.slice(words[j].end, words[j + 1].start))) j++;
			if (j - i >= 2 && isProfane(words.slice(i, j + 1).map(w => w.text).join(''))) { spans.push([words[i].start, words[j].end]); i = j; continue; }
		}
		if (isProfane(words[i].text)) spans.push([words[i].start, words[i].end]);
	}
	if (!spans.length) return text;
	let out = '', at = 0;
	for (const [s, e] of spans) { out += text.slice(at, s) + MASK; at = e; }
	return out + text.slice(at);
}
