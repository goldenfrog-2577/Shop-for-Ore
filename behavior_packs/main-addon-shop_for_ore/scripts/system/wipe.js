// --- Вайп (!wipe confirm, меню администратора → «Вайп»): сброс прогресса всех игроков ---
// Счета сбрасывает functions/system/wipe (scoreboard players reset * — у всех, и у тех, кто не в сети).
// Теги командой у игроков не в сети не снять, поэтому у вайпа есть номер (свойство мира shop:wipe_id):
// игрок с отметкой sys:wipe:<номер> уже сброшен, остальных сбросит при входе.
// Сбрасывается: прогресс (уровень, опыт, монеты, VIP-коины, ребитхи, зачарования, промокоды, бусты),
// достижения и их счётчики, косметика (купленное и выбранное, цвета в чате), запись в мини-игры.
// Остаются: роль, пароль, баны, наказания, настройки игрока (панель, частицы, звуки, музыка).

import { world, DynamicPropertiesDefinition } from '@minecraft/server';
import { run, tell } from '../DataBase.js';

const WIPE_ID = 'shop:wipe_id';
const WIPE_TAG = 'sys:wipe:';
// Табло прогресса — те же, что сбрасывает functions/system/wipe
export const WIPE_OBJECTIVES = ['money', 'vip_coins', 'lvl', 'xp', 'rebirth', 'online', 'efficiency', 'fortune', 'promo1', 'promo2', 'promo3', 'promo4',
	'xp_need', 'magnet', 'pick', 'stat_mined', 'stat_kills', 'stat_playtime', 'stat_wins', 'stat_deaths', 'stat_win_pvp_ffa', 'stat_win_spleef'];
// Теги: точное имя или префикс (с «:» на конце)
const WIPE_TAGS = ['player', 'player:rebirth', 'player:vip', 'sys:vip_migrated', 'boost:', 'ach:', 'stat:', 'cosmetic:', 'fx:', 'chat:name_color:', 'chat:text_color:', 'game:', WIPE_TAG];

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	def.defineNumber(WIPE_ID);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

const wipeId = () => { try { return world.getDynamicProperty(WIPE_ID) ?? 0; } catch { return 0; } };

/** Сбросить одного игрока (теги — сразу, счета — командами). */
function wipePlayer(player, id) {
	for (const tag of player.getTags()) {
		if (WIPE_TAGS.some(w => w.endsWith(':') ? tag.startsWith(w) : tag === w)) player.removeTag(tag);
	}
	for (const objective of WIPE_OBJECTIVES) run(player, `scoreboard players reset @s ${objective}`);
	// Без тега player system/system выдаст стартовые счета, как новому игроку
	player.addTag(WIPE_TAG + id);
}

/** Сколько игроков затронет вайп: в табло money (все, кто играл) и сейчас в сети. */
export function wipeCounts() {
	let all = 0;
	try { all = world.scoreboard.getObjective('money').getParticipants().length; } catch { all = 0; }
	const online = [...world.getPlayers()].length;
	return { all: Math.max(all, online), online };
}

/** Вайп: новый номер, счета всем, теги — тем, кто в сети (остальным — при входе). */
export function wipeAll(by) {
	const id = wipeId() + 1;
	world.setDynamicProperty(WIPE_ID, id);
	run(by, 'function system/wipe');
	for (const player of world.getPlayers()) wipePlayer(player, id);
	return id;
}

// Вошёл после вайпа — сбросить и его. Объект e.player в 1.19.50 доступен только в момент события
// (позже — «Native object bound to prototype does not exist»), поэтому запоминаем ник, а сбрасываем,
// когда игрок появится в мире (так же, как бан в system/ban.js)
const joined = new Set();
world.events.playerJoin.subscribe((e) => joined.add(e.player.name));
world.events.playerLeave.subscribe((e) => joined.delete(e.playerName));
world.events.tick.subscribe(() => {
	if (!joined.size) return;
	const id = wipeId();
	for (const player of world.getPlayers()) {
		if (!joined.delete(player.name)) continue;
		if (id > 0 && !player.hasTag(WIPE_TAG + id)) {
			wipePlayer(player, id);
			tell(player, 'chat.server.wiped.offline');
		}
	}
});
