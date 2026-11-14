// --- Команды хелпера и модератора: мут, тюрьма, предупреждения, заморозка, кик, телепорт, CPS, античит ---
// Обработчик: имя команды без «!» → (player, args, command). Права (роль из commandsList) проверяет
// runChatCommand в chat/commands/commands.js; return — команда выполнена или отказ уже сообщён игроку.

import { tell, run, findPlayer, getRole, hasRole, parseTerm, muteMinutesLeft, canLift, setIssuer, rawTranslateRich, termText, rawTranslate, clearIssuer, getWarns } from '../../../utils.js';
import { isJailed, jail, release, tellJailed } from '../../../system/security/jail.js';
import { leaveGame, canTeleport } from '../../../system/minigames/minigames.js';
import { freezePlayer, unfreezePlayer } from '../../../system/security/freeze.js';
import { cpsOf, cpsLimit } from '../../../system/security/cps.js';
import { MODE, modeName, clearViolations, flaggedPlayers, acMode, violationsOf, CHECKS } from '../../../system/security/anticheat.js';
import { canPunish, tellList } from '../common.js';
import { logAction } from '../../../system/security/staff_log.js';

/** Координата для !tp: число (можно с дробью и минусом) или относительная ~ / ~-3.5. */
export const isCoord = (a) => /^(~?-?\d+(\.\d+)?|~)$/.test(a);

