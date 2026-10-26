// --- Трезубец с «Громовержцем»: молния в поражённого игрока ---
// В ванили «Громовержец» бьёт молнией только в грозу; здесь — при любом попадании брошенным трезубцем в игрока.
// У брошенного трезубца (сущность minecraft:thrown_trident) зачарования скрипту не видны, поэтому
// раз в TRACK_TICKS тиков запоминаем, держал ли игрок трезубец с «Громовержцем»: после броска рука
// уже пуста, а попадание приходит через долю секунды — запомненное действует MEMORY_TICKS тиков.

import { world, MinecraftEnchantmentTypes } from '@minecraft/server';
import { run } from '../DataBase.js';

const TRACK_TICKS = 5;
const MEMORY_TICKS = 200;
let tick = 0;
const channeling = new Map();      // ник → тик, когда в руке последний раз был трезубец с «Громовержцем»

/** В руке трезубец с «Громовержцем». */
export function holdsChanneling(player) {
	try {
		const item = player.getComponent('inventory').container.getItem(player.selectedSlot);
		if (item?.typeId !== 'minecraft:trident') return false;
		return item.getComponent('enchantments').enchantments.hasEnchantment(MinecraftEnchantmentTypes.channeling) > 0;
	} catch {
		return false;
	}
}

/** В руке лук или арбалет (тогда урон от снаряда — стрела, а не трезубец). */
function holdsBow(player) {
	try {
		const id = player.getComponent('inventory').container.getItem(player.selectedSlot)?.typeId;
		return id === 'minecraft:bow' || id === 'minecraft:crossbow';
	} catch {
		return false;
	}
}

world.events.tick.subscribe(() => {
	if (++tick % TRACK_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		if (holdsChanneling(player)) channeling.set(player.name, tick);
	}
});

world.events.entityHurt.subscribe((e) => {
	const target = e.hurtEntity, thrower = e.damagingEntity;
	if (target?.typeId !== 'minecraft:player' || thrower?.typeId !== 'minecraft:player') return;
	if ((channeling.get(thrower.name) ?? -Infinity) < tick - MEMORY_TICKS) return;
	// Чем попали: снаряд из события (e.projectile в 1.19.50, damageSource.damagingProjectile в новых версиях).
	// Если снаряда в событии нет — урон от снаряда, а в руке у бросившего не лук и не арбалет: значит, трезубец
	const projectile = e.projectile ?? e.damageSource?.damagingProjectile;
	const cause = e.cause ?? e.damageSource?.cause;
	const trident = projectile ? projectile.typeId === 'minecraft:thrown_trident' : cause === 'projectile' && !holdsBow(thrower);
	if (!trident) return;
	const { x, y, z } = target.location;
	run(target.dimension, `summon lightning_bolt ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
});

world.events.playerLeave.subscribe((e) => channeling.delete(e.playerName));
