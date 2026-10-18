# Каждые 40 тиков (2 с). Вызывается из system/timers.
scoreboard players set t40 timer 0
# было: командный блок (58, 7, 58)
# Слиток падает рядом с каждым игроком (раньше — столько раз, сколько игроков, но у случайного)
execute if entity @e[name="rainEvent",scores={system=1..30}] at @a[tag=player] run structure load "gold_1" ~3~8~2