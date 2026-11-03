# --- x4_boost: покупка и активация буста x4 (общий для всех игроков, 5 минут) ---
# Вызывается из меню (Магазин → Бусты) от имени игрока (@s).
# Тег sys:buy_ok отмечает успешную покупку: деньги списываются только вместе с выдачей буста.

tag @s remove sys:buy_ok
execute if score stand_timers_migrated system matches 0 run tellraw @s {"rawtext":[{"translate":"chat.boost.error.loading"}]}
execute if score stand_timers_migrated system matches 0 run function ui/menu_error
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches 1.. run tellraw @s {"rawtext":[{"translate":"chat.boost.error.active"}]}
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches 1.. run function ui/menu_error
execute if score stand_timers_migrated system matches 1 if score boost_x4 system matches 1.. run tellraw @s {"rawtext":[{"translate":"chat.boost.error.active"}]}
execute if score stand_timers_migrated system matches 1 if score boost_x4 system matches 1.. run function ui/menu_error
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches ..0 if score boost_x4 system matches ..0 as @s[scores={money=..49999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches ..0 if score boost_x4 system matches ..0 as @s[scores={money=..49999}] run function ui/menu_error
# Покупка
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches ..0 if score boost_x4 system matches ..0 as @s[scores={money=50000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 50000
execute as @s[tag=sys:buy_ok] as @a at @s run playsound note.bell @s[tag=!player:menu_success_off]
execute as @s[tag=sys:buy_ok] run scoreboard players set scoreboards.x4boost display 0
execute as @s[tag=sys:buy_ok] run tellraw @a {"rawtext":[{"translate":"chat.boost.x4","with":{"rawtext":[{"selector":"@s"}]}}]}
execute as @s[tag=sys:buy_ok] run scoreboard players set boost_x4 system 300
# Тег буста получают все онлайн; зашедшим позже его выдаёт timers/ticks_20, пока таймер boost_x4 идёт
execute as @s[tag=sys:buy_ok] run tag @a add boost:x4
tag @s remove sys:buy_ok
