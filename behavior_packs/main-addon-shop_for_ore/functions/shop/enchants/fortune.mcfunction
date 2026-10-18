# --- Покупка уровня зачарования «fortune» за 10000 (максимум 3) ---
# Вызывается из меню (Магазин → Зачарования) от имени игрока (@s). Уровень накладывается в timers/t20.
# Раньше можно было платить и сверх максимума: уровни выше 3 ничего не давали.
execute as @s[scores={fortune=3..}] run tellraw @s {"rawtext":[{"translate":"message.shop.enchant.max"}]}
execute as @s[scores={fortune=..2,money=..9999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}
execute as @s[scores={fortune=..2,money=10000..}] run tag @s add buy:ok
scoreboard players remove @s[tag=buy:ok] money 10000
scoreboard players add @s[tag=buy:ok] fortune 1
execute as @s[tag=buy:ok] run tellraw @s {"rawtext":[{"translate":"message.shop.enchant.fortune"}]}
tag @s remove buy:ok