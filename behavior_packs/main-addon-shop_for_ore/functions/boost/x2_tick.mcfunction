# Таймер x2_boost: раз в 20 тиков минус 1 (300 = 5 минут).
scoreboard players remove boost_x2 system 1
# Таймер дошёл до 0 — конец буста
execute if score boost_x2 system matches 0 run function boost/x2_end