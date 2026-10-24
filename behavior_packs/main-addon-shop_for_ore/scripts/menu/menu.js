// --- Главное меню и подменю аддона Shop for Ore ---
// Импортируем необходимые модули
import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { bank } from './bank_menu.js';
import { combatSecondsLeft } from '../system/pvp.js';
import { enchantsMenu } from './enchant_shop.js';
import { ChangePasswordUI } from '../register/change.js';
import { isPending, rawTranslate, tellText, closedByPlayer } from '../DataBase.js';

// --- Открытие меню при использовании специального предмета ---
world.events.beforeItemUse.subscribe(data => {
	const player = data.source
	if (data.item.typeId == 'server:menu') {
		// До входа в аккаунт меню недоступно
		if (isPending(player)) {
			data.cancel = true;
			player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.account.error.login_required"}]}`);
			return;
		}
		// Замороженный игрок не может уйти варпом из меню
		if (player.hasTag('frozen')) {
			data.cancel = true;
			player.runCommandAsync(`tellraw @s {"rawtext":[{"translate":"chat.cmd.freeze.active"}]}`);
			return;
		}
		menu(player)
	}
});

// --- Главное меню ---
export function menu(player) {
	const menu = new ActionFormData()
	.title('%menu.main.title')
	.body('%menu.main.body')
	.button('%menu.main.button.about\n%menu.common.tap_to_open')
	.button('%menu.main.button.shop\n%menu.common.tap_to_open')
	.button('%menu.main.button.settings\n%menu.common.tap_to_open')
	.button('%menu.main.button.bank\n%menu.common.tap_to_open')
	.button('%menu.main.button.rules\n%menu.common.tap_to_open')
	.button('%menu.main.button.promo\n%menu.common.tap_to_open')
	.button('%menu.main.button.warps\n%menu.common.tap_to_open')
	.button('%menu.main.button.upgrades\n%menu.common.tap_to_open')
	menu.show(player).then(m => {
		if (m.selection == 0) {
			mapInfo(player)
		} else if (m.selection == 1) {
			shop(player)
		} else if (m.selection == 2) {
			settings(player)
		} else if (m.selection == 3) {
			bank(player)
		} else if (m.selection == 4) {
			rules(player)
		} else if (m.selection == 5) {
			promocodes(player)
		} else if (m.selection == 6) {
			warps(player)
		} else if (m.selection == 7) {
			upgrading(player)
		}
	});
}

// --- Информация о карте ---
function mapInfo(player) {
	const mapInfo = new ActionFormData()
	.title('%menu.about.title')
	.body('%menu.about.body')
	.button('%menu.about.button.levels')
	.button('%menu.about.button.howtoplay')
	.button('%menu.about.button.creators')
	.button('%menu.about.button.version')
	.button('%menu.common.back')
	mapInfo.show(player).then(i => {
		// Крестик — на уровень вверх
		if (closedByPlayer(i)) return menu(player);
		if (i.selection == 0) {
			levelsInfo(player)
		} else if (i.selection == 1) {
			howtoplay(player)
		} else if (i.selection == 2) {
			mapCreator(player)
		} else if (i.selection == 3) {
			mapVersion(player)
		} else if (i.selection == 4) {
			menu(player)
		}
	});
}

// --- Уровни карты ---
function levelsInfo(player) {
	const levelsInfo = new ActionFormData()
	.title('%menu.levels.title')
	.body('%menu.levels.line.1\n%menu.levels.line.2\n%menu.levels.line.3\n%menu.levels.line.4\n%menu.levels.line.5\n%menu.levels.line.6\n%menu.levels.line.7\n%menu.levels.line.8\n%menu.levels.line.9\n%menu.levels.line.10\n%menu.levels.line.11\n%menu.levels.line.12\n%menu.levels.line.13\n%menu.levels.line.14\n%menu.levels.line.15\n%menu.levels.line.16\n%menu.levels.line.17\n%menu.levels.line.18\n%menu.levels.line.19\n%menu.levels.line.20\n%menu.levels.line.21\n%menu.levels.line.22\n%menu.levels.line.23\n%menu.levels.line.24\n%menu.levels.line.25')
	.button('%menu.common.back')
	levelsInfo.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return mapInfo(player);
		if (tb.selection == 0) {
			mapInfo(player)
		}
	});
}

