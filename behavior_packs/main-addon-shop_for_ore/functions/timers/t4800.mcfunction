# Каждые 4800 тиков (4 мин). Вызывается из system/timers.
scoreboard players set t4800 timer 0
# Включить: /scoreboard players set gift settings 1   Выключить: ... 0
execute if score gift settings matches 1 run function events/gift_event