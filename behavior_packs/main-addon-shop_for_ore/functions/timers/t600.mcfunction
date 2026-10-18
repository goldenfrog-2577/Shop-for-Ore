# Каждые 600 тиков (30 с). Вызывается из system/timers.
scoreboard players set t600 timer 0
# было: командный блок (56, 3, 58). Пока подарок «в игре» (gift system > 0), не чистим
execute if entity @e[type=item] unless score gift system matches 1.. run function system/clear_items