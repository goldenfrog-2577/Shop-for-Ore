// Каталог для плеера Bedrock 26.60. Названия — из альбомов; подписи пластинок — из локализации Java Edition.
const C418 = 'C418', LENA = 'Lena Raine', KUMI = 'Kumi Tanioka';
const t = (id, file, seconds, title, author) => ({ id, file, seconds, title, author });
const disc = (id, seconds, title, author = C418, file = id, icon = `record_${id}`) =>
	({ ...t(id, `sounds/music/game/records/${file}`, seconds, title, author), item: `minecraft:music_disc_${id}`, icon: `textures/items/${icon}` });

export const TRACKS = [
	// Карта: тема из Emerald Tycoon (Razzleberries) — файл ресурс-пака, в репозитории его нет
	t('emerald_tycoon', 'sounds/music/main.theme', 75, 'Emerald Tycoon', 'Razzleberries'),
	// Caves & Cliffs
	t('stand_tall', 'sounds/music/game/stand_tall', 308, 'Stand Tall', LENA),
	t('left_to_bloom', 'sounds/music/game/left_to_bloom', 342, 'Left to Bloom', LENA),
	t('wending', 'sounds/music/game/wending', 314, 'Wending', LENA),
	t('infinite_amethyst', 'sounds/music/game/infinite_amethyst', 271, 'Infinite Amethyst', LENA),
	t('one_more_day', 'sounds/music/game/one_more_day', 278, 'One More Day', LENA),
	t('floating_dream', 'sounds/music/game/floating_dream', 206, 'Floating Dream', KUMI),
	t('comforting_memories', 'sounds/music/game/comforting_memories', 275, 'Comforting Memories', KUMI),
	t('an_ordinary_day', 'sounds/music/game/an_ordinary_day', 331, 'An Ordinary Day', KUMI),
	// The Wild Update
	t('aerie', 'sounds/music/game/aerie', 296, 'Aerie', LENA),
	t('firebugs', 'sounds/music/game/firebugs', 312, 'Firebugs', LENA),
	t('labyrinthine', 'sounds/music/game/labyrinthine', 324, 'Labyrinthine', LENA),
	t('ancestry', 'sounds/music/game/ancestry', 343, 'Ancestry', LENA),
	// Volume Beta (в Bedrock — файлы creative*, menu*, nether*)
	t('biome_fest', 'sounds/music/game/creative/creative1', 378, 'Biome Fest', C418),
	t('blind_spots', 'sounds/music/game/creative/creative2', 332, 'Blind Spots', C418),
	t('haunt_muskie', 'sounds/music/game/creative/creative3', 361, 'Haunt Muskie', C418),
	t('aria_math', 'sounds/music/game/creative/creative4', 310, 'Aria Math', C418),
	t('dreiton', 'sounds/music/game/creative/creative5', 497, 'Dreiton', C418),
	t('taswell', 'sounds/music/game/creative/creative6', 515, 'Taswell', C418),
	t('mutation', 'sounds/music/menu/menu1', 185, 'Mutation', C418),
	t('moog_city_2', 'sounds/music/menu/menu2', 180, 'Moog City 2', C418),
	t('beginning_2', 'sounds/music/menu/menu3', 176, 'Beginning 2', C418),
	t('floating_trees', 'sounds/music/menu/menu4', 244, 'Floating Trees', C418),
	t('concrete_halls', 'sounds/music/game/nether/nether1', 254, 'Concrete Halls', C418),
	t('dead_voxel', 'sounds/music/game/nether/nether2', 296, 'Dead Voxel', C418),
	t('warmth', 'sounds/music/game/nether/nether3', 239, 'Warmth', C418),
	t('ballad_of_the_cats', 'sounds/music/game/nether/nether4', 275, 'Ballad of the Cats', C418),
	// Nether Update
	t('rubedo', 'sounds/music/game/nether/rubedo', 312, 'Rubedo', LENA),
	t('chrysopoeia', 'sounds/music/game/nether/chrysopoeia', 243, 'Chrysopoeia', LENA),
	t('so_below', 'sounds/music/game/nether/so_below', 319, 'So Below', LENA),
	// Пластинки коллекции
	disc('13', 178, '13'), disc('cat', 185, 'cat'), disc('blocks', 345, 'blocks'), disc('chirp', 185, 'chirp'),
	disc('far', 174, 'far'), disc('mall', 197, 'mall'), disc('mellohi', 96, 'mellohi'), disc('stal', 150, 'stal'),
	disc('strad', 188, 'strad'), disc('ward', 251, 'ward'), disc('11', 71, '11'), disc('wait', 238, 'wait'),
	disc('pigstep', 149, 'Pigstep', LENA, 'pigstep_master'), disc('otherside', 195, 'otherside', LENA),
	disc('5', 178, '5', 'Samuel Åberg'),
	// Trails & Tales — Chaos Cubed, в порядке официальных альбомов.
	t('echo_in_the_wind', 'sounds/music/game/echo_in_the_wind', 296, 'Echo in the Wind', 'Aaron Cherof'),
	t('a_familiar_room', 'sounds/music/game/a_familiar_room', 241, 'A Familiar Room', 'Aaron Cherof'),
	t('bromeliad', 'sounds/music/game/bromeliad', 312, 'Bromeliad', 'Aaron Cherof'),
	t('crescent_dunes', 'sounds/music/game/crescent_dunes', 248, 'Crescent Dunes', 'Aaron Cherof'),
	disc('relic', 219, 'Relic', 'Aaron Cherof', 'relic', 'music_disc_relic'),
	t('featherfall', 'sounds/music/game/featherfall', 344, 'Featherfall', 'Aaron Cherof'),
	t('watcher', 'sounds/music/game/watcher', 332, 'Watcher', 'Aaron Cherof'),
	t('puzzlebox', 'sounds/music/game/puzzlebox', 300, 'Puzzlebox', 'Aaron Cherof'),
	t('komorebi', 'sounds/music/game/komorebi', 288, 'komorebi', 'Kumi Tanioka'),
	t('pokopoko', 'sounds/music/game/pokopoko', 305, 'pokopoko', 'Kumi Tanioka'),
	t('yakusoku', 'sounds/music/game/yakusoku', 271, 'yakusoku', 'Kumi Tanioka'),
	t('deeper', 'sounds/music/game/deeper', 303, 'Deeper', 'Lena Raine'),
	t('eld_unknown', 'sounds/music/game/eld_unknown', 297, 'Eld Unknown', 'Lena Raine'),
	t('endless', 'sounds/music/game/endless', 402, 'Endless', 'Lena Raine'),
	disc('creator', 176, 'Creator', 'Lena Raine', 'creator', 'music_disc_creator'),
	disc('creator_music_box', 73, 'Creator (Music Box Version)', 'Lena Raine', 'creator_music_box', 'music_disc_creator_music_box'),
	disc('precipice', 299, 'Precipice', 'Aaron Cherof', 'precipice', 'music_disc_precipice'),
	t('lilypad', 'sounds/music/game/lilypad', 236, 'Lilypad', 'Amos Roddy'),
	t('below_and_above', 'sounds/music/game/below_and_above', 212, 'Below and Above', 'Amos Roddy'),
	t('os_piano', 'sounds/music/game/os_piano', 275, 'O\'s Piano', 'Amos Roddy'),
	t('broken_clocks', 'sounds/music/game/broken_clocks', 214, 'Broken Clocks', 'Amos Roddy'),
	t('fireflies', 'sounds/music/game/fireflies', 156, 'Fireflies', 'Amos Roddy'),
	disc('tears', 175, 'Tears', 'Amos Roddy', 'tears', 'music_disc_tears'),
	disc('lava_chicken', 135, 'Lava Chicken', 'Hyper Potions', 'lava_chicken', 'music_disc_lava_chicken'),
	t('memories', 'sounds/music/game/memories', 245, 'Memories', 'fingerspit'),
	t('ebb', 'sounds/music/game/ebb', 306, 'Ebb', 'fingerspit'),
	t('home', 'sounds/music/game/home', 380, 'Home', 'fingerspit'),
	t('shores', 'sounds/music/game/shores', 320, 'Shores', 'fingerspit'),
	t('nightly', 'sounds/music/game/nightly', 302, 'Nightly', 'fingerspit'),
	disc('bounce', 235, 'Bounce', 'fingerspit', 'bounce', 'music_disc_bounce')
];
export const TRACK = Object.fromEntries(TRACKS.map(x => [x.id, x]));
export const DISCS = TRACKS.filter(x => x.item);
export const soundOf = (id) => `sfo:music.${id}`;

