// Эпоха не даёт старой отметке sys:wipe:1 совпасть с новым вайпом №1 после очистки истории.
import { world, DynamicPropertiesDefinition } from '@minecraft/server';
import { hasRole, tell } from '../../DataBase.js';

const EPOCH = 'shop:reset_epoch', TAG = 'sys:reset_epoch:';
const IDS = ['shop:offline_reset_id', 'shop:wipe_id'];
const OLD_TAGS = ['sys:offline_reset:', 'sys:wipe:'];
// Свойство не прочиталось (например, мир превысил лимит динамических свойств) — null, а не 0:
// с ложным нулём игроков помечало не той эпохой, и при следующем входе с них снимало все теги.
const epoch = () => { try { return Number(world.getDynamicProperty(EPOCH) ?? 0); } catch { return null; } };
const readId = id => { try { return Number(world.getDynamicProperty(id) ?? 0); } catch { return null; } };
world.events.worldInitialize.subscribe(e => {
	const def = new DynamicPropertiesDefinition(); def.defineNumber(EPOCH);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

/** Поставить отметку эпохи после настоящего сброса, который удаляет все теги игрока. */
export function markResetEpoch(player) {
	const current = epoch();
	if (current === null) return;
	for (const t of player.getTags()) if (t.startsWith(TAG)) player.removeTag(t);
	player.addTag(TAG + current);
}
/** Лениво убрать старые номера у игрока, который не был в сети во время очистки истории. */
export function syncResetEpoch(player) {
	const current = epoch();
	if (current === null || player.hasTag(TAG + current)) return;
	if (current > 0) {
		// Отметку текущего номера оставляем: игрок с sys:offline_reset:<номер> уже прошёл этот сброс.
		// Иначе после неудачного чтения эпохи сброс снимал роль и пароль у тех, кого никто не сбрасывал.
		const ids = IDS.map(readId);
		if (ids.includes(null)) return;
		OLD_TAGS.forEach((prefix, i) => {
			const keep = ids[i] > 0 && player.hasTag(prefix + ids[i]);
			for (const t of player.getTags()) if (t.startsWith(prefix)) player.removeTag(t);
			player.addTag(prefix + (keep ? ids[i] : 0));
		});
	}
	markResetEpoch(player);
}
export function clearResetHistory(by) {
	if (!hasRole(by, 'owner')) { tell(by, 'chat.cmd.error.no_permission'); return false; }
	for (const id of IDS) world.setDynamicProperty(id, 0);
	world.setDynamicProperty(EPOCH, epoch() + 1);
	for (const player of world.getPlayers()) syncResetEpoch(player);
	tell(by, 'chat.admin.reset_history.done');
	return true;
}