// --- Как играть ---
function howtoplay(player) {
	const howtoplay = new ActionFormData()
	.title('%menu.howtoplay.title')
	.body(' %menu.howtoplay.line.1\n%menu.howtoplay.line.2\n%menu.howtoplay.line.3\n%menu.howtoplay.line.4\n%menu.howtoplay.line.5\n\n %menu.howtoplay.line.6\n%menu.howtoplay.line.7\n%menu.howtoplay.line.8\n%menu.howtoplay.line.9\n\n %menu.howtoplay.line.10\n%menu.howtoplay.line.11\n%menu.howtoplay.line.12\n%menu.howtoplay.line.13\n\n%menu.howtoplay.line.14\n\n%menu.howtoplay.line.15\n\n%menu.howtoplay.line.16\n\n%menu.howtoplay.line.17\n\n%menu.howtoplay.line.18\n\n%menu.howtoplay.line.19\n\n%menu.howtoplay.line.20\n\n%menu.howtoplay.line.21')
	.button('%menu.common.back')
	howtoplay.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return mapInfo(player);
		if (tb.selection == 0) {
			mapInfo(player)
		}
	});
}

// --- Создатели карты ---
function mapCreator(player) {
	const mapCreator = new ActionFormData()
	.title('%menu.creators.title')
	.body('')
	.button('§8Сreator\n§8kapycta1231484',
		'textures/ui/icon_steve')
	// Соавтор карты: иконки шрифта (glyph_E1) подписаны «BY'NASTYA»
	.button('§5Сo-creator\n§8NastyaXs00',
		'textures/ui/icon_alex')
	.button('§6Оmlet Arcade\n§8@waxenjaguar2209',
		'textures/server_icons/omlet')
	.button('§9Discоrd\n§8GoldenFrog#2577',
		'textures/server_icons/discord')
	.button('§3Тelegram\n§8@xdxd1338',
		'textures/server_icons/telegram')
	.button('§2Хbox\n§8kapycta123#1484',
		'textures/server_icons/xbox')
	mapCreator.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return mapInfo(player);
		// Все кнопки возвращают к информации о карте
		if (tb.selection === undefined) return;
		mapInfo(player)
	});
}

// --- Версия карты ---
function mapVersion(player) {
	const mapVersion = new ActionFormData()
	.title('%menu.version.title')
	.body('%menu.version.line.1\n\n§r%menu.version.label §a0.3.0_dev§r\n%menu.version.line.2\n\n%menu.version.line.3\n%menu.version.line.4\n%menu.version.line.5\n%menu.version.line.6\n%menu.version.line.7\n%menu.version.line.8\n%menu.version.line.9\n%menu.version.line.10\n%menu.version.line.11\n%menu.version.line.12')
	.button('%menu.common.back')
	mapVersion.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return mapInfo(player);
		if (tb.selection == 0) {
			mapInfo(player)
		}
	});
}

// --- Магазин ---
function shop(player) {
	const shop = new ActionFormData()
	.title('%menu.shop.title')
	.body('%menu.shop.body')
	.button('%menu.shop.button.enchants',
		'textures/items/book_enchanted')
	.button('%menu.shop.button.kits',
		'textures/items/diamond_chestplate')
	.button('%menu.shop.button.boosts',
		'textures/items/experience_bottle')
	.button('%menu.common.back')
	shop.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return menu(player);
		if (tb.selection == 0) {
			enchants(player)
		} else if (tb.selection == 1) {
			pvp_kits(player)
		} else if (tb.selection == 2) {
			boosts(player)
		} else if (tb.selection == 3) {
			menu(player)
		}
	});
}

// --- Зачарования: кирка уровня, меч, лук, броня (menu/enchant_shop.js) ---
function enchants(player) {
	enchantsMenu(player, () => shop(player));
}

// --- PvP-наборы ---
function pvp_kits(player) {
	const pvp_kits = new ActionFormData()
	.title('%menu.shop.kits.title')
	.body('%menu.shop.kits.body')
	.button('%menu.shop.kits.button.iron\n§815.0K ',
		'textures/items/iron_chestplate')
	.button('%menu.shop.kits.button.diamond\n§835.0K ',
		'textures/items/diamond_chestplate')
	.button('%menu.shop.kits.button.netherite\n§850.0K ',
		'textures/items/netherite_chestplate')
	.button('%menu.common.back')
	pvp_kits.show(player).then(pvp => {
		// Крестик — на уровень вверх
		if (closedByPlayer(pvp)) return shop(player);
		if (pvp.selection == 0) {
			player.runCommandAsync('function shop/pvp_kits/iron')
		} else if (pvp.selection == 1) {
			player.runCommandAsync('function shop/pvp_kits/diamond')
		} else if (pvp.selection == 2) {
			player.runCommandAsync('function shop/pvp_kits/netherite')
		} else if (pvp.selection == 3) {
			shop(player)
		}
	});
}

