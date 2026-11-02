# --- Запасное меню на NPC: включено ли (раз в секунду, из timers/ticks_20) ---
# Скрипты (scripts/system/fallback.js) раз в секунду обнуляют «scripts system», здесь он растёт на 1.
# Не отвечают 5 секунд — меню включается (fallback system = 1); ожили — выключается само.
# Проверка без поломки скриптов: /scoreboard players set fallback_test settings 1 (выключить — 0).
scoreboard players add scripts system 1
scoreboard players add fallback_test settings 0
scoreboard players set fallback system 0
execute if score scripts system matches 5.. run scoreboard players set fallback system 1
execute if score fallback_test settings matches 1.. run scoreboard players set fallback system 1
execute if score fallback system matches 0 run tag @a remove sys:fb_open
execute if score fallback system matches 0 run tag @a remove sys:fb_pre
## --- NPC меню: по одному на сцену, всегда на месте (под спавном, в своей ticking area) ---
execute unless score fb_area system matches 1 run tickingarea add 0 -60 0 0 -60 0 fallback
scoreboard players set fb_area system 1
function fallback/npcs
