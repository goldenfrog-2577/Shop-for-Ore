# Очистка выброшенных предметов (раз в 600 тиков = 30 с), если они есть.
# Сколько предметов убрано — в подзаголовке
scoreboard players set "item" system 0
execute as @e[type=item] run scoreboard players add "item" system 1
titleraw @a title {"rawtext":[{"translate":"screen.clear_items.title"}]}
titleraw @a subtitle {"rawtext":[{"translate":"screen.clear_items.subtitle","with":{"rawtext":[{"score":{"name":"item","objective":"system"}}]}}]}
kill @e[type=item]
scoreboard players set "item" system 0