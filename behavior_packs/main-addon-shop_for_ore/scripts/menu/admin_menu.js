// --- Админ-меню для Shop for Ore ---
// Позволяет быстро управлять игровыми функциями через UI

import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';
import { isPending, rawTranslate, hasRole } from '../DataBase.js';

// --- Открытие админ-меню по использованию специального предмета ---
world.events.beforeItemUse.subscribe(data => {
	const player = data.source
	if (data.item.typeId == 'server:admin_menu') {
		// Администратор и владелец (предмет можно получить через /give — тогда роль не даст открыть)
		if (!hasRole(player, 'admin')) return;
		// Сначала вход в аккаунт
		if (isPending(player)) return;
		admin_menu(player)
	}
});

// --- Главное админ-меню ---
function admin_menu(player) {
	const admin_menu = new ActionFormData()
	.title('%admin.main.title')
	.body('%menu.main.body')
	.button('%admin.main.button.gamemode\n%menu.common.tap_to_open', 'textures/ui/heart_new')
	.button('%admin.main.button.time\n%menu.common.tap_to_open', 'textures/ui/time_4sunset')
	.button('%admin.main.button.warps\n%menu.common.tap_to_open', 'textures/ui/World')
	.button('%admin.main.button.effects\n%menu.common.tap_to_open', 'textures/items/potion_bottle_confusion')
	.button('%admin.main.button.tools\n%menu.common.tap_to_open', 'textures/ui/anvil_icon')
	.button('%admin.main.button.announce\n%menu.common.tap_to_open', 'textures/ui/comment')
	.button('%admin.main.button.wipe\n%menu.common.tap_to_open', 'textures/ui/friend_glyph_desaturated')
	.button('%admin.main.button.bot\n%admin.common.tap_to_summon', 'textures/server_icons/bot')
	admin_menu.show(player).then(m => {
		if (m.selection == 0) {
			gamemodes(player)
		} else if (m.selection == 1) {
			timeSet(player)
		} else if (m.selection == 2) {
			warps(player)
		} else if (m.selection == 3) {
			effects(player)
		} else if (m.selection == 4) {
			tools(player)
		} else if (m.selection == 5) {
			sayServer(player)
		} else if (m.selection == 6) {
			// Вайп — только владелец
			if (!hasRole(player, 'owner')) {
				player.runCommandAsync('tellraw @s {"rawtext":[{"translate":"chat.cmd.error.no_permission"}]}')
				return
			}
			wipe(player)
		} else if (m.selection == 7) {
			player.runCommandAsync('function system/spawnbot')
		}
	});
}

// --- Меню смены режима игры и способностей ---
function gamemodes(player) {
	const gamemodes = new ActionFormData()
	.title('%admin.gamemode.title')
	.body('%admin.gamemode.body')
	.button('%admin.gamemode.button.creative', 'textures/ui/heart_new')
	.button('%admin.gamemode.button.adventure', 'textures/ui/absorption_heart')
	.button('%admin.gamemode.button.spectator', 'textures/ui/freeze_heart')
	.button('%admin.gamemode.button.fly', 'textures/items/feather')
	.button('%admin.common.back', 'textures/ui/icon_import')
	gamemodes.show(player).then(gm => {
		if (gm.selection == 0) {
			player.runCommandAsync('gamemode creative')
		} else if (gm.selection == 1) {
			player.runCommandAsync('gamemode adventure')
		} else if (gm.selection == 2) {
			player.runCommandAsync('gamemode spectator')
		} else if (gm.selection == 3) {
			player.runCommandAsync('ability @s mayfly true')
		}
		if (gm.selection == 4) admin_menu(player)
	});
}

// --- Меню смены времени суток ---
function timeSet(player) {
	const timeSet = new ActionFormData()
	.title('%admin.time.title')
	.body('%admin.time.body')
	.button('%admin.time.button.sunrise', 'textures/ui/time_1sunrise')
	.button('%admin.time.button.day', 'textures/ui/time_2day')
	.button('%admin.time.button.noon', 'textures/ui/time_3noon')
	.button('%admin.time.button.sunset', 'textures/ui/time_4sunset')
	.button('%admin.time.button.night', 'textures/ui/time_5night')
	.button('%admin.time.button.midnight', 'textures/ui/time_6midnight')
	.button('%admin.common.back', 'textures/ui/icon_import')
	timeSet.show(player).then(tS => {
		if (tS.selection == 0) {
			player.runCommandAsync('time set sunrise')
		} else if (tS.selection == 1) {
			player.runCommandAsync('time set day')
		} else if (tS.selection == 2) {
			player.runCommandAsync('time set noon')
		} else if (tS.selection == 3) {
			player.runCommandAsync('time set sunset')
		} else if (tS.selection == 4) {
			player.runCommandAsync('time set night')
		} else if (tS.selection == 5) {
			player.runCommandAsync('time set midnight')
		}
		if (tS.selection == 6) admin_menu(player)
	});
}

