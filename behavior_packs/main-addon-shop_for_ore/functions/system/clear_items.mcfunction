# Очистка выброшенных предметов (раз в 600 тиков = 30 с), если они есть.
# было: командный блок (56, 3, 57..54)
titleraw @a title {"rawtext":[{"translate":"message.clearItem.title"}]}
titleraw @a subtitle {"rawtext":[{"translate":"message.clearItem.subtitle"},{"score":{"name":"item","objective":"system"}}]}
kill @e[type=item]
scoreboard players set "item" system 0