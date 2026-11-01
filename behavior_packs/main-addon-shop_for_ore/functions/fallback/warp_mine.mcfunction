# --- Запасное меню → Телепортации → Шахта: шахта уровня игрока (как !warp mine) ---
execute as @s[scores={lvl=..15}] run tp @s 0 5 0
execute as @s[scores={lvl=16..25}] run tp @s 0 5 -33
execute as @s[scores={lvl=26..}] run tp @s 0 5 -69
tellraw @s {"rawtext":[{"translate":"chat.cmd.warp.done","with":{"rawtext":[{"translate":"warp.mine"}]}}]}
