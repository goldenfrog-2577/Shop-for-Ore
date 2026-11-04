// --- Команды владельца: роли, сброс пароля, вайп, сброс игроков не в сети ---
// Обработчик: имя команды без «!» → (player, args, command). Права (роль из commandsList) проверяет
// runChatCommand в chat/commands.js; return — команда выполнена или отказ уже сообщён игроку.

import { worldEditCommand } from '../../system/worldedit.js';
import { world } from '@minecraft/server';
import { tell, findPlayer, getRole, ROLES, run } from '../../DataBase.js';
import { resetOffline, offlineCounts } from '../../system/offline_reset.js';
import { wipeAll, wipeCounts } from '../../system/wipe.js';
import { resetPassword } from '../../register/change.js';

// Запросы на вайп, ждущие «!wipe confirm»: имя → время запроса
const wipeRequests = new Map();
// То же для !resetoffline
const resetRequests = new Map();
const WIPE_CONFIRM_MS = 30000;

// Игрок вышел — его записи больше не нужны
world.events.playerLeave.subscribe((data) => {
	wipeRequests.delete(data.playerName);
	resetRequests.delete(data.playerName);
});

export const OWNER_COMMANDS = {
	worldedit: (player, args) => worldEditCommand(player, args),
	resetoffline(player, args) {
		// Как !wipe: сводка, выполнение — только «!resetoffline confirm» в течение 30 секунд
		const asked = resetRequests.get(player.name);
		if ((args[0] || '').toLowerCase() === 'confirm') {
			resetRequests.delete(player.name);
			if (!asked || Date.now() - asked > WIPE_CONFIRM_MS) {
				tell(player, 'chat.cmd.error.confirm_expired', '!resetoffline');
				return;
			}
			resetOffline(player);
		} else {
			resetRequests.set(player.name, Date.now());
			const { offline, online } = offlineCounts();
			tell(player, 'chat.cmd.resetoffline.summary', String(offline), String(online));
			tell(player, 'chat.cmd.resetoffline.confirm');
		}
	},

	wipe(player, args) {
		// Самая опасная команда: сначала предупреждение, выполнение — только «!wipe confirm» в течение 30 секунд
		const asked = wipeRequests.get(player.name);
		if ((args[0] || '').toLowerCase() === 'confirm') {
			wipeRequests.delete(player.name);
			if (!asked || Date.now() - asked > WIPE_CONFIRM_MS) {
				tell(player, 'chat.cmd.error.confirm_expired', '!wipe');
				return;
			}
			wipeAll(player);
		} else {
			// Сводка: что сбросится, что останется и скольких игроков затронет
			wipeRequests.set(player.name, Date.now());
			const { all, online } = wipeCounts();
			tell(player, 'chat.cmd.wipe.summary', String(all), String(online));
			tell(player, 'chat.cmd.wipe.confirm');
		}
	},

	role(player, args) {
		// Назначение роли — только владелец (проверено выше по commandsList)
		const roleTargetName = args[0];
		const newRole = (args[1] || '').toLowerCase();
		if (!roleTargetName || !['player', 'helper', 'moder', 'admin'].includes(newRole)) {
			tell(player, 'chat.cmd.role.use');
			return;
		}
		const roleTarget = findPlayer(roleTargetName);
		if (!roleTarget) {
			tell(player, 'chat.cmd.error.offline', roleTargetName);
			return;
		}
		// Боту роль не выдаётся: у него всегда префикс «Бот»
		if (roleTarget.hasTag('role:bot')) {
			tell(player, 'chat.cmd.role.error.bot');
			return;
		}
		// Владелец один — его роль командой не меняется
		if (roleTarget.hasTag('role:owner')) {
			tell(player, 'chat.cmd.role.error.owner');
			return;
		}
		roleTarget.removeTag('role:helper');
		roleTarget.removeTag('role:moder');
		roleTarget.removeTag('role:admin');
		if (newRole !== 'player') roleTarget.addTag(`role:${newRole}`);
		tell(player, 'chat.cmd.role.done', roleTarget.name, { translate: `role.${newRole}` });
		if (roleTarget.name !== player.name) {
			tell(roleTarget, 'chat.cmd.role.received', { translate: `role.${newRole}` });
		}
	},

	resetpass(player, args) {
		// Сброс забытого пароля — только владелец и только игроку в сети: ему сразу показывается регистрация
		const name = args.join(' ');
		if (!name) {
			tell(player, 'chat.cmd.resetpass.use');
			return;
		}
		const target = findPlayer(name);
		if (!target) {
			tell(player, 'chat.cmd.resetpass.error.offline', name);
			return;
		}
		if (target.name === player.name || target.hasTag('role:bot')) {
			tell(player, 'chat.cmd.error.self');
			return;
		}
		resetPassword(player, target);
	},

	roles(player, args) {
		// Роли игроков в сети: сначала старшие.
		// В 1.19.50 getPlayers() возвращает итератор, а не массив — у него нет .map, поэтому [...]
		const lines = [...world.getPlayers()]
			.map(p => ({ name: p.name, role: getRole(p) }))
			.sort((a, b) => ROLES.indexOf(b.role) - ROLES.indexOf(a.role) || a.name.localeCompare(b.name))
			.map(p => ({ translate: 'chat.cmd.roles.line', with: { rawtext: [{ text: p.name }, { translate: `role.${p.role}` }] } }));
		const rawtext = [{ translate: 'chat.cmd.roles.header' }];
		for (const line of lines) rawtext.push({ text: '\n' }, line);
		rawtext.push({ text: '\n§8------------------------' });
		run(player, `tellraw @s ${JSON.stringify({ rawtext })}`);
	}
};
