// Каталог музыки. Здесь меняются названия, исполнители и состав плейлистов.
// id хранится в тегах коллекции и связывает запись с событием sfo:music.<id>.
// При добавлении записи внеси её в sounds/sound_definitions.json обоих паков:
// в ресурспаке укажи путь к OGG, в паке поведения — точную длительность и данные о треке.

function track(id, title, author, seconds, file = `sounds/music/game/${id}`) {
	return { id, file, seconds, title, author };
}

// У старых пластинок текстуры начинаются с record_, у новых имя текстуры задаётся явно.
// У Pigstep отличается ещё и имя самого OGG.
function disc(id, title, author, seconds, { file = id, icon = `record_${id}` } = {}) {
	return {
		...track(id, title, author, seconds, `sounds/music/game/records/${file}`),
		item: `minecraft:music_disc_${id}`,
		icon: `textures/items/${icon}`
	};
}

// seconds — справочное время в секундах. Для перемотки плеер берёт точную длительность из SoundInstance.
export const TRACKS = [
	// Тема карты из ресурс-пака
	track('emerald_tycoon', 'Emerald Tycoon', 'Razzleberries', 75, 'sounds/music/main.theme'),

	// Caves & Cliffs
	track('stand_tall', 'Stand Tall', 'Lena Raine', 308),
	track('left_to_bloom', 'Left to Bloom', 'Lena Raine', 342),
	track('wending', 'Wending', 'Lena Raine', 314),
	track('infinite_amethyst', 'Infinite Amethyst', 'Lena Raine', 271),
	track('one_more_day', 'One More Day', 'Lena Raine', 278),
	track('floating_dream', 'Floating Dream', 'Kumi Tanioka', 206),
	track('comforting_memories', 'Comforting Memories', 'Kumi Tanioka', 275),
	track('an_ordinary_day', 'An Ordinary Day', 'Kumi Tanioka', 331),

	// The Wild Update
	track('aerie', 'Aerie', 'Lena Raine', 296),
	track('firebugs', 'Firebugs', 'Lena Raine', 312),
	track('labyrinthine', 'Labyrinthine', 'Lena Raine', 324),
	track('ancestry', 'Ancestry', 'Lena Raine', 343),

	// Volume Beta — файлы creative, menu и nether имеют числовые имена
	track('biome_fest', 'Biome Fest', 'C418', 378, 'sounds/music/game/creative/creative1'),
	track('blind_spots', 'Blind Spots', 'C418', 332, 'sounds/music/game/creative/creative2'),
	track('haunt_muskie', 'Haunt Muskie', 'C418', 361, 'sounds/music/game/creative/creative3'),
	track('aria_math', 'Aria Math', 'C418', 310, 'sounds/music/game/creative/creative4'),
	track('dreiton', 'Dreiton', 'C418', 497, 'sounds/music/game/creative/creative5'),
	track('taswell', 'Taswell', 'C418', 515, 'sounds/music/game/creative/creative6'),
	track('mutation', 'Mutation', 'C418', 185, 'sounds/music/menu/menu1'),
	track('moog_city_2', 'Moog City 2', 'C418', 180, 'sounds/music/menu/menu2'),
	track('beginning_2', 'Beginning 2', 'C418', 176, 'sounds/music/menu/menu3'),
	track('floating_trees', 'Floating Trees', 'C418', 244, 'sounds/music/menu/menu4'),
	track('concrete_halls', 'Concrete Halls', 'C418', 254, 'sounds/music/game/nether/nether1'),
	track('dead_voxel', 'Dead Voxel', 'C418', 296, 'sounds/music/game/nether/nether2'),
	track('warmth', 'Warmth', 'C418', 239, 'sounds/music/game/nether/nether3'),
	track('ballad_of_the_cats', 'Ballad of the Cats', 'C418', 275, 'sounds/music/game/nether/nether4'),

	// Nether Update
	track('rubedo', 'Rubedo', 'Lena Raine', 312, 'sounds/music/game/nether/rubedo'),
	track('chrysopoeia', 'Chrysopoeia', 'Lena Raine', 243, 'sounds/music/game/nether/chrysopoeia'),
	track('so_below', 'So Below', 'Lena Raine', 319, 'sounds/music/game/nether/so_below'),

	// Пластинки до Trails & Tales
	disc('13', '13', 'C418', 178),
	disc('cat', 'cat', 'C418', 185),
	disc('blocks', 'blocks', 'C418', 345),
	disc('chirp', 'chirp', 'C418', 185),
	disc('far', 'far', 'C418', 174),
	disc('mall', 'mall', 'C418', 197),
	disc('mellohi', 'mellohi', 'C418', 96),
	disc('stal', 'stal', 'C418', 150),
	disc('strad', 'strad', 'C418', 188),
	disc('ward', 'ward', 'C418', 251),
	disc('11', '11', 'C418', 71),
	disc('wait', 'wait', 'C418', 238),
	disc('pigstep', 'Pigstep', 'Lena Raine', 149, { file: 'pigstep_master' }),
	disc('otherside', 'otherside', 'Lena Raine', 195),
	disc('5', '5', 'Samuel Åberg', 178),

	// Trails & Tales
	track('echo_in_the_wind', 'Echo in the Wind', 'Aaron Cherof', 296),
	track('a_familiar_room', 'A Familiar Room', 'Aaron Cherof', 241),
	track('bromeliad', 'Bromeliad', 'Aaron Cherof', 312),
	track('crescent_dunes', 'Crescent Dunes', 'Aaron Cherof', 248),
	disc('relic', 'Relic', 'Aaron Cherof', 219, { icon: 'music_disc_relic' }),

	// Tricky Trials
	track('featherfall', 'Featherfall', 'Aaron Cherof', 344),
	track('watcher', 'Watcher', 'Aaron Cherof', 332),
	track('puzzlebox', 'Puzzlebox', 'Aaron Cherof', 300),
	track('komorebi', 'komorebi', 'Kumi Tanioka', 288),
	track('pokopoko', 'pokopoko', 'Kumi Tanioka', 305),
	track('yakusoku', 'yakusoku', 'Kumi Tanioka', 271),
	track('deeper', 'Deeper', 'Lena Raine', 303),
	track('eld_unknown', 'Eld Unknown', 'Lena Raine', 297),
	track('endless', 'Endless', 'Lena Raine', 402),
	disc('creator', 'Creator', 'Lena Raine', 176, { icon: 'music_disc_creator' }),
	disc('creator_music_box', 'Creator (Music Box Version)', 'Lena Raine', 73, { icon: 'music_disc_creator_music_box' }),
	disc('precipice', 'Precipice', 'Aaron Cherof', 299, { icon: 'music_disc_precipice' }),

	// Chase the Skies
	track('lilypad', 'Lilypad', 'Amos Roddy', 236),
	track('below_and_above', 'Below and Above', 'Amos Roddy', 212),
	track('os_piano', 'O\'s Piano', 'Amos Roddy', 275),
	track('broken_clocks', 'Broken Clocks', 'Amos Roddy', 214),
	track('fireflies', 'Fireflies', 'Amos Roddy', 156),
	disc('tears', 'Tears', 'Amos Roddy', 175, { icon: 'music_disc_tears' }),

	// Сингл Hyper Potions
	disc('lava_chicken', 'Lava Chicken', 'Hyper Potions', 135, { icon: 'music_disc_lava_chicken' }),

	// Chaos Cubed
	track('memories', 'Memories', 'fingerspit', 245),
	track('ebb', 'Ebb', 'fingerspit', 306),
	track('home', 'Home', 'fingerspit', 380),
	track('shores', 'Shores', 'fingerspit', 320),
	track('nightly', 'Nightly', 'fingerspit', 302),
	disc('bounce', 'Bounce', 'fingerspit', 235, { icon: 'music_disc_bounce' }),
];

