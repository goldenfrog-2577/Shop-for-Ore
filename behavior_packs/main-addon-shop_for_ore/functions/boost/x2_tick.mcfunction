# Таймер x2_boost: раз в 20 тиков минус 1 (300 = 5 минут).
scoreboard players remove @e[name="X2Boost"] system 1
# Таймер дошёл до 0 — конец буста
execute if entity @e[name="X2Boost",scores={system=0..0}] run function boost/x2_end