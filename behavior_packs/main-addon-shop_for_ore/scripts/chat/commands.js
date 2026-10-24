// --- Обработка пользовательских команд чата для Shop for Ore ---
// Импортируем необходимые данные и списки команд
import { world } from '@minecraft/server';
import { commandsList, emotes, emotesList, rawTranslate, rawTranslateRich, isPending, run, findPlayer, tellText, getRole, hasRole, ROLES } from '../DataBase.js';

// --- Главный обработчик команд чата ---
world.events.beforeChat.subscribe((data) => {
	const player = data.sender;
	const message = data.message.trim();

	// Если не команда (не начинается с "!") — не обрабатываем
	if (!message.startsWith("!")) return;
	data.cancel = true;
	// До входа в аккаунт команды недоступны (сообщение игроку показывает chat.js)
	if (isPending(player)) return;

	// Парсим команду и аргументы
	const args = message.slice(1).split(/\s+/);
	const command = args.shift().toLowerCase();

	// Поиск команды в списке — по точному имени (раньше «!f» находило «!fly», «!g» — «!gm1»)
	const findCommand = commandsList.find(cmd => cmd.command.split(' ')[0] === `!${command}`);
	if (!findCommand) {
		run(player, `tellraw @s ${rawTranslate('chat.cmd.error.unknown', `!${command}`)}`);
		return;
	}

	// Проверка роли: команда доступна, если роль игрока не ниже нужной
	if (!hasRole(player, findCommand.role)) {
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.cmd.error.no_permission"}]}`);
		return;
	}

	// --- Обработка каждой команды ---
	switch (command) {
		case "help":
			// Вывод списка доступных команд
			// Каждый видит только команды своей роли и ниже
			const helpMessage = commandsList.filter(cmd => hasRole(player, cmd.role)).map(cmd => `§f${cmd.command} - ${cmd.description}`).join("\n");
			tellText(player, `%chat.help.header\n${helpMessage}\n§8------------------------§f`);
			break;

		case "spawn":
			// Телепорт на спавн
			player.runCommandAsync("tp @s 0 2 0");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.spawn"}]}');
			break;

		case "emotes":
			// Вывод списка эмодзи
			const emotesMessage = emotesList.map(emote => `${emote.name} - ${emote.symbol}`).join("\n");
			tellText(player, `%chat.emotes.header\n${emotesMessage}\n§8------------------------§f`);
			break;

		case "msg":
			// Личное сообщение другому игроку с поддержкой эмодзи
			const recipient = args[0];
			let privateMessage = args.slice(1).join(" ");

			if (recipient && privateMessage) {
				const target = findPlayer(recipient);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', recipient)}`);
					break;
				}
				// Замена текстовых кодов эмодзи на символы
				for (const [name, symbol] of Object.entries(emotes)) {
					privateMessage = privateMessage.replaceAll(name, symbol);
				}

				// Форматированное личное сообщение с иконкой облачка.
				// JSON собирается через JSON.stringify: кавычки в сообщении больше не ломают tellraw
				run(target, `tellraw @s ${rawTranslate('chat.cmd.msg.received', player.name, privateMessage)}`);
				run(player, `tellraw @s ${rawTranslate('chat.cmd.msg.sent', target.name, privateMessage)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.msg.use"}]}');
			}
			break;

		case "gm1":
			// Креатив
			player.runCommandAsync("gamemode creative @s");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.gm1"}]}');
			break;

		case "gm2":
			// Приключенческий режим
			player.runCommandAsync("gamemode adventure @s");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.gm2"}]}');
			break;

		case "gm6":
			// Наблюдатель
			player.runCommandAsync("gamemode spectator @s");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.gm6"}]}');
			break;

		case "fly":
			// Включение/выключение полёта
			const flyState = args[0];
			if (flyState === "on") {
				player.runCommandAsync("ability @s mayfly true");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.fly.on"}]}');
			} else if (flyState === "off") {
				player.runCommandAsync("ability @s mayfly false");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.fly.off"}]}');
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.fly.use"}]}');
			}
			break;

		case "clearchat":
			// Очистка чата для всех
			player.runCommandAsync('tellraw @a {"rawtext":[{"text":"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"}]}');
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.clearchat"}]}');
			break;

		case "invis":
			// Невидимость
			const invisState = args[0];
			if (invisState === "on") {
				player.runCommandAsync("effect @s invisibility 3600 255 true");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.on"}]}');
			} else if (invisState === "off") {
				// Только невидимость (раньше снимались все эффекты)
				player.runCommandAsync("effect @s invisibility 0");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.off"}]}');
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.invis.use"}]}');
			}
			break;

		case "bot":
			// Спавн бота
			player.runCommandAsync("function system/spawnbot");
			break;

		case "stick":
			// Выдача админ-палки
			player.runCommandAsync("give @s server:admin_stick");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.stick"}]}');
			break;

		case 'timeset':
			// Изменение времени суток
			const time = args[0];
			if (time === "sunrise" || time === "day" || time === "noon" || time === "sunset" || time === "night" || time === "midnight") {
				player.runCommandAsync(`time set ${time}`);
				player.runCommandAsync(`tellraw @s ${rawTranslate('chat.cmd.timeset.done', time)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.timeset.use"}]}');
			}
			break;

		case "prefix":
			// Добавление/удаление префикса игроку
			const prefixPlayer = args[0];
			const prefixAction = args[1];
			const prefixName = args.slice(2).join(" ");
			if (["set", "take"].includes(prefixAction) && prefixName) {
				// Тег в кавычках — префикс может содержать пробелы («Super Admin»)
				const prefixTag = JSON.stringify(`rank:${prefixName}`);
				const command = prefixAction === "set"
				? `tag "${prefixPlayer}" add ${prefixTag}`: `tag "${prefixPlayer}" remove ${prefixTag}`;
				run(player, command);
				player.runCommandAsync(`tellraw @s ${rawTranslate(prefixAction === "set" ? 'chat.cmd.prefix.set' : 'chat.cmd.prefix.take', prefixName, prefixPlayer)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.prefix.use"}]}');
			}
			break;

		case "tag":
			// Добавление/удаление тега игроку
			const tagTarget = args[0];
			const tagAction = args[1];
			const tagName = args[2];
			if (["add", "remove"].includes(tagAction) && tagName) {
				const tagCommand = `tag "${tagTarget}" ${tagAction} ${JSON.stringify(tagName)}`;
				run(player, tagCommand);
				player.runCommandAsync(`tellraw @s ${rawTranslate(`chat.cmd.tag.${tagAction}`, tagName, tagTarget)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tag.use"}]}');
			}
			break;

		case "scoreboard":
			// Изменение значений scoreboard игрока
			const sbTarget = args[0];
			const sbAction = args[1];
			const sbObjective = args[2];
			const sbAmount = parseInt(args[3], 10);
			if (["add", "remove"].includes(sbAction) && sbObjective && !isNaN(sbAmount)) {
				run(player, `scoreboard players ${sbAction} "${sbTarget}" ${sbObjective} ${sbAmount}`);
				player.runCommandAsync(`tellraw @s ${rawTranslate(`chat.cmd.scoreboard.${sbAction}`, sbTarget, sbObjective, sbAmount)}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.scoreboard.use"}]}');
			}
			break;

		case "kick":
			// Кик игрока с причиной
			const kickTarget = args[0];
			const kickReason = args.slice(1).join(" ");
			if (kickTarget) {
				const target = findPlayer(kickTarget);
				if (!target) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', kickTarget)}`);
					break;
				}
				// Выгнать можно только игрока с ролью ниже своей (владелец — любого, кроме себя)
				if (target.name !== player.name && getRole(player) !== 'owner' && hasRole(target, getRole(player))) {
					run(player, `tellraw @s ${rawTranslate('chat.cmd.kick.error.role', target.name)}`);
					break;
				}
				// Без причины — стандартное сообщение игры (раньше выгнанный видел сырой ключ %chat.cmd.kick.no_reason)
				run(player, kickReason ? `kick "${target.name}" ${kickReason}` : `kick "${target.name}"`);
				// JSON через JSON.stringify: кавычки в причине больше не ломают сообщение
				run(player, `tellraw @a ${JSON.stringify({ rawtext: [{ translate: "chat.cmd.kick", with: { rawtext: [{ text: target.name }, kickReason ? { text: kickReason } : { translate: "chat.cmd.kick.no_reason" }] } }] })}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.kick.use"}]}');
			}
			break;

		case "wipe":
			player.runCommandAsync("function system/wipe");
			break;

		case "tp": {
			const targetName = args[0];
			
			if (!targetName) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.tp.use"}]}');
				return;
			}
			
			// Телепорт указанного игрока к вызывающему
			const tpTarget = findPlayer(targetName);
			if (!tpTarget) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', targetName)}`);
				return;
			}
			run(player, `tp "${tpTarget.name}" @s`);
			run(player, `tellraw @s ${rawTranslate('chat.cmd.tp.done', tpTarget.name)}`);
			break;
		}	

		case "role": {
			// Назначение роли — только владелец (проверено выше по commandsList)
			const roleTargetName = args[0];
			const newRole = (args[1] || '').toLowerCase();
			if (!roleTargetName || !['player', 'moder', 'admin'].includes(newRole)) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.role.use"}]}');
				break;
			}
			const roleTarget = findPlayer(roleTargetName);
			if (!roleTarget) {
				run(player, `tellraw @s ${rawTranslate('chat.cmd.error.offline', roleTargetName)}`);
				break;
			}
			// Владелец один — его роль командой не меняется
			if (roleTarget.hasTag('host')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.role.error.owner"}]}');
				break;
			}
			roleTarget.removeTag('role:moder');
			roleTarget.removeTag('role:admin');
			if (newRole !== 'player') roleTarget.addTag(`role:${newRole}`);
			run(player, `tellraw @s ${rawTranslateRich('chat.cmd.role.done', roleTarget.name, { translate: `role.${newRole}` })}`);
			if (roleTarget.name !== player.name) {
				run(roleTarget, `tellraw @s ${rawTranslateRich('chat.cmd.role.received', { translate: `role.${newRole}` })}`);
			}
			break;
		}

		case "roles": {
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
			break;
		}

		default:
			// Неизвестная команда
			run(player, `tellraw @s ${rawTranslate('chat.cmd.error.unknown', `!${command}`)}`);
	}
});