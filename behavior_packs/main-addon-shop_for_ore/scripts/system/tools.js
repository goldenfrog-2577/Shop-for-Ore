// --- Неразрушаемая кирка ---
// Кирка уровня (слот 1 хотбара, выдаёт functions/system/pickaxe_lvl) изнашивается как обычная.
// Раз в секунду смотрим её прочность: если она повреждена и игрок держит другой слот —
// или износ больше 90 % — сбрасываем табло pick, и pickaxe_lvl на ближайшем t20 выдаёт
// новую целую кирку тем же replaceitem (с блокировкой в слоте и сохранением при смерти).
// Пока игрок копает этой киркой, замену не делаем, чтобы не сбить копание.

import { world, system } from '@minecraft/server';
import { run } from '../DataBase.js';

const CHECK_EVERY_TICKS = 20;
const FORCE_RATIO = 0.9;
let tick = 0;

system.runSchedule(() => {
	if (++tick % CHECK_EVERY_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		// В сплифе в первом слоте лопата игры, в тире — что угодно (лук), а не кирка уровня
		if (player.hasTag('game:spleef') || player.hasTag('zone:tir')) continue;
		try {
			const item = player.getComponent('inventory').container.getItem(0);
			if (!item) continue;
			const durability = item.getComponent('minecraft:durability') ?? item.getComponent('durability');
			if (!durability || durability.damage <= 0) continue;
			const holding = player.selectedSlot === 0;
			if (holding && durability.damage < durability.maxDurability * FORCE_RATIO) continue;
			run(player, 'scoreboard players set @s pick 0');
		} catch (e) {
			// нет компонента или игрок вышел — пропускаем
		}
	}
});