export const MODERATION_COMMANDS = {
	invis(player, args) {
		// !invis — переключить; !invis on/off. Состояние — тег state:invis
		const state = args[0] ? args[0].toLowerCase() : undefined;
		if (state && state !== 'on' && state !== 'off') {
			tell(player, 'chat.cmd.invis.use');
			return;
		}
		const on = state ? state === 'on' : !player.hasTag('state:invis');
		if (on) {
			run(player, 'effect @s invisibility 3600 255 true');
			player.addTag('state:invis');
			tell(player, 'chat.cmd.invis.on');
		} else {
			// Только невидимость (раньше снимались все эффекты)
			run(player, 'effect @s invisibility 0');
			player.removeTag('state:invis');
			tell(player, 'chat.cmd.invis.off');
		}
	},

	kick(player, args) {
		// Кик игрока с причиной
		const kickTarget = args[0];
		const kickReason = args.slice(1).join(' ');
		if (kickTarget) {
			const target = findPlayer(kickTarget);
			if (!target) {
				tell(player, 'chat.cmd.error.offline', kickTarget);
				return;
			}
			// Выгнать можно только игрока с ролью ниже своей (владелец — любого, кроме себя)
			if (target.name !== player.name && getRole(player) !== 'owner' && hasRole(target, getRole(player))) {
				tell(player, 'chat.cmd.error.role', target.name);
				return;
			}
			// Без причины — стандартное сообщение игры (раньше выгнанный видел сырой ключ %chat.cmd.kick.no_reason)
			run(player, kickReason ? `kick "${target.name}" ${kickReason}` : `kick "${target.name}"`);
			logAction(player, 'kick', target.name, kickReason);
			// JSON через JSON.stringify: кавычки в причине больше не ломают сообщение
			run(player, `tellraw @a ${JSON.stringify({ rawtext: [{ translate: 'chat.cmd.kick', with: { rawtext: [{ text: target.name }, kickReason ? { text: kickReason } : { translate: 'chat.cmd.kick.no_reason' }] } }] })}`);
		} else {
			tell(player, 'chat.cmd.kick.use');
		}
	},

	mute(player, args) {
		// Мут: срок (30, 30m, 2h, 1d — до 30 дней) или permanent — до !unmute. Нельзя писать в общий чат и ЛС.
		// Хранится тегом state:mute:<окончание | permanent>
		const target = args[0] ? findPlayer(args[0]) : undefined;
		const minutes = parseTerm(args[1]);
		if (!args[0] || minutes === undefined) {
			tell(player, 'chat.cmd.mute.use');
			return;
		}
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (!canPunish(player, target)) return;
		// Перебить мут, выданный старшим, нельзя (canPunish это не проверяет: роль цели может быть ниже обоих)
		if (muteMinutesLeft(target) > 0 && !canLift(player, target, 'mute')) return;
		target.getTags().filter(t => t.startsWith('state:mute:')).forEach(t => target.removeTag(t));
		target.addTag(`state:mute:${minutes === Infinity ? 'permanent' : Date.now() + minutes * 60000}`);
		setIssuer(target, 'mute', getRole(player));
		logAction(player, 'mute', target.name, args.slice(1));
		const reason = args.slice(2).join(' ');
		run(player, `tellraw @a ${rawTranslateRich('chat.cmd.mute', target.name, termText(minutes), reason ? { text: reason } : { translate: 'chat.cmd.kick.no_reason' })}`);
	},

	jail(player, args) {
		// Тюрьма (system/security/jail.js): срок (30, 30m, 2h, 1d — до 30 дней) или permanent — до !unjail. Хелпер и выше
		const target = args[0] ? findPlayer(args[0]) : undefined;
		const minutes = parseTerm(args[1]);
		if (!args[0] || minutes === undefined) {
			tell(player, 'chat.cmd.jail.use');
			return;
		}
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (!canPunish(player, target)) return;
		if (target.hasTag('role:bot')) {
			tell(player, 'chat.cmd.error.self');
			return;
		}
		// Перебить срок, назначенный старшей ролью, нельзя
		if (isJailed(target) && !canLift(player, target, 'jail')) return;
		// Из мини-игры — сначала выйти (иначе игра ждала бы его до конца)
		leaveGame(target, 'jail');
		jail(target, minutes);
		setIssuer(target, 'jail', getRole(player));
		logAction(player, 'jail', target.name, args.slice(1));
		const reason = args.slice(2).join(' ');
		run(player, `tellraw @a ${rawTranslateRich('chat.cmd.jail', target.name, termText(minutes), reason ? { text: reason } : { translate: 'chat.cmd.kick.no_reason' })}`);
	},

	unjail(player, args) {
		const target = args[0] ? findPlayer(args[0]) : undefined;
		if (!args[0]) {
			tell(player, 'chat.cmd.unjail.use');
			return;
		}
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (!isJailed(target)) {
			tell(player, 'chat.cmd.unjail.error.not_jailed', target.name);
			return;
		}
		if (!canLift(player, target, 'jail')) return;
		release(target, 'chat.jail.released.early');
		logAction(player, 'unjail', target.name);
		run(player, `tellraw @a ${rawTranslate('chat.cmd.unjail', target.name, player.name)}`);
	},

	unmute(player, args) {
		const target = args[0] ? findPlayer(args[0]) : undefined;
		if (!args[0]) {
			tell(player, 'chat.cmd.unmute.use');
			return;
		}
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (muteMinutesLeft(target) === 0) {
			tell(player, 'chat.cmd.unmute.error.not_muted', target.name);
			return;
		}
		// Мут, выданный старшим по роли, снять нельзя
		if (!canLift(player, target, 'mute')) return;
		target.getTags().filter(t => t.startsWith('state:mute:')).forEach(t => target.removeTag(t));
		clearIssuer(target, 'mute');
		logAction(player, 'unmute', target.name);
		tell(player, 'chat.cmd.unmute.done', target.name);
		tell(target, 'chat.cmd.unmute.received');
	},

	warn(player, args) {
		// Предупреждение (тег warn:N); на третьем — кик и счётчик с нуля
		const reason = args.slice(1).join(' ');
		if (!args[0] || !reason) {
			tell(player, 'chat.cmd.warn.use');
			return;
		}
		const target = findPlayer(args[0]);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (!canPunish(player, target)) return;
		const warns = getWarns(target) + 1;
		logAction(player, 'warn', target.name, `${Math.min(warns, 3)}/3 ${reason}`);
		target.getTags().filter(t => t.startsWith('state:warn:')).forEach(t => target.removeTag(t));
		run(player, `tellraw @a ${rawTranslate('chat.cmd.warn', target.name, String(warns), reason)}`);
		if (warns >= 3) {
			// Причина кика — без перевода (её показывает сама игра), поэтому «3/3: причина»
			clearIssuer(target, 'warn');
			run(player, `kick "${target.name}" 3/3: ${reason}`);
			run(player, `tellraw @a ${JSON.stringify({ rawtext: [{ translate: 'chat.cmd.kick', with: { rawtext: [{ text: target.name }, { text: `3/3: ${reason}` }] } }] })}`);
		} else {
			target.addTag(`state:warn:${warns}`);
			// Снять предупреждения сможет роль не ниже самой старшей из выдавших
			setIssuer(target, 'warn', getRole(player), true);
		}
	},

	unwarn(player, args) {
		// Снять предупреждения: !unwarn <ник> [число|all] (по умолчанию одно)
		const name = args[0];
		const amountArg = (args[1] || '1').toLowerCase();
		if (!name || !(amountArg === 'all' || /^\d+$/.test(amountArg)) || amountArg === '0') {
			tell(player, 'chat.cmd.unwarn.use');
			return;
		}
		const target = findPlayer(name);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', name);
			return;
		}
		const before = getWarns(target);
		if (before === 0) {
			tell(player, 'chat.cmd.unwarn.error.none', target.name);
			return;
		}
		if (target.name !== player.name && !canPunish(player, target)) return;
		if (!canLift(player, target, 'warn')) return;
		const left = amountArg === 'all' ? 0 : Math.max(0, before - Number(amountArg));
		target.getTags().filter(t => t.startsWith('state:warn:')).forEach(t => target.removeTag(t));
		if (left > 0) target.addTag(`state:warn:${left}`);
		else clearIssuer(target, 'warn');
		logAction(player, 'unwarn', target.name, `${before} → ${left}`);
		tell(player, 'chat.cmd.unwarn.done', target.name, String(before - left), String(left));
		if (target.name !== player.name) tell(target, 'chat.cmd.unwarn.received', String(before - left), String(left));
	},

	freeze(player, args) {
		// Заморозка: игрок застывает на месте (даже в воздухе), недоступны меню, меню администратора и !warp.
		// Разморозка — !unfreeze
		if (!args[0]) {
			tell(player, 'chat.cmd.freeze.use');
			return;
		}
		const target = findPlayer(args[0]);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (!canPunish(player, target)) return;
		if (target.hasTag('state:frozen')) {
			tell(player, 'chat.cmd.freeze.error.already', target.name);
			return;
		}
		// Игрок застывает там, где стоит (в том числе в воздухе): system/security/freeze.js возвращает его на место каждый тик
		freezePlayer(target);
		setIssuer(target, 'frozen', getRole(player));
		logAction(player, 'freeze', target.name);
		tell(player, 'chat.cmd.freeze.on', target.name);
		tell(target, 'chat.cmd.freeze.received.on');
	},

	unfreeze(player, args) {
		if (!args[0]) {
			tell(player, 'chat.cmd.unfreeze.use');
			return;
		}
		const target = findPlayer(args[0]);
		if (!target) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (!target.hasTag('state:frozen')) {
			tell(player, 'chat.cmd.unfreeze.error.not_frozen', target.name);
			return;
		}
		// Разморозить может только роль не ниже заморозившего
		if (!canLift(player, target, 'frozen')) return;
		unfreezePlayer(target);
		logAction(player, 'unfreeze', target.name);
		tell(player, 'chat.cmd.freeze.off', target.name);
		tell(target, 'chat.cmd.freeze.received.off');
	},

	cps(player, args) {
		// CPS игрока сейчас и максимум за 10 секунд (предупреждения сами приходят модераторам)
		if (!args[0]) { tell(player, 'chat.cmd.cps.use'); return; }
		const target = findPlayer(args.join(' '));
		if (!target) { tell(player, 'chat.cmd.error.offline', args.join(' ')); return; }
		const { now, max } = cpsOf(target.name);
		tell(player, 'chat.cmd.cps.info', target.name, now, max, cpsLimit());
	},

	ac(player, args) {
		// !ac — режим и игроки с очками; !ac <ник> — очки по проверкам;
		// !ac mode <alerts|rollback|kick> — режим (администратор); !ac reset <ник> — сбросить очки (модератор)
		const sub = (args[0] || '').toLowerCase();
		if (sub === 'mode') {
			if (!hasRole(player, 'admin')) { tell(player, 'chat.cmd.error.no_permission'); return; }
			const mode = MODE[(args[1] || '').toLowerCase()];
			if (!mode) { tell(player, 'chat.cmd.ac.mode_use'); return; }
			run(player, `scoreboard players set ac_mode settings ${mode}`);
			tell(player, 'chat.cmd.ac.mode_set', { translate: `anticheat.mode.${modeName(mode)}` });
			return;
		}
		if (sub === 'reset') {
			if (!hasRole(player, 'moder')) { tell(player, 'chat.cmd.error.no_permission'); return; }
			const name = args.slice(1).join(' ');
			if (!name) { tell(player, 'chat.cmd.ac.use'); return; }
			const target = findPlayer(name);
			clearViolations(target?.name ?? name);
			tell(player, 'chat.cmd.ac.reset', target?.name ?? name);
			return;
		}
		if (!sub) {
			const list = flaggedPlayers().slice(0, 10).map(f => ({ translate: 'chat.cmd.ac.flagged', with: [f.name, String(f.total)] }));
			tellList(player, { translate: 'chat.cmd.ac.header', with: { rawtext: [{ translate: `anticheat.mode.${modeName(acMode())}` }] } },
				list.length ? list : [{ translate: 'chat.cmd.ac.none' }]);
			return;
		}
		const target = findPlayer(args.join(' '));
		const name = target?.name ?? args.join(' ');
		const v = violationsOf(name);
		const lines = Object.keys(CHECKS).filter(c => v[c]).map(c => ({ translate: 'chat.cmd.ac.line', with: { rawtext: [{ translate: `anticheat.check.${c}` }, { text: String(v[c]) }, { text: String(CHECKS[c]) }] } }));
		tellList(player, { translate: 'chat.cmd.ac.player', with: [name] }, lines.length ? lines : [{ translate: 'chat.cmd.ac.none' }]);
	},

	tp(player, args) {
		// !tp <ник> — ты к игроку (отправить другого игрока к себе — !tphere); !tp <x> <y> <z> — в точку
		// (числа или ~ / ~5 относительно себя, как у /tp)
		if (!args[0]) {
			tell(player, 'chat.cmd.tp.use');
			return;
		}
		// Хелпера, посаженного старшим, телепорт из тюрьмы не выпускает
		if (isJailed(player)) {
			tellJailed(player);
			return;
		}
		if (args.length === 3 && args.every(isCoord)) {
			if (!canTeleport(player)) return;
			run(player, `tp @s ${args.join(' ')}`);
			tell(player, 'chat.cmd.tp.coords', args.join(' '));
			return;
		}
		if (args.length > 1 && args.some(isCoord) && !findPlayer(args.join(' '))) {
			tell(player, 'chat.cmd.tp.use');
			return;
		}
		const first = findPlayer(args[0]);
		if (!first) {
			tell(player, 'chat.cmd.error.offline', args[0]);
			return;
		}
		if (first.name === player.name) {
			tell(player, 'chat.cmd.error.self');
			return;
		}
		if (!canTeleport(player)) return;
		run(player, `tp @s "${first.name}"`);
		tell(player, 'chat.cmd.tp.to', first.name);
	},

	tphere(player, args) {
		// Игрока к себе (раньше это делала !tp)
		const targetName = args[0];
		if (!targetName) {
			tell(player, 'chat.cmd.tphere.use');
			return;
		}
		const tpTarget = findPlayer(targetName);
		if (!tpTarget) {
			tell(player, 'chat.cmd.error.offline', targetName);
			return;
		}
		if (tpTarget.name === player.name) {
			tell(player, 'chat.cmd.error.self');
			return;
		}
		if (!canTeleport(tpTarget, player)) return;
		run(player, `tp "${tpTarget.name}" @s`);
		tell(player, 'chat.cmd.tp.done', tpTarget.name);
	}
};
