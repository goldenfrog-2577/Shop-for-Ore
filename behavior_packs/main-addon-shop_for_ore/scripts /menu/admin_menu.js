// --- Админ-меню для Shop for Ore ---
// Позволяет быстро управлять игровыми функциями через UI

import { world } from '@minecraft/server';
import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

// --- Открытие админ-меню по использованию специального предмета ---
world.events.beforeItemUse.subscribe(data => {
	const player = data.source
	if (data.item.typeId == 'server:admin_menu') {
		admin_menu(player)
	}
});

// --- Главное админ-меню ---
function admin_menu(player) {
	const admin_menu = new ActionFormData()
	.title('%admin.menu.title')
	.body('%menu.body')
	.button('%admin.menu.button.1\n%menu.background', 'textures/ui/heart_new')
	.button('%admin.menu.button.2\n%menu.background', 'textures/ui/time_4sunset')
	.button('%admin.menu.button.3\n%menu.background', 'textures/ui/World')
	.button('%admin.menu.button.4\n%menu.background', 'textures/items/potion_bottle_confusion')
	.button('%admin.menu.button.5\n%menu.background', 'textures/ui/anvil_icon')
	.button('%admin.menu.button.6\n%menu.background', 'textures/ui/comment')
	.button('%admin.menu.button.7\n%menu.background', 'textures/ui/friend_glyph_desaturated')
	.button('%admin.menu.button.8\n%admin.menu.background.2', 'textures/server_icons/bot')
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
			wipe(player)
		} else if (m.selection == 7) {
			player.runCommandAsync('function system/spawnbot')
		}
	});
}

// --- Меню смены режима игры и способностей ---
function gamemodes(player) {
	const gamemodes = new ActionFormData()
	.title('%gm.title')
	.body('%gm.body')
	.button('%gm.button.1', 'textures/ui/heart_new')
	.button('%gm.button.2', 'textures/ui/absorption_heart')
	.button('%gm.button.3', 'textures/ui/freeze_heart')
	.button('%gm.button.4', 'textures/items/feather')
	.button('%admin.menu.button.back', 'textures/ui/icon_import')
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
	.title('%timeSet.title')
	.body('%timeSet.body')
	.button('%timeSet.button.1', 'textures/ui/time_1sunrise')
	.button('%timeSet.button.2', 'textures/ui/time_2day')
	.button('%timeSet.button.3', 'textures/ui/time_3noon')
	.button('%timeSet.button.4', 'textures/ui/time_4sunset')
	.button('%timeSet.button.5', 'textures/ui/time_5night')
	.button('%timeSet.button.6', 'textures/ui/time_6midnight')
	.button('%admin.menu.button.back', 'textures/ui/icon_import')
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
	.title('%warp.title')
	.body('%warp.body')
	.button('%warp.button.1', 'textures/ui/World')
	.button('%warp.button.2', 'textures/ui/World')
	.button('%warps.button.2', 'textures/ui/World')
	.button('%warp.button.3', 'textures/ui/World')
	.button('%warp.button.4', 'textures/ui/World')
	.button('%admin.menu.button.back', 'textures/ui/icon_import')
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
			player.runCommandAsync('tp @s @r[tag=!host]')
		}
		if (tp.selection == 5) admin_menu(player)
	});
}

// --- Меню эффектов ---
function effects(player) {
	const effects = new ActionFormData()
	.title('%effects.title')
	.body('%effects.body')
	.button('%effects.button.1', 'textures/ui/invisibility_effect')
	.button('%effects.button.2', 'textures/ui/resistance_effect')
	.button('%effects.button.3', 'textures/ui/strength_effect')
	.button('%effects.button.4', 'textures/ui/haste_effect')
	.button('%effects.button.5', 'textures/ui/cancel')
	.button('%admin.menu.button.back', 'textures/ui/icon_import')
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
	.title('%tools.title')
	.body('%tools.body')
	.button('%tools.button.1', 'textures/server_icons/command_block')
	.button('%tools.button.2', 'textures/server_icons/allow')
	.button('%tools.button.3', 'textures/server_icons/deny')
	.button('%tools.button.4', 'textures/server_icons/structure_block')
	.button('%tools.button.5', 'textures/server_icons/structure_void')
	.button('%tools.button.6', 'textures/blocks/barrier')
	.button('%tools.button.7', 'textures/server_icons/border')
	.button('%tools.button.8', 'textures/items/light_block_15')
	.button('%tools.button.9', 'textures/items/egg_npc')
	.button('%tools.button.10', 'textures/items/floating_text')
	.button('%tools.button.11', 'textures/items/stick')
	.button('%tools.button.12', 'textures/ui/cancel')
	.button('%admin.menu.button.back', 'textures/ui/icon_import')
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
	.title('%sayServer.title')
	.textField('%sayServer.body', '%sayServer.textField')
	sayServer.show(player).then(r => {
		let message = r.formValues[0]
		world.say(`%sayServer.message ${message}`)
	});
}

// --- Подтверждение вайпа мира ---
function wipe(player) {
	const wipe = new MessageFormData()
	.title(' %wipe.title')
	.body('%wipe.body')
	.button1(' %wipe.button.1')
	.button2(' %wipe.button.2')
	wipe.show(player).then(tb => {
		if (tb.selection == 1) {
			player.runCommandAsync('function system/wipe')
		} else if (tb.selection == 0) {
			admin_menu(player)
		}
	});
}
