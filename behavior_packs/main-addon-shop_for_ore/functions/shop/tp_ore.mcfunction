# --- Покупка «Магнита руды» за 20 000 на 5 минут (личный, только для купившего) ---
# Вызывается из меню (Магазин → Бусты) от имени игрока (@s).
# Пока действует (табло magnet > 0, тег boost:magnet), выпавшие рядом предметы
# телепортируются к игроку (timers/t5). Время идёт только пока игрок на сервере (timers/t20).
scoreboard players add @s magnet 0
execute as @s[scores={magnet=1..}] run tellraw @s {"rawtext":[{"translate":"chat.ore_magnet.error.active","with":{"rawtext":[{"score":{"name":"@s","objective":"magnet"}}]}}]}
execute as @s[scores={magnet=..0,money=..19999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}
execute as @s[scores={magnet=..0,money=20000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 20000
scoreboard players set @s[tag=sys:buy_ok] magnet 300
tag @s[tag=sys:buy_ok] add boost:magnet
execute as @s[tag=sys:buy_ok] run tellraw @s {"rawtext":[{"translate":"chat.ore_magnet.bought"}]}
execute as @s[tag=sys:buy_ok] at @s run playsound note.bell @s
tag @s remove sys:buy_ok