// Плейлисты зон. Арена Хранителя — самые жуткие; адская шахта — треки Незера; остальной мир — спокойные
export const PLAYLISTS = {
	world: ['emerald_tycoon', 'stand_tall', 'left_to_bloom', 'wending', 'infinite_amethyst', 'one_more_day', 'floating_dream',
		'comforting_memories', 'an_ordinary_day', 'aerie', 'firebugs', 'labyrinthine', 'biome_fest', 'blind_spots', 'haunt_muskie',
		'aria_math', 'dreiton', 'taswell', 'mutation', 'moog_city_2', 'beginning_2', 'floating_trees',
		'echo_in_the_wind', 'a_familiar_room', 'bromeliad', 'crescent_dunes', 'featherfall', 'watcher',
		'puzzlebox', 'komorebi', 'pokopoko', 'yakusoku', 'endless', 'lilypad',
		'below_and_above', 'os_piano', 'broken_clocks', 'fireflies', 'memories', 'ebb',
		'home', 'shores', 'nightly'],
	nether: ['rubedo', 'chrysopoeia', 'so_below', 'concrete_halls', 'dead_voxel', 'warmth', 'ballad_of_the_cats'],
	boss: ['ancestry', '5', '11', '13', 'eld_unknown', 'deeper']
};

// В формах %ключ переводит клиент, в tellraw и плашках используется тот же ключ через RawMessage.
const artists = { 'Lena Raine': 'lena', 'Aaron Cherof': 'aaron', 'Amos Roddy': 'amos', 'Samuel Åberg': 'samuel' };
export const trackTitle = t => t.id === 'creator_music_box' ? '%music.disc.music_box' : t.title;
export const trackArtist = t => t.item && artists[t.author] ? '%music.artist.' + artists[t.author] : t.author;
export const trackPart = text => text.startsWith('%') ? { translate: text.slice(1) } : { text };
