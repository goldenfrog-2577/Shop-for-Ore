# Каждые 3600 тиков (180 с). Вызывается из system/timers.
scoreboard players set t3600 timer 0
# Ивент «Ускорение».
# Включить: /scoreboard players set haste settings 1   Выключить: ... 0
execute if score haste settings matches 1 run function events/haste_event