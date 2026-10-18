# --- Покупка «Магнита руды» за 20 000 на 5 минут (личный, только для купившего) ---
# Вызывается из меню (Магазин → Бусты) от имени игрока (@s).
# Пока действует (табло tpore > 0, тег player:tp_ore), выпавшие рядом предметы
# телепортируются к игроку (timers/t5). Время идёт только пока игрок на сервере (timers/t20).
scoreboard players add @s tpore 0
execute as @s[scores={tpore=1..}] run tellraw @s {"rawtext":[{"translate":"message.tp_ore.active","with":{"rawtext":[{"score":{"name":"@s","objective":"tpore"}}]}}]}
execute as @s[scores={tpore=..0,money=..19999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}
execute as @s[scores={tpore=..0,money=20000..}] run tag @s add buy:ok
scoreboard players remove @s[tag=buy:ok] money 20000
scoreboard players set @s[tag=buy:ok] tpore 300
tag @s[tag=buy:ok] add player:tp_ore
execute as @s[tag=buy:ok] run tellraw @s {"rawtext":[{"translate":"message.tp_ore.buy"}]}
execute as @s[tag=buy:ok] at @s run playsound note.bell @s
tag @s remove buy:ok