// --- Меню варпов (телепортаций) ---
function warps(player) {
	const warps = new ActionFormData()
	.title('%admin.warps.title')
	.body('%admin.warps.body')
	.button('%admin.warps.button.mine', 'textures/ui/World')
	.button('%admin.warps.button.vip', 'textures/ui/World')
	.button('%menu.warps.button.minigames', 'textures/ui/World')
	.button('%admin.warps.button.cmd_zone', 'textures/ui/World')
	.button('%admin.warps.button.random_player', 'textures/ui/World')
	.button('%admin.common.back', 'textures/ui/icon_import')
	warps.show(player).then(tp => {
		if (tp.selection == 0) {
			player.runCommandAsync('tp @s 0 5 0')
		} else if (tp.selection == 1) {
			player.runCommandAsync('tp @s -60 5 -60')
		} else if (tp.selection == 2) {
			player.runCommandAsync('tp @s -109 5 -60')
		} else if (tp.selection == 3) {
			player.runCommandAsync('tp @s 50 5 50')
		} else if (tp.selection == 4) {
			player.runCommandAsync('tp @s @r[tag=!host,tag=!role:admin,tag=!role:moder]')
		}
		if (tp.selection == 5) admin_menu(player)
	});
}

// --- Меню эффектов ---
function effects(player) {
	const effects = new ActionFormData()
	.title('%admin.effects.title')
	.body('%admin.effects.body')
	.button('%admin.effects.button.invisibility', 'textures/ui/invisibility_effect')
	.button('%admin.effects.button.resistance', 'textures/ui/resistance_effect')
	.button('%admin.effects.button.strength', 'textures/ui/strength_effect')
	.button('%admin.effects.button.haste', 'textures/ui/haste_effect')
	.button('%admin.effects.button.clear', 'textures/ui/cancel')
	.button('%admin.common.back', 'textures/ui/icon_import')
	effects.show(player).then(tb => {
		if (tb.selection == 0) {
			player.runCommandAsync('effect @s invisibility 3600 255 true')
		} else if (tb.selection == 1) {
			player.runCommandAsync('effect @s resistance 3600 255 true')
		} else if (tb.selection == 2) {
			player.runCommandAsync('effect @s strength 3600 255 true')
		} else if (tb.selection == 3) {
			player.runCommandAsync('effect @s haste 3600 255 true')
		} else if (tb.selection == 4) {
			player.runCommandAsync('effect @s clear')
		}
		if (tb.selection == 5) admin_menu(player)
	});
}

// --- Меню выдачи инструментов и предметов ---
function tools(player) {
	const tools = new ActionFormData()
	.title('%admin.tools.title')
	.body('%admin.tools.body')
	.button('%admin.tools.button.command_block', 'textures/server_icons/command_block')
	.button('%admin.tools.button.allow', 'textures/server_icons/allow')
	.button('%admin.tools.button.deny', 'textures/server_icons/deny')
	.button('%admin.tools.button.structure_block', 'textures/server_icons/structure_block')
	.button('%admin.tools.button.structure_void', 'textures/server_icons/structure_void')
	.button('%admin.tools.button.barrier', 'textures/blocks/barrier')
	.button('%admin.tools.button.border', 'textures/server_icons/border')
	.button('%admin.tools.button.light', 'textures/items/light_block_15')
	.button('%admin.tools.button.npc_egg', 'textures/items/egg_npc')
	.button('%admin.tools.button.hologram_egg', 'textures/items/floating_text')
	.button('%admin.tools.button.admin_stick', 'textures/items/stick')
	.button('%admin.tools.button.clear_inventory', 'textures/ui/cancel')
	.button('%admin.common.back', 'textures/ui/icon_import')
	tools.show(player).then(tb => {
		if (tb.selection == 0) {
			player.runCommandAsync('give @s command_block')
		} else if (tb.selection == 1) {
			player.runCommandAsync('give @s allow')
		} else if (tb.selection == 2) {
			player.runCommandAsync('give @s deny')
		} else if (tb.selection == 3) {
			player.runCommandAsync('give @s structure_block')
		} else if (tb.selection == 4) {
			player.runCommandAsync('give @s structure_void')
		} else if (tb.selection == 5) {
			player.runCommandAsync('give @s barrier')
		} else if (tb.selection == 6) {
			player.runCommandAsync('give @s border_block')
		} else if (tb.selection == 7) {
			player.runCommandAsync('give @s light_block 1 15')
		} else if (tb.selection == 8) {
			player.runCommandAsync('give @s spawn_egg 1 51')
		} else if (tb.selection == 9) {
			player.runCommandAsync('give @s server:floating_text_spawn_egg')
		} else if (tb.selection == 10) {
			player.runCommandAsync('give @s server:admin_stick')
		} else if (tb.selection == 11) {
			player.runCommandAsync('clear @s')
		}
		if (tb.selection == 12) admin_menu(player)
	});
}

// --- Сообщение от сервера ---
function sayServer(player) {
	const sayServer = new ModalFormData()
	.title('%admin.announce.title')
	.textField('%admin.announce.body', '%admin.announce.placeholder')
	sayServer.show(player).then(r => {
		if (!r.formValues) return;
		let message = r.formValues[0]
		player.runCommandAsync(`tellraw @a ${rawTranslate('chat.server.announce', message)}`).catch(() => undefined)
	});
}

// --- Подтверждение вайпа мира ---
function wipe(player) {
	const wipe = new MessageFormData()
	.title(' %admin.wipe.title')
	.body('%admin.wipe.body')
	.button1(' %admin.wipe.button.yes')
	.button2(' %admin.wipe.button.no')
	wipe.show(player).then(tb => {
		if (tb.selection == 1) {
			player.runCommandAsync('function system/wipe')
		} else if (tb.selection == 0) {
			admin_menu(player)
		}
	});
}