// --- Бусты ---
function boosts(player) {
	const boosts = new ActionFormData()
	.title('%menu.shop.boosts.title')
	.body('%menu.shop.boosts.body\n\n%menu.shop.boosts.note')
	.button('%menu.shop.boosts.button.x2\n§810.0K ')
	.button('%menu.shop.boosts.button.x4\n§850.0K ')
	.button('%menu.shop.boosts.button.ore_magnet\n§820.0K ')
	.button('%menu.common.back')
	boosts.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return shop(player);
		if (tb.selection == 0) {
			player.runCommandAsync('function boost/X2boost')
		} else if (tb.selection == 1) {
			player.runCommandAsync('function boost/X4boost')
		} else if (tb.selection == 2) {
			// «Магнит руды» — личный, на 5 минут (functions/shop/tp_ore)
			player.runCommandAsync('function shop/tp_ore')
		} else if (tb.selection == 3) {
			shop(player)
		}
	});
}

// --- Настройки ---
function settings(player) {
	const form = new ActionFormData()
	.title('%menu.settings.title')
	.body('%menu.settings.body')
	.button('%menu.settings.button.board',
		'textures/items/sign')
	.button('%menu.settings.button.particles',
		'textures/items/emerald')
	.button('%menu.settings.button.sounds',
		'textures/blocks/noteblock')
	.button('%menu.settings.button.password',
		'textures/ui/icon_lock')
	.button('%menu.common.back')
	form.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return menu(player);
		if (tb.selection == 0) {
			settings_table(player)
		} else if (tb.selection == 1) {
			settings_particle(player)
		} else if (tb.selection == 2) {
			settings_sound(player)
		} else if (tb.selection == 3) {
			ChangePasswordUI(player, () => settings(player))
		} else if (tb.selection == 4) {
			menu(player)
		}
	});
}

// --- Настройки: таблица ---
function settings_table(player) {
    const settings_table = new ActionFormData()
    .title('%menu.settings.board.title')
    .body('%menu.settings.board.body\n\n%menu.settings.default_on\n ')
    .button(' %menu.settings.button.enable')
    .button(' %menu.settings.button.icons_only')
    .button(' %menu.settings.button.disable')
    settings_table.show(player).then(tb => {
    	// Крестик — на уровень вверх
    	if (closedByPlayer(tb)) return settings(player);
        if (tb.selection == 0) {
            player.runCommandAsync('function settings/scoreboard_on');
            tellText(player, '%chat.settings.enabled');
        } else if (tb.selection == 1) {
            player.runCommandAsync('function settings/scoreboard_icons');
            tellText(player, '%chat.settings.icons_only');
        } else if (tb.selection == 2) {
            player.runCommandAsync('function settings/scoreboard_off');
            tellText(player, '%chat.settings.disabled');
        }
    });
}

// --- Настройки: частицы ---
function settings_particle(player) {
    const settings_particle = new ActionFormData()
    .title('%menu.settings.particles.title')
    .body('%menu.settings.particles.body\n\n%menu.settings.default_off\n ')
    .button(' %menu.settings.button.enable')
    .button(' %menu.settings.button.disable')
    settings_particle.show(player).then(tb => {
    	// Крестик — на уровень вверх
    	if (closedByPlayer(tb)) return settings(player);
        if (tb.selection == 0) {
            player.runCommandAsync('tag @s add player:particle');
            tellText(player, '%chat.settings.enabled');
        } else if (tb.selection == 1) {
            player.runCommandAsync('tag @s remove player:particle');
            tellText(player, '%chat.settings.disabled');
        }
    });
}

// --- Настройки: звук ---
function settings_sound(player) {
    const settings_sound = new ActionFormData()
    .title('%menu.settings.sounds.title')
    .body('%menu.settings.sounds.body\n\n%menu.settings.default_off\n ')
    .button(' %menu.settings.button.enable')
    .button(' %menu.settings.button.disable')
    settings_sound.show(player).then(tb => {
    	// Крестик — на уровень вверх
    	if (closedByPlayer(tb)) return settings(player);
        if (tb.selection == 0) {
            player.runCommandAsync('tag @s add player:sound');
            tellText(player, '%chat.settings.enabled');
        } else if (tb.selection == 1) {
            player.runCommandAsync('tag @s remove player:sound');
            tellText(player, '%chat.settings.disabled');
        }
    });
}

// --- Правила ---
function rules(player) {
	const rules = new ActionFormData()
	.title('%menu.rules.title')
	.body('%menu.rules.header\n\n%menu.rules.line.1\n%menu.rules.line.2\n%menu.rules.line.3\n%menu.rules.line.4\n%menu.rules.line.5\n%menu.rules.line.6\n\n%menu.rules.footer')
	.button('%menu.common.back')
	rules.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return menu(player);
		if (tb.selection == 0) {
			menu(player)
		}
	});
}

