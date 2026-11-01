# --- Запасное меню: открыть сцену, выбранную кнопкой (тег sys:fb_go:<сцена>) ---
# Собирается tools/fallback_menu.py. Вызывается из fallback/open раз в 5 тиков — уже после того, как окно
# с нажатой кнопкой закрылось (сцена, открытая прямо из кнопки, закрывается вместе с ним).
execute as @a[tag=sys:fb_go:fb_main] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_main
tag @a remove sys:fb_go:fb_main
execute as @a[tag=sys:fb_go:fb_about] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_about
tag @a remove sys:fb_go:fb_about
execute as @a[tag=sys:fb_go:fb_levels] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_levels
tag @a remove sys:fb_go:fb_levels
execute as @a[tag=sys:fb_go:fb_howtoplay] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_howtoplay
tag @a remove sys:fb_go:fb_howtoplay
execute as @a[tag=sys:fb_go:fb_shop] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_shop
tag @a remove sys:fb_go:fb_shop
execute as @a[tag=sys:fb_go:fb_enchants] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_enchants
tag @a remove sys:fb_go:fb_enchants
execute as @a[tag=sys:fb_go:fb_kits] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_kits
tag @a remove sys:fb_go:fb_kits
execute as @a[tag=sys:fb_go:fb_boosts] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_boosts
tag @a remove sys:fb_go:fb_boosts
execute as @a[tag=sys:fb_go:fb_settings] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_settings
tag @a remove sys:fb_go:fb_settings
execute as @a[tag=sys:fb_go:fb_board] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_board
tag @a remove sys:fb_go:fb_board
execute as @a[tag=sys:fb_go:fb_particles] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_particles
tag @a remove sys:fb_go:fb_particles
execute as @a[tag=sys:fb_go:fb_sounds] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_sounds
tag @a remove sys:fb_go:fb_sounds
execute as @a[tag=sys:fb_go:fb_music] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_music
tag @a remove sys:fb_go:fb_music
execute as @a[tag=sys:fb_go:fb_rules] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_rules
tag @a remove sys:fb_go:fb_rules
execute as @a[tag=sys:fb_go:fb_warps] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_warps
tag @a remove sys:fb_go:fb_warps
execute as @a[tag=sys:fb_go:fb_upgrades] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_upgrades
tag @a remove sys:fb_go:fb_upgrades
