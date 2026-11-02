# Конец «золотого дождя»: таймер rain_event дошёл до 0.
execute if score rain_event system matches 0 run tellraw @a {"rawtext":[{"translate":"chat.event.rain_end"}]}
execute if score rain_event system matches 0 run scoreboard players set rain_event system -1
weather clear