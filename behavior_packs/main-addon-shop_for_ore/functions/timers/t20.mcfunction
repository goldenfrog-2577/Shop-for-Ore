# Каждые 20 тиков (1 с). Вызывается из system/timers.
scoreboard players set t20 timer 0
# было: командный блок (56, 1, 58) и (56, 2, 58)
execute if entity @e[name="X2Boost",scores={system=1..300}] run function boost/x2_tick
execute if entity @e[name="X4Boost",scores={system=1..300}] run function boost/x4_tick
# было: командный блок (58, 5, 58)
tag @a[tag=!player] add player
# было: командный блок (58, 6, 58)
scoreboard players remove @e[name="rainEvent",scores={system=1..30}] system 1