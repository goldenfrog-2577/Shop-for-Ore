// --- Сброс игроков не в сети (!resetoffline, только владелец) ---
// Игрокам не в сети сбрасывается всё: все теги (роль и пароль тоже — им придётся зарегистрироваться
// заново) и все счета во всех табло. Игроки в сети не затрагиваются.
// Счета: «scoreboard players reset *» в каждом табло, затем счета игроков в сети, сущностей
// и служебные записи (в том числе boost_x2, boost_x4 и rain_event в system) возвращаются как были. Теги у игрока не в сети командой не снять,
// поэтому у сброса есть номер (свойство мира shop:offline_reset_id): игрок с отметкой
// sys:offline_reset:<номер> уже в порядке, у остальных теги снимаются при входе — раньше проверки
// пароля (register/system.js вызывает applyOfflineReset первым делом).

import { world, DynamicPropertiesDefinition } from '@minecraft/server';
import { syncResetEpoch, markResetEpoch } from './reset_history.js';
import { run, tell, isBot } from '../DataBase.js';

const RESET_ID = 'shop:offline_reset_id';
export const RESET_TAG = 'sys:offline_reset:';
const WIPE_ID = 'shop:wipe_id';
const WIPE_TAG = 'sys:wipe:';

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	def.defineNumber(RESET_ID);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

const prop = (id) => { try { return world.getDynamicProperty(id) ?? 0; } catch { return 0; } };

/** Сколько игроков затронет сброс: записи-игроки в табло money, чьих ников нет среди игроков в сети. */
export function offlineCounts() {
	const online = new Set([...world.getPlayers()].map(p => p.name));
	let offline = 0;
	try {
		offline = world.scoreboard.getObjective('money').getParticipants()
			.filter(p => (p.type === 'player' || p.type === 'Player') && !online.has(p.displayName)).length;
	} catch { offline = 0; }
	return { offline, online: online.size };
}

/** Отметить игрока текущими номерами сброса и вайпа (чтобы wipe.js не сбросил его повторно). */
function mark(player, id) {
	markResetEpoch(player);
	for (const t of player.getTags()) if (t.startsWith(RESET_TAG)) player.removeTag(t);
	player.addTag(RESET_TAG + id);
	const wipe = prop(WIPE_ID);
	if (wipe > 0 && !player.hasTag(WIPE_TAG + wipe)) player.addTag(WIPE_TAG + wipe);
}

/** Сброс: новый номер, счета — всем не в сети сразу, теги — при входе. */
export function resetOffline(by) {
	const id = prop(RESET_ID) + 1;
	world.setDynamicProperty(RESET_ID, id);
	const online = [...world.getPlayers()];
	for (const p of online) mark(p, id);
	const dim = world.getDimension('overworld');
	for (const objective of world.scoreboard.getObjectives()) {
		// Что вернуть после reset *: счета игроков в сети, сущностей и служебные записи (не игроки)
		const keep = [];
		for (const p of online) {
			try { keep.push([p, objective.getScore(p.scoreboard)]); } catch { /* у игрока нет счёта в этом табло */ }
		}
		const fake = [];
		try {
			for (const s of objective.getScores()) {
				const type = String(s.participant.type).toLowerCase();
				if (type === 'fakeplayer') fake.push([s.participant.displayName, s.score]);
				// Счета прогруженных сущностей также сохраняются; служебные таймеры входят в fake выше.
				else if (type === 'entity') {
					try { const e = s.participant.getEntity(); if (e) keep.push([e, s.score]); } catch { /* сущность не прогружена */ }
				}
			}
		} catch { /* пустое табло */ }
		run(dim, `scoreboard players reset * ${objective.id}`);
		for (const [p, score] of keep) run(p, `scoreboard players set @s ${objective.id} ${score}`);
		for (const [name, score] of fake) run(dim, `scoreboard players set "${name.replace(/"/g, '')}" ${objective.id} ${score}`);
	}
	tell(by, 'chat.cmd.resetoffline.done');
	return id;
}

/**
 * Вход игрока: если его не было в сети во время сброса — снять все теги.
 * Вызывается из register/system.js в момент события playerJoin, до выбора логина или регистрации.
 * @returns {boolean} теги сняты
 */
export function applyOfflineReset(player) {
	if (isBot(player)) return false;
	syncResetEpoch(player);
	const id = prop(RESET_ID);
	if (id <= 0 || player.hasTag(RESET_TAG + id)) return false;
	const tags = player.getTags();
	for (const t of tags) player.removeTag(t);
	mark(player, id);
	// Новый игрок (тегов не было) — сообщать нечего
	if (tags.length) tell(player, 'chat.server.reset_offline');
	return tags.length > 0;
}
