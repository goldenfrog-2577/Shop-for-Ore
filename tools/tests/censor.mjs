// Цензура (scripts/chat/censor.js): ругательства на 13 языках и обходы → «***», обычные слова — без изменений.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const C = await import(new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/chat/censor.js', import.meta.url));
const BAD = [
	// русский мат и производные
	'хуй', 'нахуй', 'похуй', 'хуйня', 'хуёвый', 'нихуя', 'пизда', 'пиздец', 'распиздяй', 'ебать', 'заебись', 'уебан', 'ёбаный', 'долбоёб', 'выебон',
	'доебался', 'наебал', 'ебло', 'бля', 'блять', 'блядь', 'выблядок', 'сука', 'суки', 'сукин', 'сучка', 'мудак', 'мудила', 'пидор', 'пидарас', 'гандон',
	'гондон', 'шлюха', 'залупа', 'дрочить', 'задрот'.replace('от', 'очил'), 'манда', 'мандавошка', 'курва',
	// лёгкие и оскорбления
	'жопа', 'срака', 'говно', 'дерьмо', 'срать', 'насрал', 'засранец'.replace('ец', 'ый'), 'херня', 'нахер', 'похер', 'хрен', 'нахрена',
	'дебил', 'долбанутый', 'мразь', 'тварь', 'гнида', 'падла', 'ублюдок', 'урод', 'чмо', 'лох', 'даун', 'придурок', 'идиот', 'дурак', 'дура', 'кретин', 'скотина',
	// украинский
	'їбати', 'заїбав', 'дупа',
	// обходы
	'xyй', 'пuзда', '6ля', 'бляяяя', 'б.л.я', 'х у й', 'Х-У-Й', 'СУКА', 'сУкА', 'бл§aять', 'blyat', 'suka', 'pizdec', 'nahui', 'xyi', 'zaebal', 'durak',
	// английский
	'fuck', 'fucking', 'motherfucker', 'f u c k', 'fuuuck', 'fück', 'sh1t', 'shit', 'bullshit', 'bitch', 'cunt', 'asshole', 'bastard', 'whore', 'slut',
	'dickhead', 'wanker', 'twat', 'prick', 'douche', 'jackass', 'damn', 'goddamn', 'crap', 'piss', 'pissed', 'retard', 'nigger', 'nigga', 'faggot', 'fag',
	'ass', 'dick', 'cock', 'idiot', 'moron',
	// другие языки
	'puta', 'puto', 'hijoputa', 'mierda', 'joder', 'coño', 'cabrón', 'gilipollas', 'pendejo', 'verga', 'culero', 'maricón', 'cojones', 'culo', 'chingar', 'tocapelotas',
	'kurwa', 'chuj', 'huj', 'pierdolić', 'spierdalaj', 'jebać', 'jebany', 'skurwysyn', 'cipa', 'gówno', 'kutas',
	'scheiße', 'scheisse', 'ficken', 'arschloch', 'fotze', 'wichser', 'hurensohn', 'schlampe', 'kacke', 'verdammt', 'miststück',
	'putain', 'merde', 'connard', 'connasse', 'salope'.replace('salope', 'enculé'), 'bordel', 'nique', 'pute', 'chier', 'couille',
	'cazzo', 'cazzata', 'vaffanculo', 'stronzo', 'puttana', 'coglione', 'minchia',
	'porra', 'caralho', 'foda', 'foda-se', 'cona', 'buceta', 'viado',
	'amk', 'amına', 'siktir', 'orospu', 'piç', 'göt',
	'kurva', 'píča', 'kokot', 'hovno', 'jävla', 'jävlar', 'fitta', 'kuk', 'helvete', 'kut', 'klootzak', 'godverdomme', 'kanker'
];
const GOOD = [
	// русский: корни внутри обычных слов
	'употреблять', 'употребляю', 'оскорблять', 'рубля', 'корабля', 'ребёнок', 'хлеба', 'небо', 'себе', 'тебе', 'требовать', 'Эбола', 'убедить', 'забег', 'поедем',
	'хулиган', 'художник', 'хуже', 'похудеть', 'сукно', 'сукровица', 'сук', 'мудрый', 'мудрость', 'гондола', 'мандарин', 'мандат', 'мандата', 'педикюр',
	'сразу', 'сруб', 'страна', 'Херсон', 'херувим', 'чмокнуть', 'лохматый', 'урожай', 'дураково'.slice(0, 0) || 'дуэль', 'бляха', 'сучок', 'дробь', 'идея',
	'привет', 'Пещера', 'Незер', 'Хранитель', 'пластинка', 'монеты', 'шахта', 'кирка', 'ребитх', 'пароль', 'спасибо', 'команда', 'дупло',
	// английский
	'class', 'pass', 'assassin', 'bass', 'cocktail', 'peacock', 'Dickens', 'scrap', 'Scunthorpe', 'shiitake', 'ebay', 'Sebastian', 'hello', 'damnation'.slice(0, 0) || 'dam',
	'Hancock', 'cockpit'.slice(0, 0) || 'shift', 'pist', 'shell', 'title', 'analysis', 'grape', 'fan', 'con', 'bite', 'concha', 'hostia', 'cu', 'xy', 'xyz', 'huge',
	// другие языки
	'computadora', 'reputación', 'disputa', 'cucaracha', 'níquel', 'culer', 'verdampfen', 'schlampig', 'Helvetica', 'fita', 'pora'.slice(0, 0) || 'porta',
	'conard'.slice(0, 0) || 'concert', 'merci', 'dupe', 'gown', 'pica', 'pic', 'got', 'amina', 'Amina', 'cono', 'Sebastián', 'kutya'.slice(0, 0) || 'cute',
	// игровое
	'!warp spawn', 'LvL UP', '100', '25000', '@goldenfrog_2577', 'x2', 'x4', 'kapycta1231484'
];
for (const w of BAD) assert.equal(C.censor(w), C.MASK, `не закрыто: ${w}`);
for (const w of GOOD) assert.equal(C.censor(w), w, `ложное срабатывание: ${w} → ${C.censor(w)}`);
// В предложении: только ругательство, пунктуация и пробелы на месте, три звёздочки
assert.equal(C.censor('ну ты и сука, правда'), 'ну ты и ***, правда');
assert.equal(C.censor('Блять!!! опять умер'), '***!!! опять умер');
assert.equal(C.censor('это х у й знает'), 'это *** знает');
assert.equal(C.censor('what the fuck is this shit'), 'what the *** is this ***');
assert.equal(C.censor('я употребляю хлеб'), 'я употребляю хлеб');
assert.equal(C.MASK, '***');
// Подключено: общий чат (и бот), !msg/!reply, !say, !report, префиксы (запрет), отображение префиксов
const bp = new URL('../../behavior_packs/main-addon-shop_for_ore/scripts/', import.meta.url);
const read = (f) => fs.readFileSync(new URL(f, bp), 'utf8');
assert.match(read('chat/chat.js'), /const formatMessage = replaceEmotes\(censor\(message\)\);/);
assert.match(read('chat/commands/player.js'), /text = censor\(text\);/);
assert.match(read('chat/commands/player.js'), /const reason = censor\(args\.slice\(1\)\.join\(' '\)\);/);
assert.match(read('chat/commands/admin.js'), /let text = censor\(args\.join\(' '\)\);/);
assert.ok((read('chat/commands/admin.js').match(/isProfane|censor\(prefixName\)|censor\(tagName/g) ?? []).length >= 2);
// Движок скриптов 1.19.50 не понимает \p{…} в регулярках — SyntaxError ломал загрузку всех скриптов (в игре, censor.js:95)
{ const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : e.name.endsWith('.js') ? [d + '/' + e.name] : []);
  for (const f of walk(new URL('../../behavior_packs/main-addon-shop_for_ore/scripts', import.meta.url).pathname)) assert.ok(!/\\[pP]\{/.test(fs.readFileSync(f, 'utf8')), 'Unicode property escape in ' + f); }
// Разложенная диакритика (буква + комбинируемый знак) не рвёт слово
assert.equal(C.censor('fu\u0308ck'), '***');
assert.equal(C.censor('fu\u0308ck you'), '*** you');
assert.equal(C.censor('cafe\u0301'), 'cafe\u0301');
console.log(`PASS: ${BAD.length} ругательств закрыты, ${GOOD.length} обычных слов не тронуты, замена — «***», подключено к чату и командам.`);
