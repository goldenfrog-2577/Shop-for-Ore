# Каждые 6000 тиков (300 с). Вызывается из system/timers.
scoreboard players set t6000 timer 0
# Ивент «Золотой дождь».
# Включить: /scoreboard players set rain settings 1   Выключить: ... 0
execute if score rain settings matches 1 if entity @e[name="rainEvent",scores={system=-1..0}] run function events/rain_start