export const TRACK = Object.fromEntries(TRACKS.map(track => [track.id, track]));
export const DISCS = TRACKS.filter(track => track.item);
export const soundOf = id => `sfo:music.${id}`;

// Чтобы сменить музыку локации, достаточно отредактировать её список ID ниже.
// Например, mellohi и ward убраны с арены, но остаются в TRACKS для «Моих пластинок».
export const PLAYLISTS = {
	// Верхний мир и локации без отдельной музыки.
	world: [
		// Тема карты из ресурс-пака
		'emerald_tycoon',

		// Caves & Cliffs
		'stand_tall',
		'left_to_bloom',
		'wending',
		'infinite_amethyst',
		'one_more_day',
		'floating_dream',
		'comforting_memories',
		'an_ordinary_day',

		// The Wild Update
		'aerie',
		'firebugs',
		'labyrinthine',

		// Volume Beta
		'biome_fest',
		'blind_spots',
		'haunt_muskie',
		'aria_math',
		'dreiton',
		'taswell',
		'mutation',
		'moog_city_2',
		'beginning_2',
		'floating_trees',

		// Trails & Tales
		'echo_in_the_wind',
		'a_familiar_room',
		'bromeliad',
		'crescent_dunes',

		// Tricky Trials
		'featherfall',
		'watcher',
		'puzzlebox',
		'komorebi',
		'pokopoko',
		'yakusoku',
		'endless',

		// Chase the Skies
		'lilypad',
		'below_and_above',
		'os_piano',
		'broken_clocks',
		'fireflies',

		// Chaos Cubed
		'memories',
		'ebb',
		'home',
		'shores',
		'nightly',
	],

	// Незерская шахта карты.
	nether: [
		'rubedo',
		'chrysopoeia',
		'so_below',
		'concrete_halls',
		'dead_voxel',
		'warmth',
		'ballad_of_the_cats',
	],

	// Арена Хранителя. Эта подборка имеет приоритет даже в режиме пластинок.
	boss: [
		'ancestry',
		'5',
		'11',
		'13',
		'eld_unknown',
		'deeper',
	],
};

// Для пластинок формы показывают имя исполнителя из перевода Java Edition.
const artistKeys = {
	'Lena Raine': 'lena',
	'Aaron Cherof': 'aaron',
	'Amos Roddy': 'amos',
	'Samuel Åberg': 'samuel'
};

export function trackTitle(track) {
	if (track.id === 'creator_music_box') return '%music.disc.music_box';
	return track.title;
}

export function trackArtist(track) {
	const key = artistKeys[track.author];
	if (track.item && key) return '%music.artist.' + key;
	return track.author;
}

// Форма понимает %ключ, а плашке с тем же текстом нужен объект RawMessage.
export function trackPart(text) {
	if (text.startsWith('%')) return { translate: text.slice(1) };
	return { text };
}
