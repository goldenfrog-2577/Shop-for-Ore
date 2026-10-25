# --- Покупка уровня зачарования «efficiency» за 25000 (максимум 5) ---
# Вызывается из меню (Магазин → Зачарования) от имени игрока (@s). Уровень накладывается в timers/ticks_20.
# Раньше можно было платить и сверх максимума: уровни выше 5 ничего не давали.
# Палка (уровень 1) — не кирка: зачаровывать нечего, нужна хотя бы деревянная (уровень 2)
execute as @s[scores={lvl=..1}] run tellraw @s {"rawtext":[{"translate":"chat.shop.enchant.error.stick"}]}
execute as @s[scores={lvl=2..,efficiency=5..}] run tellraw @s {"rawtext":[{"translate":"chat.shop.error.enchant_max"}]}
execute as @s[scores={lvl=2..,efficiency=..4,money=..24999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}
execute as @s[scores={lvl=2..,efficiency=..4,money=25000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 25000
scoreboard players add @s[tag=sys:buy_ok] efficiency 1
execute as @s[tag=sys:buy_ok] run tellraw @s {"rawtext":[{"translate":"chat.shop.enchant.efficiency"}]}
tag @s remove sys:buy_ok