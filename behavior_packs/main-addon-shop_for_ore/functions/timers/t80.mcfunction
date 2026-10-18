# Каждые 80 тиков (4 с). Вызывается из system/timers.
scoreboard players set t80 timer 0
# было: командный блок (58, 8, 58)
execute as @e[name="rainEvent",scores={system=1..30}] run execute as @a run execute positioned as @r run structure load "gold_2" ~-2~8~-3