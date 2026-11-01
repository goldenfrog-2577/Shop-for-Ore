# --- Запасное меню: открыть сцену, выбранную кнопкой (теги sys:fb_nav и sys:fb_go_<сцена>) ---
# Собирается tools/fallback_menu.py. Вызывается из timers/ticks_5, когда у кого-то есть sys:fb_nav, — уже после того,
# как окно с нажатой кнопкой закрылось (сцена, открытая прямо из кнопки, закрывается вместе с ним).
execute as @a[tag=sys:fb_go_main] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_main
tag @a remove sys:fb_go_main
execute as @a[tag=sys:fb_go_about] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_about
tag @a remove sys:fb_go_about
execute as @a[tag=sys:fb_go_levels] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_levels
tag @a remove sys:fb_go_levels
execute as @a[tag=sys:fb_go_howtoplay] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_howtoplay
tag @a remove sys:fb_go_howtoplay
execute as @a[tag=sys:fb_go_shop] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_shop
tag @a remove sys:fb_go_shop
execute as @a[tag=sys:fb_go_enchants] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_enchants
tag @a remove sys:fb_go_enchants
execute as @a[tag=sys:fb_go_kits] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_kits
tag @a remove sys:fb_go_kits
execute as @a[tag=sys:fb_go_boosts] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_boosts
tag @a remove sys:fb_go_boosts
execute as @a[tag=sys:fb_go_settings] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_settings
tag @a remove sys:fb_go_settings
execute as @a[tag=sys:fb_go_board] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_board
tag @a remove sys:fb_go_board
execute as @a[tag=sys:fb_go_particles] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_particles
tag @a remove sys:fb_go_particles
execute as @a[tag=sys:fb_go_sounds] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_sounds
tag @a remove sys:fb_go_sounds
execute as @a[tag=sys:fb_go_music] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_music
tag @a remove sys:fb_go_music
execute as @a[tag=sys:fb_go_rules] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_rules
tag @a remove sys:fb_go_rules
execute as @a[tag=sys:fb_go_warps] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_warps
tag @a remove sys:fb_go_warps
execute as @a[tag=sys:fb_go_upgrades] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_upgrades
tag @a remove sys:fb_go_upgrades
tag @a remove sys:fb_nav
