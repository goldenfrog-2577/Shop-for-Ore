// --- Главное меню и подменю аддона Shop for Ore ---
// Импортируем необходимые модули
import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';
import { bank } from './bank_menu.js';

// --- Открытие меню при использовании специального предмета ---
world.events.beforeItemUse.subscribe(data => {
	const player = data.source
	if (data.item.typeId == 'server:menu') {
		menu(player)
	}
});

// --- Главное меню ---
export function menu(player) {
	const menu = new ActionFormData()
	.title('%menu.title')
	.body('%menu.body')
	.button('%menu.button.1\n%menu.background')
	.button('%menu.button.2\n%menu.background')
	.button('%menu.button.3\n%menu.background')
	.button('%menu.button.4\n%menu.background')
	.button('%menu.button.5\n%menu.background')
	.button('%menu.button.6\n%menu.background')
	.button('%menu.button.7\n%menu.background')
	.button('%menu.button.8\n%menu.background')
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
	.title('%mapInfo.title')
	.body('%mapInfo.body')
	.button('%mapInfo.button.1')
	.button('%mapInfo.button.2')
	.button('%mapInfo.button.3')
	.button('%mapInfo.button.4')
	.button('%menu.button.back')
	mapInfo.show(player).then(i => {
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
	.title('%lvlsInfo.title')
	.body('%lvlsInfo.body.lvl.1\n%lvlsInfo.body.lvl.2\n%lvlsInfo.body.lvl.3\n%lvlsInfo.body.lvl.4\n%lvlsInfo.body.lvl.5\n%lvlsInfo.body.lvl.6\n%lvlsInfo.body.lvl.7\n%lvlsInfo.body.lvl.8\n%lvlsInfo.body.lvl.9\n%lvlsInfo.body.lvl.10\n%lvlsInfo.body.lvl.11\n%lvlsInfo.body.lvl.12\n%lvlsInfo.body.lvl.13\n%lvlsInfo.body.lvl.14\n%lvlsInfo.body.lvl.15\n%lvlsInfo.body.lvl.16\n%lvlsInfo.body.lvl.17\n%lvlsInfo.body.lvl.18\n%lvlsInfo.body.lvl.19\n%lvlsInfo.body.lvl.20\n%lvlsInfo.body.lvl.21\n%lvlsInfo.body.lvl.22\n%lvlsInfo.body.lvl.23\n%lvlsInfo.body.lvl.24\n%lvlsInfo.body.lvl.25')
	.button('%menu.button.back')
	levelsInfo.show(player).then(tb => {
		if (tb.selection == 0) {
			mapInfo(player)
		}
	});
}

// --- Как играть ---
function howtoplay(player) {
	const howtoplay = new ActionFormData()
	.title('%howtoplay.title')
	.body(' %howtoplay.text.1\n%howtoplay.text.2\n%howtoplay.text.3\n%howtoplay.text.4\n%howtoplay.text.5\n\n %howtoplay.text.6\n%howtoplay.text.7\n%howtoplay.text.8\n%howtoplay.text.9\n\n %howtoplay.text.10\n%howtoplay.text.11\n%howtoplay.text.12\n%howtoplay.text.13\n\n%howtoplay.text.14\n\n%howtoplay.text.15\n\n%howtoplay.text.16\n\n%howtoplay.text.17\n\n%howtoplay.text.18\n\n%howtoplay.text.19\n\n%howtoplay.text.20\n\n%howtoplay.text.21')
	.button('%menu.button.back')
	howtoplay.show(player).then(tb => {
		if (tb.selection == 0) {
			mapInfo(player)
		}
	});
}

// --- Создатели карты ---
function mapCreator(player) {
	const mapCreator = new ActionFormData()
	.title('%mapCreator.title')
	.body('')
	.button('§8Сreator\n§7kapycta1231484',
		'textures/server_icons/creator')
	.button('§6Оmlet Arcade\n§7@waxenjaguar2209',
		'textures/server_icons/omlet')
	.button('§9Discоrd\n§7GoldenFrog#2577',
		'textures/server_icons/discord')
	.button('§3Тelegram\n§7@xdxd1338',
		'textures/server_icons/telegram')
	.button('§2Хbox\n§7kapycta123#1484',
		'textures/server_icons/xbox')
	mapCreator.show(player).then(tb => {
		// Все кнопки возвращают к информации о карте
		mapInfo(player)
	});
}

// --- Версия карты ---
function mapVersion(player) {
	const mapVersion = new ActionFormData()
	.title('%mapVersion.title')
	.body('%mapVersion.text.1\n\n§r§2Vesrion Map:§a 0.1.8_20241222r§r\n%mapVersion.text.2\n\n%mapVersion.text.3\n%mapVersion.text.4\n%mapVersion.text.5\n%mapVersion.text.6\n%mapVersion.text.7\n%mapVersion.text.8\n%mapVersion.text.9\n%mapVersion.text.10\n%mapVersion.text.11\n%mapVersion.text.12')
	.button('%menu.button.back')
	mapVersion.show(player).then(tb => {
		if (tb.selection == 0) {
			mapInfo(player)
		}
	});
}

// --- Магазин ---
function shop(player) {
	const shop = new ActionFormData()
	.title('%shop.title')
	.body('%shop.body')
	.button('%shop.button.1',
		'textures/items/book_enchanted')
	.button('%shop.button.2',
		'textures/items/diamond_chestplate')
	.button('%shop.button.3',
		'textures/items/experience_bottle')
	.button('%menu.button.back')
	shop.show(player).then(tb => {
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

// --- Покупка зачарований ---
function enchants(player) {
	const enchants = new ActionFormData()
	.title('%shop.enchants.title')
	.body('%shop.enchants.body.1\n%shop.enchants.body.2')
	.button('%shop.enchants.button.1\n25.0K ',
		'textures/items/book_enchanted')
	.button('%shop.enchants.button.2\n10.0K ',
		'textures/items/book_enchanted')
	.button('%menu.button.back');
	enchants.show(player).then(tb => {
		if (tb.selection == 0) {
			player.runCommandAsync('function shop/enchants/efficiency');
		} else if (tb.selection == 1) {
			player.runCommandAsync('function shop/enchants/fortune');
		} else if (tb.selection == 2) {
			shop(player);
		}
	});
}

// --- PvP-наборы ---
function pvp_kits(player) {
	const pvp_kits = new ActionFormData()
	.title('%shop.kits.title')
	.body('%shop.kits.body')
	.button('%shop.kits.button.1\n15.0K ',
		'textures/items/iron_chestplate')
	.button('%shop.kits.button.2\n35.0K ',
		'textures/items/diamond_chestplate')
	.button('%shop.kits.button.3\n50.0K ',
		'textures/items/netherite_chestplate')
	.button('%menu.button.back')
	pvp_kits.show(player).then(pvp => {
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
	.title('%shop.boost.title')
	.body('%shop.boost.body.1\n\n%shop.boost.body.2')
	.button('%shop.boost.button.1\n§810.0K ')
	.button('%shop.boost.button.2\n§850.0K ')
	.button('%menu.button.back')
	boosts.show(player).then(tb => {
		if (tb.selection == 0) {
			player.runCommandAsync('function boost/X2boost')
		} else if (tb.selection == 1) {
			player.runCommandAsync('function boost/X4boost')
		} else if (tb.selection == 2) {
			shop(player)
		}
	});
}

// --- Настройки ---
function settings(player) {
	const settings = new ActionFormData()
	.title('%settings.title')
	.body('%settings.body')
	.button('%settingsSelect.button.1',
		'textures/items/sign')
	.button('%settingsSelect.button.2',
		'textures/items/emerald')
	.button('%settingsSelect.button.3',
		'textures/blocks/noteblock')
	.button('%menu.button.back')
	settings.show(player).then(tb => {
		if (tb.selection == 0) {
			settings_table(player)
		} else if (tb.selection == 1) {
			settings_particle(player)
		} else if (tb.selection == 2) {
			settings_sound(player)
		} else if (tb.selection == 3) {
			menu(player)
		}
	});
}

// --- Настройки: таблица ---
function settings_table(player) {
    const settings_table = new ActionFormData()
    .title('%settingsTable.title')
    .body('%settingsTable.body\n\n%settings.default.1\n ')
    .button(' %settings.button.1')
    .button(' %settings.button.3')
    .button(' %settings.button.2')
    settings_table.show(player).then(tb => {
        if (tb.selection == 0) {
            player.runCommandAsync('function settings/scoreboard_on');
            player.tell('%settingsChanged.1');
        } else if (tb.selection == 1) {
            player.runCommandAsync('function settings/scoreboard_icons');
            player.tell('%settingsChanged.3');
        } else if (tb.selection == 2) {
            player.runCommandAsync('function settings/scoreboard_off');
            player.tell('%settingsChanged.2');
        }
    });
}

// --- Настройки: частицы ---
function settings_particle(player) {
    const settings_particle = new ActionFormData()
    .title('%settingsParticle.title')
    .body('%settingsParticle.body\n\n%settings.default.2\n ')
    .button(' %settings.button.1')
    .button(' %settings.button.2')
    settings_particle.show(player).then(tb => {
        if (tb.selection == 0) {
            player.runCommandAsync('tag @s add player:particle');
            player.tell('%settingsChanged.1');
        } else if (tb.selection == 1) {
            player.runCommandAsync('tag @s remove player:particle');
            player.tell('%settingsChanged.2');
        }
    });
}

// --- Настройки: звук ---
function settings_sound(player) {
    const settings_sound = new ActionFormData()
    .title('%settingsSound.title')
    .body('%settingsSound.body\n\n%settings.default.2\n ')
    .button(' %settings.button.1')
    .button(' %settings.button.2')
    settings_sound.show(player).then(tb => {
        if (tb.selection == 0) {
            player.runCommandAsync('tag @s add player:sound');
            player.tell('%settingsChanged.1');
        } else if (tb.selection == 1) {
            player.runCommandAsync('tag @s remove player:sound');
            player.tell('%settingsChanged.2');
        }
    });
}

// --- Правила ---
function rules(player) {
	const rules = new ActionFormData()
	.title('%rules.title')
	.body('%rules.body.1\n\n%rules.text.1\n%rules.text.2\n%rules.text.3\n%rules.text.4\n%rules.text.5\n%rules.text.6\n\n%rules.body.2')
	.button('%menu.button.back')
	rules.show(player).then(tb => {
		if (tb.selection == 0) {
			menu(player)
		}
	});
}

// --- Промокоды ---
function promocodes(player) {
	const promocodes = new ModalFormData()
	.title('%promo.title')
	.textField('%promo.text.1\n\n%promo.text.2',
		'%promo.textField')
	promocodes.show(player).then(r => {
		if (r.isCanceled) return;

		const enteredCode = r.formValues[0]?.trim();
		if (validatePromoCode(enteredCode, player)) {} else {
			player.tell('%message.promo.error');
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
		message: "%message.promo.1"
	},
	"parkour": {
		scoreboard: "promo2",
		reward: {
			type: "money", amount: 500
		},
		message: "%message.promo.2"
	},
	"hellbonus": {
		scoreboard: "promo3",
		reward: {
			type: "xp", amount: 25000
		},
		message: "%message.promo.3"
	},
	"VIPbonus": {
		scoreboard: "promo4",
		reward: {
			type: "money2", amount: 100
		},
		message: "%message.promo.4"
	},
}

/**
 * Проверка и выдача награды за промокод.
 * @param {string} code - Введённый промокод.
 * @param {Player} player - Игрок.
 * @returns {boolean} - true если промокод валиден.
 */
function validatePromoCode(code, player) {
	if (!(code in promocodeRewards)) return false;

	const promo = promocodeRewards[code];
	const scoreboard = promo.scoreboard;

	const commandCheck = `execute if score @s ${scoreboard} matches 0`;
	player.runCommandAsync(commandCheck).then(() => {
		const rewardCommand =
		promo.reward.type === "xp"
		? `scoreboard players add @s xp ${promo.reward.amount}`: `scoreboard players add @s ${promo.reward.type} ${promo.reward.amount}`;
		player.runCommandAsync(rewardCommand);
		player.runCommandAsync(`scoreboard players set @s ${scoreboard} 1`);
		world.say(`§a${player.name} ${promo.message}`);
	}).catch(() => {
		player.tell('%message.promo.activated');
	});

	return true;
}

// --- Варпы ---
function warps(player) {
	const warps = new ActionFormData()
	.title('%warps.title')
	.body('%warps.body')
	.button(' %warps.button.1')
	.button(' %warps.button.2')
	.button('%menu.button.back')
	warps.show(player).then(tp => {
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
	.title('%upgrading.title')
	.body('%upgrading.body')
	.button('%upgrading.button.1\n§8125.0K ')
	.button('%upgrading.button.2\n§816 - 25 ')
	.button('%menu.button.back')
	upgrading.show(player).then(tb => {
		if (tb.selection == 0) {
			player.runCommandAsync('function upgrade/upgrade_vip')
		} else if (tb.selection == 1) {
			player.runCommandAsync('function upgrade/upgrade_rebirth')
		} else if (tb.selection == 2) {
			menu(player)
		}
	});
}
