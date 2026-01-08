// --- Обработка пользовательских команд чата для Shop for Ore ---
// Импортируем необходимые данные и списки команд
import { world } from '@minecraft/server';
import { commandsList, emotes, emotesList } from '../DataBase.js';

// --- Главный обработчик команд чата ---
world.events.beforeChat.subscribe((data) => {
	const player = data.sender;
	const message = data.message.trim();

	// Если не команда (не начинается с "!") — не обрабатываем
	if (!message.startsWith("!")) return;
	data.cancel = true;

	// Парсим команду и аргументы
	const args = message.slice(1).split(/\s+/);
	const command = args.shift().toLowerCase();

	// Поиск команды в списке
	const findCommand = commandsList.find(cmd => cmd.command.startsWith(`!${command}`));
	if (!findCommand) {
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"message.cmd.error.1"},{"text":" §c!${command}§7. "},{"translate":"message.cmd.error.2"}]}`);
		return;
	}

	// Проверка на права хоста, если команда только для хоста
	if (findCommand.hostOnly && !player.hasTag("host")) {
		player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"message.cmd.error.3"}]}`);
		return;
	}

	// --- Обработка каждой команды ---
	switch (command) {
		case "help":
			// Вывод списка доступных команд
			const helpMessage = commandsList.filter(cmd => !cmd.hostOnly || player.hasTag("host")).map(cmd => `§f${cmd.command} - ${cmd.description}`).join("\n");
			player.tell(`%commands.list.desc\n${helpMessage}\n§8------------------------§f`);
			break;

		case "spawn":
			// Телепорт на спавн
			player.runCommandAsync("tp @s 0 2 0");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.spawn"}]}');
			break;

		case "emotes":
			// Вывод списка эмодзи
			const emotesMessage = emotesList.map(emote => `${emote.name} - ${emote.symbol}`).join("\n");
			player.tell(`%message.cmd.emotes\n${emotesMessage}\n§8------------------------§f`);
			break;

		case "msg":
			// Личное сообщение другому игроку с поддержкой эмодзи
			const recipient = args[0];
			let privateMessage = args.slice(1).join(" ");

			if (recipient && privateMessage) {
				// Замена текстовых кодов эмодзи на символы
				for (const [name, symbol] of Object.entries(emotes)) {
					privateMessage = privateMessage.replaceAll(name, symbol);
				}

				// Форматированное личное сообщение с иконкой облачка
				player.runCommandAsync(`tellraw "${recipient}" {"rawtext":[{"text":"\ue11d ${player.name}:§r ${privateMessage}"}]}`);
				player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"\ue11d "},{"translate":"chat.recipient"},{"text":" \ue170 ${recipient}:§r ${privateMessage}"}]}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.msg.use"}]}');
			}
			break;

		case "gm1":
			// Креатив
			player.runCommandAsync("gamemode creative @s");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.gm1"}]}');
			break;

		case "gm2":
			// Приключенческий режим
			player.runCommandAsync("gamemode adventure @s");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.gm2"}]}');
			break;

		case "gm6":
			// Наблюдатель
			player.runCommandAsync("gamemode spectator @s");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.gm6"}]}');
			break;

		case "fly":
			// Включение/выключение полёта
			const flyState = args[0];
			if (flyState === "on") {
				player.runCommandAsync("ability @s mayfly true");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.fly.on"}]}');
			} else if (flyState === "off") {
				player.runCommandAsync("ability @s mayfly false");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.fly.off"}]}');
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.fly.use"}]}');
			}
			break;

		case "clearchat":
			// Очистка чата для всех
			player.runCommandAsync('tellraw @a {"rawtext":[{"text":"\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"}]}');
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.clearchat"}]}');
			break;

		case "invis":
			// Невидимость
			const invisState = args[0];
			if (invisState === "on") {
				player.runCommandAsync("effect @s invisibility 3600 255 true");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.invis.on"}]}');
			} else if (invisState === "off") {
				player.runCommandAsync("effect @s clear");
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.invis.off"}]}');
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.invis.use"}]}');
			}
			break;

		case "bot":
			// Спавн бота
			player.runCommandAsync("function system/spawnbot");
			break;

		case "stick":
			// Выдача админ-палки
			player.runCommandAsync("give @s server:admin_stick");
			player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.stick"}]}');
			break;

		case 'timeset':
			// Изменение времени суток
			const time = args[0];
			if (time === "sunrise" || time === "day" || time === "noon" || time === "sunset" || time === "night" || time === "midnight") {
				player.runCommandAsync(`time set ${time}`);
				player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§8[§7CMD@host§8]§7: time changed to ${time}"}]}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.timeset.use"}]}');
			}
			break;

		case "prefix":
			// Добавление/удаление префикса игроку
			const prefixPlayer = args[0];
			const prefixAction = args[1];
			const prefixName = args.slice(2).join(" ");
			if (["set", "take"].includes(prefixAction) && prefixName) {
				const prefixTag = `rank:${prefixName}`;
				const command = prefixAction === "set"
				? `tag "${prefixPlayer}" add ${prefixTag}`: `tag "${prefixPlayer}" remove ${prefixTag}`;
				player.runCommandAsync(command);
				player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§8[§7CMD@host§8]§7: prefix ${prefixName}§7 ${prefixAction === "set" ? "added": "removed"} for ${prefixPlayer}§r"}]}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.prefix.use"}]}');
			}
			break;

		case "tag":
			// Добавление/удаление тега игроку
			const tagTarget = args[0];
			const tagAction = args[1];
			const tagName = args[2];
			if (["add", "remove"].includes(tagAction) && tagName) {
				const tagCommand = `tag "${tagTarget}" ${tagAction} ${tagName}`;
				player.runCommandAsync(tagCommand);
				player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§8[§7CMD@host§8]§7: tag ${tagName} ${tagAction}ed for ${tagTarget}§r"}]}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.tag.use"}]}');
			}
			break;

		case "scoreboard":
			// Изменение значений scoreboard игрока
			const sbTarget = args[0];
			const sbAction = args[1];
			const sbObjective = args[2];
			const sbAmount = parseInt(args[3], 10);
			if (["add", "remove"].includes(sbAction) && sbObjective && !isNaN(sbAmount)) {
				player.runCommandAsync(`scoreboard players ${sbAction} "${sbTarget}" ${sbObjective} ${sbAmount}`);
				player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§8[§7CMD@host§8]§7: ${sbAction} ${sbAmount} to ${sbObjective} for ${sbTarget}"}]}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.scoreboard.use"}]}');
			}
			break;

		case "kick":
			// Кик игрока с причиной
			const kickTarget = args[0];
			const kickReason = args.slice(1).join(" ") || "%message.cmd.kick.no_reason";
			if (kickTarget) {
				player.runCommandAsync(`kick "${kickTarget}" ${kickReason}`);
				player.runCommandAsync(`tellraw @a {"rawtext":[{"text":"§c${kickTarget} "},{"translate":"message.cmd.kick"},{"translate":"${kickReason}"}]}`);
			} else {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.kick.use"}]}');
			}
			break;

		case "wipe":
			player.runCommandAsync("function system/wipe");
			break;

		case "tp": {
			const targetName = args[0];
			
			if (!targetName) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"message.cmd.tp.use"}]}');
				return;
			}
			
			// Телепорт указанного игрока к вызывающему
			player.runCommandAsync(`tp "${targetName}" @s`);
			player.runCommandAsync(`tellraw @s {"rawtext":[{"text":"§8[§7CMD@host§8]§7: teleported §f${targetName}§7 to you"}]}`);
			break;
		}	

		default:
			// Неизвестная команда
			player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"message.cmd.error.1"},{"text":" §c!${command}§7. "},{"translate":"message.cmd.error.2"}]}`);
	}
});
