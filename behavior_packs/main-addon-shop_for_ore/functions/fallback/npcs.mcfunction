# --- Запасное меню: NPC сцен — по одному на сцену (тег npc:<сцена>), раз в секунду из fallback/check ---
# Собирается tools/fallback_menu.py. Нет NPC — барьер под ним и призыв; пока чанк не загружен, призыв не проходит —
# следующая попытка через секунду. Прежний общий NPC (npc:fallback, до отдельных NPC) убирается.
kill @e[type=npc,tag=npc:fallback]
execute unless entity @e[type=npc,tag=npc:fb_main] run setblock 0 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_main] run summon npc 0 -60 0 minecraft:entity_spawned fb_main
tag @e[type=npc,name=fb_main,tag=!npc:fb_main] add npc:fb_main
execute unless entity @e[type=npc,tag=npc:fb_about] run setblock 1 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_about] run summon npc 1 -60 0 minecraft:entity_spawned fb_about
tag @e[type=npc,name=fb_about,tag=!npc:fb_about] add npc:fb_about
execute unless entity @e[type=npc,tag=npc:fb_levels] run setblock 2 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_levels] run summon npc 2 -60 0 minecraft:entity_spawned fb_levels
tag @e[type=npc,name=fb_levels,tag=!npc:fb_levels] add npc:fb_levels
execute unless entity @e[type=npc,tag=npc:fb_howtoplay] run setblock 3 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_howtoplay] run summon npc 3 -60 0 minecraft:entity_spawned fb_howtoplay
tag @e[type=npc,name=fb_howtoplay,tag=!npc:fb_howtoplay] add npc:fb_howtoplay
execute unless entity @e[type=npc,tag=npc:fb_shop] run setblock 4 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_shop] run summon npc 4 -60 0 minecraft:entity_spawned fb_shop
tag @e[type=npc,name=fb_shop,tag=!npc:fb_shop] add npc:fb_shop
execute unless entity @e[type=npc,tag=npc:fb_enchants] run setblock 5 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_enchants] run summon npc 5 -60 0 minecraft:entity_spawned fb_enchants
tag @e[type=npc,name=fb_enchants,tag=!npc:fb_enchants] add npc:fb_enchants
execute unless entity @e[type=npc,tag=npc:fb_kits] run setblock 6 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_kits] run summon npc 6 -60 0 minecraft:entity_spawned fb_kits
tag @e[type=npc,name=fb_kits,tag=!npc:fb_kits] add npc:fb_kits
execute unless entity @e[type=npc,tag=npc:fb_boosts] run setblock 7 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_boosts] run summon npc 7 -60 0 minecraft:entity_spawned fb_boosts
tag @e[type=npc,name=fb_boosts,tag=!npc:fb_boosts] add npc:fb_boosts
execute unless entity @e[type=npc,tag=npc:fb_settings] run setblock 8 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_settings] run summon npc 8 -60 0 minecraft:entity_spawned fb_settings
tag @e[type=npc,name=fb_settings,tag=!npc:fb_settings] add npc:fb_settings
execute unless entity @e[type=npc,tag=npc:fb_board] run setblock 9 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_board] run summon npc 9 -60 0 minecraft:entity_spawned fb_board
tag @e[type=npc,name=fb_board,tag=!npc:fb_board] add npc:fb_board
execute unless entity @e[type=npc,tag=npc:fb_particles] run setblock 10 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_particles] run summon npc 10 -60 0 minecraft:entity_spawned fb_particles
tag @e[type=npc,name=fb_particles,tag=!npc:fb_particles] add npc:fb_particles
execute unless entity @e[type=npc,tag=npc:fb_sounds] run setblock 11 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_sounds] run summon npc 11 -60 0 minecraft:entity_spawned fb_sounds
tag @e[type=npc,name=fb_sounds,tag=!npc:fb_sounds] add npc:fb_sounds
execute unless entity @e[type=npc,tag=npc:fb_music] run setblock 12 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_music] run summon npc 12 -60 0 minecraft:entity_spawned fb_music
tag @e[type=npc,name=fb_music,tag=!npc:fb_music] add npc:fb_music
execute unless entity @e[type=npc,tag=npc:fb_rules] run setblock 13 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_rules] run summon npc 13 -60 0 minecraft:entity_spawned fb_rules
tag @e[type=npc,name=fb_rules,tag=!npc:fb_rules] add npc:fb_rules
execute unless entity @e[type=npc,tag=npc:fb_warps] run setblock 14 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_warps] run summon npc 14 -60 0 minecraft:entity_spawned fb_warps
tag @e[type=npc,name=fb_warps,tag=!npc:fb_warps] add npc:fb_warps
execute unless entity @e[type=npc,tag=npc:fb_upgrades] run setblock 15 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_upgrades] run summon npc 15 -60 0 minecraft:entity_spawned fb_upgrades
tag @e[type=npc,name=fb_upgrades,tag=!npc:fb_upgrades] add npc:fb_upgrades
