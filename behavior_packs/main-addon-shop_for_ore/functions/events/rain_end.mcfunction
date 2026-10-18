# Конец «золотого дождя»: таймер rainEvent дошёл до 0.
# было: командный блок (56, 4, 56..55)
execute as @e[name="rainEvent",scores={system=0..0}] run tellraw @a {"rawtext":[{"translate":"message.event.rain_event.end"}]}
execute as @e[name="rainEvent",scores={system=0..0}] run scoreboard players set @e[name="rainEvent"] system -1