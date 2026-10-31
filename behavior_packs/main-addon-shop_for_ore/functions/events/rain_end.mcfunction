# Конец «золотого дождя»: таймер rainEvent дошёл до 0.
execute as @e[name="rainEvent",scores={system=0..0}] run tellraw @a {"rawtext":[{"translate":"chat.event.rain_end"}]}
execute as @e[name="rainEvent",scores={system=0..0}] run scoreboard players set @e[name="rainEvent"] system -1
weather clear