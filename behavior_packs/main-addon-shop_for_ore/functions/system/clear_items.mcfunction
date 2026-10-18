# Очистка выброшенных предметов (раз в 600 тиков = 30 с), если они есть.
# было: командный блок (56, 3, 57..54)
# Счёт предметов — здесь, перед очисткой (раньше считался каждый тик в system/system)
scoreboard players set "item" system 0
execute as @e[type=item] run scoreboard players add "item" system 1
titleraw @a title {"rawtext":[{"translate":"message.clearItem.title"}]}
titleraw @a subtitle {"rawtext":[{"translate":"message.clearItem.subtitle","with":{"rawtext":[{"score":{"name":"item","objective":"system"}}]}}]}
kill @e[type=item]
scoreboard players set "item" system 0