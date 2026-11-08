// --- Треки музыки карты (system/ui/music.js) ---
// Каждому треку соответствует событие shop.music.<id> в resource_packs/.../sounds/sound_definitions.json:
// категория record (ползунок «Проигрыватели»), "is3D": false — звук не привязан к точке и не затихает, когда игрок уходит.
// Файлы — ванильные (sounds/music/…) из клиента 1.19.50, кроме emerald_tycoon (sounds/music/main.theme в ресурс-паке).
// seconds — длина трека: по ней музыка понимает, что трек кончился. Названия и авторы — для плашки «Сейчас играет».
// Длины: саундтреки — Minecraft Wiki (страницы альбомов, Song), пластинки — версии пластинок (они короче альбомных),
// emerald_tycoon — посчитана по заголовку Ogg (3 292 858 сэмплов / 44 100 Гц).

const C418 = 'C418', LENA = 'Lena Raine', KUMI = 'Kumi Tanioka';
const t = (id, file, seconds, title, author) => ({ id, file, seconds, title, author });
const disc = (id, seconds, title, author = C418, file = id) =>
	({ ...t(id, `sounds/music/game/records/${file}`, seconds, title, author), item: `minecraft:record_${id}` });

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
	// Пластинки (id = идентификатор предмета minecraft:record_<id> в 1.19.50)
	disc('13', 178, '13'), disc('cat', 185, 'cat'), disc('blocks', 345, 'blocks'), disc('chirp', 185, 'chirp'),
	disc('far', 174, 'far'), disc('mall', 197, 'mall'), disc('mellohi', 96, 'mellohi'), disc('stal', 150, 'stal'),
	disc('strad', 188, 'strad'), disc('ward', 251, 'ward'), disc('11', 71, '11'), disc('wait', 238, 'wait'),
	disc('pigstep', 149, 'Pigstep', LENA, 'pigstep_master'), disc('otherside', 195, 'otherside', LENA),
	disc('5', 178, '5', 'Samuel Åberg')
];
export const TRACK = Object.fromEntries(TRACKS.map(x => [x.id, x]));
export const DISCS = TRACKS.filter(x => x.item);
export const soundOf = (id) => `shop.music.${id}`;

// Плейлисты зон. Арена Хранителя — самые жуткие; адская шахта — треки Незера; остальной мир — спокойные
export const PLAYLISTS = {
	world: ['emerald_tycoon', 'stand_tall', 'left_to_bloom', 'wending', 'infinite_amethyst', 'one_more_day', 'floating_dream',
		'comforting_memories', 'an_ordinary_day', 'aerie', 'firebugs', 'labyrinthine', 'biome_fest', 'blind_spots', 'haunt_muskie',
		'aria_math', 'dreiton', 'taswell', 'mutation', 'moog_city_2', 'beginning_2', 'floating_trees'],
	nether: ['rubedo', 'chrysopoeia', 'so_below', 'concrete_halls', 'dead_voxel', 'warmth', 'ballad_of_the_cats'],
	boss: ['ancestry', '5', '11', '13', 'mellohi', 'ward']
};
