# Каждые 600 тиков (30 с). Вызывается из system/timers.
scoreboard players set t600 timer 0
# Очистка выброшенных предметов; пока подарок «в игре» (gift system > 0), не чистим
scoreboard players add gift system 0
execute if entity @e[type=item] if score gift system matches ..0 run function system/clear_items