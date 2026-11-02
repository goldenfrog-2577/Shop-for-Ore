# Конец буста x2_boost: сообщение, сброс табло, снятие тегов, звук.
execute if score boost_x2 system matches 0 run tellraw @a {"rawtext":[{"translate":"chat.boost.x2_end"}]}
scoreboard players reset * display
scoreboard players set scoreboards.map display 0
tag @a remove boost:x2
execute as @a at @s run playsound minecraft.tnt.explode @s