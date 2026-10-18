# Старт «золотого дождя» (раз в 6000 тиков = 5 мин, только если включён rain в settings).
# было: командный блок (56, 4, 58..57)
execute as @e[name="rainEvent",scores={system=-1..0}] run scoreboard players set @e[name="rainEvent"] system 30
execute as @e[name="rainEvent",scores={system=30..30}] run tellraw @a {"rawtext":[{"translate":"message.event.rain_event"}]}