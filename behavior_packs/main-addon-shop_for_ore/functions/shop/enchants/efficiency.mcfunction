# --- Покупка уровня зачарования «efficiency» за 25000 (максимум 5) ---
# Вызывается из меню (Магазин → Зачарования) от имени игрока (@s). Уровень накладывается в timers/t20.
# Раньше можно было платить и сверх максимума: уровни выше 5 ничего не давали.
execute as @s[scores={efficiency=5..}] run tellraw @s {"rawtext":[{"translate":"message.shop.enchant.max"}]}
execute as @s[scores={efficiency=..4,money=..24999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}
execute as @s[scores={efficiency=..4,money=25000..}] run tag @s add buy:ok
scoreboard players remove @s[tag=buy:ok] money 25000
scoreboard players add @s[tag=buy:ok] efficiency 1
execute as @s[tag=buy:ok] run tellraw @s {"rawtext":[{"translate":"message.shop.enchant.efficiency"}]}
tag @s remove buy:ok