# --- Запасное меню: NPC сцены, выбранной кнопкой, — к игроку (за 5 тиков до fallback/nav) ---
# Собирается tools/fallback_menu.py. Вызывается из timers/ticks_5 для игроков с sys:fb_nav: окно NPC,
# перенесённого издалека в тот же тик, кнопкам не отвечает (проверено в игре).
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_main] at @s run tp @e[type=npc,tag=npc:fb_main,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_about] at @s run tp @e[type=npc,tag=npc:fb_about,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_levels] at @s run tp @e[type=npc,tag=npc:fb_levels,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_howtoplay] at @s run tp @e[type=npc,tag=npc:fb_howtoplay,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_shop] at @s run tp @e[type=npc,tag=npc:fb_shop,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_enchants] at @s run tp @e[type=npc,tag=npc:fb_enchants,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_kits] at @s run tp @e[type=npc,tag=npc:fb_kits,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_boosts] at @s run tp @e[type=npc,tag=npc:fb_boosts,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_settings] at @s run tp @e[type=npc,tag=npc:fb_settings,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_board] at @s run tp @e[type=npc,tag=npc:fb_board,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_particles] at @s run tp @e[type=npc,tag=npc:fb_particles,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_sounds] at @s run tp @e[type=npc,tag=npc:fb_sounds,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_music] at @s run tp @e[type=npc,tag=npc:fb_music,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_rules] at @s run tp @e[type=npc,tag=npc:fb_rules,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_warps] at @s run tp @e[type=npc,tag=npc:fb_warps,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav,tag=sys:fb_go_upgrades] at @s run tp @e[type=npc,tag=npc:fb_upgrades,c=1] ~ ~ ~
