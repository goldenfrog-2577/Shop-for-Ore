# Старт «золотого дождя» на 30 с (раз в 6000 тиков = 5 мин, только если включён rain в settings).
execute if score stand_timers_migrated system matches 1 if score rain_event system matches -1..0 run scoreboard players set rain_event system 30
execute if score stand_timers_migrated system matches 1 if score rain_event system matches 30 run tellraw @a {"rawtext":[{"translate":"chat.event.rain"}]}
execute if score stand_timers_migrated system matches 1 if score rain_event system matches 1..30 run weather rain