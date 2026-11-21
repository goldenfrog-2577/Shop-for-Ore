# --- Запасное меню на NPC: включено ли (раз в секунду, из timers/ticks_20) ---
# Скрипты (scripts/system/core/fallback.js) раз в секунду обнуляют «scripts system», здесь он растёт на 1.
# Не отвечают 5 секунд — меню включается (fallback system = 1); ожили — выключается само.
# Проверка без поломки скриптов: /scoreboard players set fallback_test settings 1 (выключить — 0).
scoreboard players add scripts system 1
scoreboard players add fallback_test settings 0
scoreboard players set fallback system 0
execute if score scripts system matches 5.. run scoreboard players set fallback system 1
execute if score fallback_test settings matches 1.. run scoreboard players set fallback system 1
execute if score fallback system matches 0 run tag @a remove sys:fb_open
execute if score fallback system matches 0 run tag @a remove sys:fb_pre
# Определения custom-предметов ещё недоступны при разборе mcfunction в 26.60.
execute if score fallback system matches 1 as @a[tag=!role:bot,tag=!sys:bot,tag=!auth:login,tag=!auth:register,hasitem={item=compass,quantity=0}] run function fallback/compass
execute if score fallback system matches 0 run tag @a[tag=sys:fb_full] remove sys:fb_full
# Дома NPC не требуют ежесекундного обхода, пока работают скрипты.
# После импорта мира сохранённый счёт fb_area может пережить саму tickingarea.
# Отсутствие главного NPC означает, что требуется загрузить его домашний чанк.
execute if score fallback system matches 1 unless entity @e[type=npc,tag=npc:fb_main] run tickingarea add 0 -60 0 0 -60 0 fallback true
execute if score fallback system matches 1 unless entity @e[type=npc,tag=npc:fb_main] run tickingarea preload fallback true
execute if score fallback system matches 1 run function fallback/npc_menu
execute if score fallback system matches 0 if score fb_active system matches 1 run function fallback/npc_menu
scoreboard players operation fb_active system = fallback system
