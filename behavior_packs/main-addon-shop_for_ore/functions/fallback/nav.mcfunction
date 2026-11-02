# --- Запасное меню: открыть сцену, выбранную кнопкой (теги sys:fb_go_<сцена>) ---
# Собирается tools/fallback_menu.py. Вызывается из timers/ticks_5 для игроков с sys:fb_nav_ready — не раньше
# чем через 5 тиков после нажатия: команда /dialogue open из самой кнопки сцену не открывает (проверено в игре).
# Перед открытием NPC сцены переносится к игроку — иначе кнопки не сработают и не найдут, кто их нажал.
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_main] at @s run tp @e[type=npc,tag=npc:fb_main,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_main] at @s run dialogue open @e[type=npc,tag=npc:fb_main,c=1] @s fb_main
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_about] at @s run tp @e[type=npc,tag=npc:fb_about,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_about] at @s run dialogue open @e[type=npc,tag=npc:fb_about,c=1] @s fb_about
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_levels] at @s run tp @e[type=npc,tag=npc:fb_levels,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_levels] at @s run dialogue open @e[type=npc,tag=npc:fb_levels,c=1] @s fb_levels
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_howtoplay] at @s run tp @e[type=npc,tag=npc:fb_howtoplay,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_howtoplay] at @s run dialogue open @e[type=npc,tag=npc:fb_howtoplay,c=1] @s fb_howtoplay
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_shop] at @s run tp @e[type=npc,tag=npc:fb_shop,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_shop] at @s run dialogue open @e[type=npc,tag=npc:fb_shop,c=1] @s fb_shop
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_enchants] at @s run tp @e[type=npc,tag=npc:fb_enchants,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_enchants] at @s run dialogue open @e[type=npc,tag=npc:fb_enchants,c=1] @s fb_enchants
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_kits] at @s run tp @e[type=npc,tag=npc:fb_kits,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_kits] at @s run dialogue open @e[type=npc,tag=npc:fb_kits,c=1] @s fb_kits
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_boosts] at @s run tp @e[type=npc,tag=npc:fb_boosts,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_boosts] at @s run dialogue open @e[type=npc,tag=npc:fb_boosts,c=1] @s fb_boosts
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_settings] at @s run tp @e[type=npc,tag=npc:fb_settings,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_settings] at @s run dialogue open @e[type=npc,tag=npc:fb_settings,c=1] @s fb_settings
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_board] at @s run tp @e[type=npc,tag=npc:fb_board,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_board] at @s run dialogue open @e[type=npc,tag=npc:fb_board,c=1] @s fb_board
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_particles] at @s run tp @e[type=npc,tag=npc:fb_particles,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_particles] at @s run dialogue open @e[type=npc,tag=npc:fb_particles,c=1] @s fb_particles
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_sounds] at @s run tp @e[type=npc,tag=npc:fb_sounds,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_sounds] at @s run dialogue open @e[type=npc,tag=npc:fb_sounds,c=1] @s fb_sounds
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_music] at @s run tp @e[type=npc,tag=npc:fb_music,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_music] at @s run dialogue open @e[type=npc,tag=npc:fb_music,c=1] @s fb_music
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_rules] at @s run tp @e[type=npc,tag=npc:fb_rules,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_rules] at @s run dialogue open @e[type=npc,tag=npc:fb_rules,c=1] @s fb_rules
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_warps] at @s run tp @e[type=npc,tag=npc:fb_warps,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_warps] at @s run dialogue open @e[type=npc,tag=npc:fb_warps,c=1] @s fb_warps
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_upgrades] at @s run tp @e[type=npc,tag=npc:fb_upgrades,c=1] ~ ~ ~
execute as @a[tag=sys:fb_nav_ready,tag=sys:fb_go_upgrades] at @s run dialogue open @e[type=npc,tag=npc:fb_upgrades,c=1] @s fb_upgrades
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_main
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_about
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_levels
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_howtoplay
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_shop
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_enchants
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_kits
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_boosts
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_settings
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_board
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_particles
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_sounds
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_music
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_rules
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_warps
tag @a[tag=sys:fb_nav_ready] remove sys:fb_go_upgrades
tag @a remove sys:fb_nav_ready
