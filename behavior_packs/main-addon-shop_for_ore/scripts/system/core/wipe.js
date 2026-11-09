// --- Вайп (!wipe confirm, меню администратора → «Вайп»): сброс прогресса всех игроков ---
// Счета сбрасываются у всех сразу, и у тех, кто не в сети: scoreboard players reset * <табло>.
// Теги командой у игроков не в сети не снять, поэтому у вайпа есть номер (свойство мира shop:wipe_id):
// игрок с отметкой sys:wipe:<номер> уже сброшен, остальных сбросит при входе.
// Сбрасывается: прогресс (уровень, опыт, монеты, VIP-коины, ребитхи, зачарования, промокоды — теги promo:, бусты),
// достижения и их счётчики, косметика (купленное и выбранное, цвета в чате), запись в мини-игры.
// Остаются: роль, пароль, баны, наказания, настройки игрока (панель, частицы, звуки, музыка).

import { world, DynamicPropertiesDefinition } from '@minecraft/server';
import { syncResetEpoch } from './reset_history.js';
import { ensurePlayerScores } from './player_scores.js';
import { run, tell } from '../../DataBase.js';
import { STATS } from '../player/achievements.js';
import { logAction } from '../security/staff_log.js';

const WIPE_ID = 'shop:wipe_id';
const WIPE_TAG = 'sys:wipe:';
// Табло прогресса и счётчики достижений (STATS). promo1…4 — отметки промокодов до 0.3.0 (system/economy/promo.js)
export const WIPE_OBJECTIVES = ['money', 'vip_coins', 'lvl', 'xp', 'rebirth', 'online', 'efficiency', 'fortune', 'xp_need', 'magnet', 'pick',
	'promo1', 'promo2', 'promo3', 'promo4', ...STATS];
// Теги: точное имя или префикс (с «:» на конце)
const WIPE_TAGS = ['player', 'player:rebirth', 'player:vip', 'sys:vip_migrated', 'boost:', 'ach:', 'stat:', 'cosmetic:', 'fx:', 'chat:name_color:', 'chat:text_color:', 'game:', 'promo:', 'boss:disc:', WIPE_TAG];

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	def.defineNumber(WIPE_ID);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

// null — свойство не прочиталось: вайп при входе не применяем (ложный ноль сбрасывал бы прогресс)
const wipeId = () => { try { return world.getDynamicProperty(WIPE_ID) ?? 0; } catch { return null; } };

/** Сбросить одного игрока (теги — сразу, счета — командами). */
async function wipePlayer(player, id) {
	for (const tag of player.getTags()) {
		if (WIPE_TAGS.some(w => w.endsWith(':') ? tag.startsWith(w) : tag === w)) player.removeTag(tag);
	}
	for (const objective of WIPE_OBJECTIVES) {
		if (!world.scoreboard.getObjective(objective)) continue;
		// У игрока в сети оставляем явные нули: reset удалял запись и ломал отображение.
		if (await run(player, `scoreboard players set @s ${objective} ${objective === 'lvl' ? 1 : objective === 'xp_need' ? 100 : 0}`) === undefined) return false;
	}
	await ensurePlayerScores(player);
	player.addTag('player');
	// Счета уже инициализированы: повторная инициализация новичка не нужна
	player.addTag(WIPE_TAG + id);
	return true;
}

/** Сколько игроков затронет вайп: в табло money (все, кто играл) и сейчас в сети. */
export function wipeCounts() {
	let all = 0;
	try { all = world.scoreboard.getObjective('money').getParticipants().length; } catch { all = 0; }
	const online = [...world.getPlayers()].length;
	return { all: Math.max(all, online), online };
}

/** Вайп: новый номер, счета всем, теги — тем, кто в сети (остальным — при входе). */
export async function wipeAll(by) {
	const current = wipeId();
	if (current === null) { tell(by, 'chat.cmd.error.storage'); return 0; }
	const id = current + 1;
	world.setDynamicProperty(WIPE_ID, id);
	logAction(by, 'wipe', '', `#${id}`);
	for (const objective of WIPE_OBJECTIVES) {
		if (world.scoreboard.getObjective(objective)) await run(by, `scoreboard players reset * ${objective}`);
	}
	run(by, 'playsound random.levelup @s');
	for (const player of world.getPlayers()) await wipePlayer(player, id);
	return id;
}

// Вошёл после вайпа — сбросить и его. Объект e.player в 1.19.50 доступен только в момент события
// (позже — «Native object bound to prototype does not exist»), поэтому запоминаем ник, а сбрасываем,
// когда игрок появится в мире (так же, как бан в system/security/ban.js)
const joined = new Set();
world.events.playerJoin.subscribe((e) => joined.add(e.player.name));
world.events.playerLeave.subscribe((e) => joined.delete(e.playerName));
world.events.tick.subscribe(() => {
	if (!joined.size) return;
	const id = wipeId();
	for (const player of world.getPlayers()) {
		if (!joined.delete(player.name)) continue;
		syncResetEpoch(player);
		if (id !== null && id > 0 && !player.hasTag(WIPE_TAG + id)) {
			wipePlayer(player, id).then(done => { if (done) tell(player, 'chat.server.wiped.offline'); }).catch(error => console.warn('[Shop for Ore] Wipe recovery: ' + error));
		}
	}
});
