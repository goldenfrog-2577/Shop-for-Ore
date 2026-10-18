# Таймер X4BOOST: раз в 20 тиков минус 1 (300 = 5 минут).
# было: командный блок (56, 2, 58)
scoreboard players remove @e[name="X4Boost"] system 1
# Таймер дошёл до 0 — конец буста (условная часть старой цепочки)
execute if entity @e[name="X4Boost",scores={system=0..0}] run function boost/x4_end