// --- Промокоды ---
function promocodes(player) {
	const promocodes = new ModalFormData()
	.title('%menu.promo.title')
	.textField('%menu.promo.body\n\n%menu.promo.hint',
		'%menu.promo.placeholder')
	promocodes.show(player).then(r => {
		// Форма закрыта — formValues нет; крестиком — назад в главное меню
		if (!r.formValues) return closedByPlayer(r) ? menu(player) : undefined;

		const enteredCode = r.formValues[0]?.trim();
		if (validatePromoCode(enteredCode, player)) {} else {
			tellText(player, '%chat.promo.error.invalid');
		}
	});
}

// --- Список наград за промокоды ---
const promocodeRewards = {
	"kapycta": {
		scoreboard: "promo1",
		reward: {
			type: "xp", amount: 500
		},
		message: "chat.promo.reward.1"
	},
	"parkour": {
		scoreboard: "promo2",
		reward: {
			type: "money", amount: 500
		},
		message: "chat.promo.reward.2"
	},
	"hellbonus": {
		scoreboard: "promo3",
		reward: {
			type: "xp", amount: 25000
		},
		message: "chat.promo.reward.3"
	},
	"VIPbonus": {
		scoreboard: "promo4",
		reward: {
			type: "money2", amount: 100
		},
		message: "chat.promo.reward.4"
	},
}

/**
 * Проверка и выдача награды за промокод.
 * @param {string} code - Введённый промокод.
 * @param {Player} player - Игрок.
 * @returns {boolean} - true если промокод валиден.
 */
function validatePromoCode(code, player) {
	// Без учёта регистра: «Kapycta» и «vipbonus» тоже подходят
	const key = Object.keys(promocodeRewards).find(k => k.toLowerCase() === String(code ?? '').toLowerCase());
	if (!key) return false;

	const promo = promocodeRewards[key];
	const scoreboard = promo.scoreboard;

	const commandCheck = `execute if score @s ${scoreboard} matches 0`;
	player.runCommandAsync(commandCheck).then(() => {
		const rewardCommand =
		promo.reward.type === "xp"
		? `scoreboard players add @s xp ${promo.reward.amount}`: `scoreboard players add @s ${promo.reward.type} ${promo.reward.amount}`;
		player.runCommandAsync(rewardCommand);
		player.runCommandAsync(`scoreboard players set @s ${scoreboard} 1`);
		player.runCommandAsync(`tellraw @a ${rawTranslate(promo.message, player.name)}`).catch(() => undefined);
	}).catch(() => {
		tellText(player, '%chat.promo.error.used');
	});

	return true;
}

// --- Варпы ---
function warps(player) {
	const warps = new ActionFormData()
	.title('%menu.warps.title')
	.body('%menu.warps.body')
	.button(' %menu.warps.button.spawn')
	.button(' %menu.warps.button.minigames')
	.button('%menu.common.back')
	warps.show(player).then(tp => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tp)) return menu(player);
		// Режим боя на PvP-арене: телепорт из меню тоже недоступен
		if (tp.selection !== undefined && tp.selection < 2 && combatSecondsLeft(player) > 0) {
			player.runCommandAsync(`tellraw @s ${rawTranslate('chat.pvp.combat', combatSecondsLeft(player))}`);
			return;
		}
		if (tp.selection == 0) {
			player.runCommandAsync('tp @s[scores={lvl=1..15}] 0 5 0')
			player.runCommandAsync('tp @s[scores={lvl=16..25}] 0 5 -33')
			player.runCommandAsync('tp @s[scores={lvl=26..26}] -60 5 -60')
		} else if (tp.selection == 1) {
			player.runCommandAsync('tp @s -109 5 -60')
		} else if (tp.selection == 2) {
			menu(player)
		}
	});
}

// --- Улучшения ---
function upgrading(player) {
	const upgrading = new ActionFormData()
	.title('%menu.upgrades.title')
	.body('%menu.upgrades.body')
	.button('%menu.upgrades.button.vip\n§8125.0K ')
	.button('%menu.upgrades.button.rebirth\n§816 - 25 ')
	.button('%menu.common.back')
	upgrading.show(player).then(tb => {
		// Крестик — на уровень вверх
		if (closedByPlayer(tb)) return menu(player);
		if (tb.selection == 0) {
			player.runCommandAsync('function upgrade/upgrade_vip')
		} else if (tb.selection == 1) {
			player.runCommandAsync('function upgrade/upgrade_rebirth')
		} else if (tb.selection == 2) {
			menu(player)
		}
	});
}