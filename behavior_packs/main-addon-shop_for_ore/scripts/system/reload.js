// --- «Скрипты загружены» ---
// После загрузки скриптов (вход в мир или /reload) сообщает администраторам в сети,
// что новые скрипты действительно запустились. console.log в журнале игры не виден:
// окно журнала показывает только предупреждения и ошибки.

import { system, world } from '@minecraft/server';
import { hasRole, tell } from '../DataBase.js';

system.run(() => {
	for (const player of world.getPlayers()) {
		if (hasRole(player, 'admin')) tell(player, 'chat.cmd.reload.done');
	}
});
