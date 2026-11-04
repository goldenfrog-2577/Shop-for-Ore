// Эпоха не даёт старой отметке sys:wipe:1 совпасть с новым вайпом №1 после очистки истории.
import { world, DynamicPropertiesDefinition } from '@minecraft/server';
import { hasRole, tell } from '../../DataBase.js';

const EPOCH = 'shop:reset_epoch', TAG = 'sys:reset_epoch:';
const IDS = ['shop:offline_reset_id', 'shop:wipe_id'];
const OLD_TAGS = ['sys:offline_reset:', 'sys:wipe:'];
const epoch = () => { try { return Number(world.getDynamicProperty(EPOCH) ?? 0); } catch { return 0; } };
world.events.worldInitialize.subscribe(e => {
	const def = new DynamicPropertiesDefinition(); def.defineNumber(EPOCH);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

/** Поставить отметку эпохи после настоящего сброса, который удаляет все теги игрока. */
export function markResetEpoch(player) {
	for (const t of player.getTags()) if (t.startsWith(TAG)) player.removeTag(t);
	player.addTag(TAG + epoch());
}
/** Лениво убрать старые номера у игрока, который не был в сети во время очистки истории. */
export function syncResetEpoch(player) {
	const current = epoch();
	if (player.hasTag(TAG + current)) return;
	if (current > 0) {
		for (const t of player.getTags()) if (OLD_TAGS.some(prefix => t.startsWith(prefix))) player.removeTag(t);
		for (const prefix of OLD_TAGS) player.addTag(prefix + '0');
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
