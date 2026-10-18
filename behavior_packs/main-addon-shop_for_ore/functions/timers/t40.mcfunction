# Каждые 40 тиков (2 с). Вызывается из system/timers.
scoreboard players set t40 timer 0
# было: командный блок (58, 7, 58)
execute as @e[name="rainEvent",scores={system=1..30}] run execute as @a run execute positioned as @r run structure load "gold_1" ~3~8~2