# Конец буста x4_boost: сообщение, сброс табло, снятие тегов, звук.
# было: командный блок (56, 2, 57..53)
execute as @e[name="X4Boost",scores={system=0..0}] run tellraw @a {"rawtext":[{"translate":"chat.boost.x4_end"}]}
scoreboard players reset * display
scoreboard players set scoreboards.map display 0
tag @a remove boost:x4
execute as @a at @s run playsound minecraft.tnt.explode @s