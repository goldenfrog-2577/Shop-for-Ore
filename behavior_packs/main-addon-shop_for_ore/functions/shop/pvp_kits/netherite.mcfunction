# Ошибка: недостаточно денег для покупки незеритового набора
execute as @s[scores={money=0..49999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}

# Выдача незеритовой брони через replaceitem (заменяет текущую броню)
execute as @s[scores={money=50000..}] run replaceitem entity @s slot.armor.head 0 netherite_helmet
execute as @s[scores={money=50000..}] run replaceitem entity @s slot.armor.chest 0 netherite_chestplate
execute as @s[scores={money=50000..}] run replaceitem entity @s slot.armor.legs 0 netherite_leggings
execute as @s[scores={money=50000..}] run replaceitem entity @s slot.armor.feet 0 netherite_boots

# Выдача незеритового меча (оставляем give, так как это не броня)
execute as @s[scores={money=50000..}] run give @s netherite_sword

# Сообщение игроку о покупке набора
execute as @s[scores={money=50000..}] run tellraw @s {"rawtext":[{"translate":"message.shop.kit.netherite"}]}

# Списание денег за набор
execute as @s[scores={money=50000..}] run scoreboard players remove @s money 50000
