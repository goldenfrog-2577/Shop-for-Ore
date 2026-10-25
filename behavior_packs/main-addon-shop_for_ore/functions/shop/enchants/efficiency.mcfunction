# --- Покупка уровня зачарования «efficiency» за 25000 (максимум 5) ---
# Вызывается из меню (Магазин → Зачарования) от имени игрока (@s). Уровень накладывается в timers/t20.
# Раньше можно было платить и сверх максимума: уровни выше 5 ничего не давали.
execute as @s[scores={efficiency=5..}] run tellraw @s {"rawtext":[{"translate":"chat.shop.error.enchant_max"}]}
execute as @s[scores={efficiency=..4,money=..24999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}
execute as @s[scores={efficiency=..4,money=25000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 25000
scoreboard players add @s[tag=sys:buy_ok] efficiency 1
execute as @s[tag=sys:buy_ok] run tellraw @s {"rawtext":[{"translate":"chat.shop.enchant.efficiency"}]}
tag @s remove sys:buy_ok