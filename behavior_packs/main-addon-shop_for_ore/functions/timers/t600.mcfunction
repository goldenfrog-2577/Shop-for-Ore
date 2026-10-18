# Каждые 600 тиков (30 с). Вызывается из system/timers.
scoreboard players set t600 timer 0
# было: командный блок (56, 3, 58)
execute if entity @e[type=item] run function system/clear_items