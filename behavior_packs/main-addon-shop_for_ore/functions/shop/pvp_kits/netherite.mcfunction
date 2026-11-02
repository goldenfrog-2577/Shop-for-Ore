# --- PvP-набор «незеритовый» за 50000 ---
# Вызывается из меню (Магазин → PvP-наборы) от имени игрока (@s). Тег sys:buy_ok — покупка прошла.
# Броня надевается только в пустой слот (replaceitem … keep), чтобы не затереть надетое — броню
# с купленными зачарованиями или голову из лавки торговца. Слот занят — предмет набора кладётся в инвентарь.
# Слот проверяем по самому предмету набора: был в слоте до покупки (sys:kit_had) или не встал после неё —
# значит, слот занят, и предмет выдаётся через give.
execute as @s[scores={money=..49999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}
tag @s[scores={money=50000..}] add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 50000

tag @s[tag=sys:buy_ok,hasitem={item=netherite_helmet,location=slot.armor.head}] add sys:kit_had
execute as @s[tag=sys:buy_ok] run replaceitem entity @s slot.armor.head 0 keep netherite_helmet
give @s[tag=sys:buy_ok,tag=sys:kit_had] netherite_helmet
give @s[tag=sys:buy_ok,tag=!sys:kit_had,hasitem={item=netherite_helmet,location=slot.armor.head,quantity=0}] netherite_helmet
tag @s remove sys:kit_had

tag @s[tag=sys:buy_ok,hasitem={item=netherite_chestplate,location=slot.armor.chest}] add sys:kit_had
execute as @s[tag=sys:buy_ok] run replaceitem entity @s slot.armor.chest 0 keep netherite_chestplate
give @s[tag=sys:buy_ok,tag=sys:kit_had] netherite_chestplate
give @s[tag=sys:buy_ok,tag=!sys:kit_had,hasitem={item=netherite_chestplate,location=slot.armor.chest,quantity=0}] netherite_chestplate
tag @s remove sys:kit_had

tag @s[tag=sys:buy_ok,hasitem={item=netherite_leggings,location=slot.armor.legs}] add sys:kit_had
execute as @s[tag=sys:buy_ok] run replaceitem entity @s slot.armor.legs 0 keep netherite_leggings
give @s[tag=sys:buy_ok,tag=sys:kit_had] netherite_leggings
give @s[tag=sys:buy_ok,tag=!sys:kit_had,hasitem={item=netherite_leggings,location=slot.armor.legs,quantity=0}] netherite_leggings
tag @s remove sys:kit_had

tag @s[tag=sys:buy_ok,hasitem={item=netherite_boots,location=slot.armor.feet}] add sys:kit_had
execute as @s[tag=sys:buy_ok] run replaceitem entity @s slot.armor.feet 0 keep netherite_boots
give @s[tag=sys:buy_ok,tag=sys:kit_had] netherite_boots
give @s[tag=sys:buy_ok,tag=!sys:kit_had,hasitem={item=netherite_boots,location=slot.armor.feet,quantity=0}] netherite_boots
tag @s remove sys:kit_had

give @s[tag=sys:buy_ok] netherite_sword
execute as @s[tag=sys:buy_ok] run tellraw @s {"rawtext":[{"translate":"chat.shop.kit.netherite"}]}
tag @s remove sys:buy_ok