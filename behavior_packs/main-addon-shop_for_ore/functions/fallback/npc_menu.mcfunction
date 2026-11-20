# --- Запасное меню: NPC сцен — по одному на сцену (тег npc:<сцена>), раз в секунду из fallback/check ---
# Собирается tools/fallback_menu.py. Нет NPC — барьер под ним и призыв; пока чанк не загружен, призыв не проходит —
# следующая попытка через секунду. Прежний общий NPC (npc:fallback, до отдельных NPC) убирается.
# Перед открытием сцены NPC переносится к игроку (fallback/open, fallback/bring): нажимающий игрок определяется внутри диалога,
# кнопка выполняет действие для @initiator. Без игрока рядом NPC возвращается домой.
kill @e[type=npc,tag=npc:fallback]
execute unless entity @e[type=npc,tag=npc:fb_main] run setblock 0 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_main] run summon minecraft:npc fb_main 0 -60 0
tag @e[type=npc,name=fb_main,tag=!npc:fb_main] add npc:fb_main
execute as @e[type=npc,tag=npc:fb_main] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 0 -60 0
execute unless entity @e[type=npc,tag=npc:fb_about] run setblock 1 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_about] run summon minecraft:npc fb_about 1 -60 0
tag @e[type=npc,name=fb_about,tag=!npc:fb_about] add npc:fb_about
execute as @e[type=npc,tag=npc:fb_about] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 1 -60 0
execute unless entity @e[type=npc,tag=npc:fb_levels] run setblock 2 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_levels] run summon minecraft:npc fb_levels 2 -60 0
tag @e[type=npc,name=fb_levels,tag=!npc:fb_levels] add npc:fb_levels
execute as @e[type=npc,tag=npc:fb_levels] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 2 -60 0
execute unless entity @e[type=npc,tag=npc:fb_howtoplay] run setblock 3 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_howtoplay] run summon minecraft:npc fb_howtoplay 3 -60 0
tag @e[type=npc,name=fb_howtoplay,tag=!npc:fb_howtoplay] add npc:fb_howtoplay
execute as @e[type=npc,tag=npc:fb_howtoplay] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 3 -60 0
execute unless entity @e[type=npc,tag=npc:fb_shop] run setblock 4 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_shop] run summon minecraft:npc fb_shop 4 -60 0
tag @e[type=npc,name=fb_shop,tag=!npc:fb_shop] add npc:fb_shop
execute as @e[type=npc,tag=npc:fb_shop] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 4 -60 0
execute unless entity @e[type=npc,tag=npc:fb_enchants] run setblock 5 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_enchants] run summon minecraft:npc fb_enchants 5 -60 0
tag @e[type=npc,name=fb_enchants,tag=!npc:fb_enchants] add npc:fb_enchants
execute as @e[type=npc,tag=npc:fb_enchants] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 5 -60 0
execute unless entity @e[type=npc,tag=npc:fb_kits] run setblock 6 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_kits] run summon minecraft:npc fb_kits 6 -60 0
tag @e[type=npc,name=fb_kits,tag=!npc:fb_kits] add npc:fb_kits
execute as @e[type=npc,tag=npc:fb_kits] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 6 -60 0
execute unless entity @e[type=npc,tag=npc:fb_boosts] run setblock 7 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_boosts] run summon minecraft:npc fb_boosts 7 -60 0
tag @e[type=npc,name=fb_boosts,tag=!npc:fb_boosts] add npc:fb_boosts
execute as @e[type=npc,tag=npc:fb_boosts] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 7 -60 0
execute unless entity @e[type=npc,tag=npc:fb_settings] run setblock 8 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_settings] run summon minecraft:npc fb_settings 8 -60 0
tag @e[type=npc,name=fb_settings,tag=!npc:fb_settings] add npc:fb_settings
execute as @e[type=npc,tag=npc:fb_settings] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 8 -60 0
execute unless entity @e[type=npc,tag=npc:fb_board] run setblock 9 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_board] run summon minecraft:npc fb_board 9 -60 0
tag @e[type=npc,name=fb_board,tag=!npc:fb_board] add npc:fb_board
execute as @e[type=npc,tag=npc:fb_board] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 9 -60 0
execute unless entity @e[type=npc,tag=npc:fb_particles] run setblock 10 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_particles] run summon minecraft:npc fb_particles 10 -60 0
tag @e[type=npc,name=fb_particles,tag=!npc:fb_particles] add npc:fb_particles
execute as @e[type=npc,tag=npc:fb_particles] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 10 -60 0
execute unless entity @e[type=npc,tag=npc:fb_sounds] run setblock 11 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_sounds] run summon minecraft:npc fb_sounds 11 -60 0
tag @e[type=npc,name=fb_sounds,tag=!npc:fb_sounds] add npc:fb_sounds
execute as @e[type=npc,tag=npc:fb_sounds] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 11 -60 0
execute unless entity @e[type=npc,tag=npc:fb_music] run setblock 12 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_music] run summon minecraft:npc fb_music 12 -60 0
tag @e[type=npc,name=fb_music,tag=!npc:fb_music] add npc:fb_music
execute as @e[type=npc,tag=npc:fb_music] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 12 -60 0
execute unless entity @e[type=npc,tag=npc:fb_rules] run setblock 13 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_rules] run summon minecraft:npc fb_rules 13 -60 0
tag @e[type=npc,name=fb_rules,tag=!npc:fb_rules] add npc:fb_rules
execute as @e[type=npc,tag=npc:fb_rules] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 13 -60 0
execute unless entity @e[type=npc,tag=npc:fb_warps] run setblock 14 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_warps] run summon minecraft:npc fb_warps 14 -60 0
tag @e[type=npc,name=fb_warps,tag=!npc:fb_warps] add npc:fb_warps
execute as @e[type=npc,tag=npc:fb_warps] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 14 -60 0
execute unless entity @e[type=npc,tag=npc:fb_upgrades] run setblock 15 -61 0 barrier
execute unless entity @e[type=npc,tag=npc:fb_upgrades] run summon minecraft:npc fb_upgrades 15 -60 0
tag @e[type=npc,name=fb_upgrades,tag=!npc:fb_upgrades] add npc:fb_upgrades
execute as @e[type=npc,tag=npc:fb_upgrades] at @s unless entity @a[r=6,hasitem={item=minecraft:compass,location=slot.weapon.mainhand}] run tp @s 15 -60 0
