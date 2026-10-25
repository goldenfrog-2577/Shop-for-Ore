# Каждые 80 тиков (4 с). Вызывается из system/timers.
scoreboard players set t80 timer 0
# было: командный блок (58, 8, 58)
# Слиток падает рядом с каждым игроком (раньше — столько раз, сколько игроков, но у случайного)
execute if entity @e[name="rainEvent",scores={system=1..30}] at @a[tag=player] run structure load "gold_2" ~-2~8~-3