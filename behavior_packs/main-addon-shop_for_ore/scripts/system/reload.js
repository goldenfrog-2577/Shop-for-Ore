// После загрузки скриптов (вход в мир, /reload или !reload) сообщает администраторам в сети,
// что новые скрипты действительно запустились. console.log в журнале игры не виден:
// окно журнала показывает только предупреждения и ошибки.
import { system, world } from '@minecraft/server';
import { hasRole, rawTranslate, run } from '../DataBase.js';

system.run(() => {
	for (const player of world.getPlayers()) {
		if (hasRole(player, 'admin')) run(player, `tellraw @s ${rawTranslate('chat.cmd.reload.done')}`);
	}
});
