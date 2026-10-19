# Конец буста X2Boost: сообщение, сброс табло, снятие тегов, звук.
# было: командный блок (56, 1, 57..53)
execute as @e[name="X2Boost",scores={system=0..0}] run tellraw @a {"rawtext":[{"translate":"chat.boost.x2_end"}]}
scoreboard players reset * display
scoreboard players set scoreboards.map display 0
tag @a remove x2boost
execute positioned as @a run playsound minecraft.tnt.explode @a