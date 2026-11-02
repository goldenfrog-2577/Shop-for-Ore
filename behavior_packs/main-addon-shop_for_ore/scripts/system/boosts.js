// --- Бусты, выданные администратором: запись и отключение ---
// Общий буст x2/x4 из меню администратора или !boost запоминается в свойстве мира shop:admin_boost
// («x2:<время окончания, мс>»), личный «Магнит руды» — тегом boost:magnet_admin у игрока.
// «Отключить выданные бусты» (!boost stop, меню администратора → Бусты и ивенты) снимает только их:
// купленный в магазине буст или магнит не трогается. Пока идёт один общий буст, второй не начнётся
// ни покупкой, ни командой, поэтому запись не может «накрыть» купленный буст.

import { world, DynamicPropertiesDefinition } from '@minecraft/server';
import { run } from '../DataBase.js';

const ADMIN_BOOST = 'shop:admin_boost';
export const MAGNET_ADMIN_TAG = 'boost:magnet_admin';
const STANDS = { x2: 'X2Boost', x4: 'X4Boost' };

world.events.worldInitialize.subscribe((e) => {
	const def = new DynamicPropertiesDefinition();
	def.defineString(ADMIN_BOOST, 32);
	e.propertyRegistry.registerWorldDynamicProperties(def);
});

/** Общий буст выдан администратором: тип и время окончания. */
export function markAdminBoost(type, minutes, now = Date.now()) {
	try { world.setDynamicProperty(ADMIN_BOOST, `${type}:${now + minutes * 60000}`); } catch { /* свойство не зарегистрировано */ }
}

/** Идущий сейчас общий буст администратора: 'x2' / 'x4' или undefined (закончился или его не было). */
export function adminBoost(now = Date.now()) {
	let value;
	try { value = world.getDynamicProperty(ADMIN_BOOST); } catch { value = undefined; }
	if (!value) return undefined;
	const [type, end] = String(value).split(':');
	if (!STANDS[type] || !(Number(end) > now)) return undefined;
	const active = [...world.getPlayers()].some(p => p.hasTag(`boost:${type}`));
	return active ? type : undefined;
}

/**
 * Отключить бусты, выданные администратором: общий x2/x4 и личные магниты.
 * Общий буст заканчивается обычным путём (таймер стойки — 1, на следующей секунде boost/x2_end: сообщение всем).
 * @returns {{ boost?: string, magnets: string[] }} что отключено
 */
export function stopAdminBoosts() {
	const dim = world.getDimension('overworld');
	const boost = adminBoost();
	if (boost) run(dim, `scoreboard players set @e[name="${STANDS[boost]}"] system 1`);
	try { world.setDynamicProperty(ADMIN_BOOST, ''); } catch { /* нет свойства */ }
	const magnets = [];
	for (const p of world.getPlayers()) {
		if (!p.hasTag(MAGNET_ADMIN_TAG)) continue;
		p.removeTag(MAGNET_ADMIN_TAG);
		if (!p.hasTag('boost:magnet')) continue;
		p.removeTag('boost:magnet');
		run(p, 'scoreboard players set @s magnet 0');
		run(p, 'tellraw @s {"rawtext":[{"translate":"chat.ore_magnet.end"}]}');
		magnets.push(p.name);
	}
	return { boost, magnets };
}
