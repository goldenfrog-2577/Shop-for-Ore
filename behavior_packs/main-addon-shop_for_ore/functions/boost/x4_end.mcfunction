# Конец буста X4Boost: сообщение, сброс табло, снятие тегов, звук.
# было: командный блок (56, 2, 57..53)
execute as @e[name="X4Boost",scores={system=0..0}] run tellraw @a {"rawtext":[{"translate":"chat.boost.x4_end"}]}
scoreboard players reset * display
scoreboard players set scoreboards.map display 0
tag @a remove boost:x4
execute positioned as @a run playsound minecraft.tnt.explode @a