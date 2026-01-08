# Ошибка: недостаточно денег для покупки железного набора
execute as @s[scores={money=0..14999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}

# Выдача железной брони через replaceitem (заменяет текущую броню)
execute as @s[scores={money=15000..}] run replaceitem entity @s slot.armor.head 0 iron_helmet
execute as @s[scores={money=15000..}] run replaceitem entity @s slot.armor.chest 0 iron_chestplate
execute as @s[scores={money=15000..}] run replaceitem entity @s slot.armor.legs 0 iron_leggings
execute as @s[scores={money=15000..}] run replaceitem entity @s slot.armor.feet 0 iron_boots

# Выдача железного меча (оставляем give, так как это не броня)
execute as @s[scores={money=15000..}] run give @s iron_sword

# Сообщение игроку о покупке набора
execute as @s[scores={money=15000..}] run tellraw @s {"rawtext":[{"translate":"message.shop.kit.iron"}]}

# Списание денег за набор
execute as @s[scores={money=15000..}] run scoreboard players remove @s money 15000
