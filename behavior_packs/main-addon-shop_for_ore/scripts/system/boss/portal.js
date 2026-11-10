// --- Бирюзовый портал в мини-играх → арена Хранителя ---
// functions/system/system ставит тег sys:warp_boss игроку в портале (x −115, z −51). Телепорт — та же команда, что !warp boss:
// уровень 26+ (персоналу — всегда), во время боя закрыто, заморозка, тюрьма и режим боя PvP — с теми же сообщениями.
// Пока игрок стоит в портале, тег ставится каждый тик, поэтому отказ повторяется не чаще раза в DENY_TICKS.

import { system, world } from '@minecraft/server';
import { runChatCommand } from '../../chat/commands/commands.js';

export const PORTAL_TAG = 'sys:warp_boss';
export const DENY_TICKS = 60;
const lastTry = new Map();   // ник → тик последней попытки
let tick = 0;

system.runSchedule(() => {
	tick += 2;
	for (const p of world.getPlayers()) {
		if (!p.hasTag(PORTAL_TAG)) continue;
		p.removeTag(PORTAL_TAG);
		const last = lastTry.get(p.name);
		if (last !== undefined && tick - last < DENY_TICKS) continue;
		lastTry.set(p.name, tick);
		runChatCommand(p, 'warp', ['boss']);
	}
}, 2);
world.events.playerLeave.subscribe((e) => lastTry.delete(e.playerName));
