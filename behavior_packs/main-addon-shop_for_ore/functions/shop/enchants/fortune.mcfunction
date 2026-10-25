# --- Покупка уровня зачарования «fortune» за 10000 (максимум 3) ---
# Вызывается из меню (Магазин → Зачарования) от имени игрока (@s). Уровень накладывается в timers/ticks_20.
# Раньше можно было платить и сверх максимума: уровни выше 3 ничего не давали.
execute as @s[scores={fortune=3..}] run tellraw @s {"rawtext":[{"translate":"chat.shop.error.enchant_max"}]}
execute as @s[scores={fortune=..2,money=..9999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}
execute as @s[scores={fortune=..2,money=10000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 10000
scoreboard players add @s[tag=sys:buy_ok] fortune 1
execute as @s[tag=sys:buy_ok] run tellraw @s {"rawtext":[{"translate":"chat.shop.enchant.fortune"}]}
tag @s remove sys:buy_ok