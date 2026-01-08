# Ошибка: недостаточно денег для покупки алмазного набора
execute as @s[scores={money=0..34999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}

# Выдача алмазной брони через replaceitem (заменяет текущую броню)
execute as @s[scores={money=35000..}] run replaceitem entity @s slot.armor.head 0 diamond_helmet
execute as @s[scores={money=35000..}] run replaceitem entity @s slot.armor.chest 0 diamond_chestplate
execute as @s[scores={money=35000..}] run replaceitem entity @s slot.armor.legs 0 diamond_leggings
execute as @s[scores={money=35000..}] run replaceitem entity @s slot.armor.feet 0 diamond_boots

# Выдача алмазного меча (оставляем give, так как это не броня)
execute as @s[scores={money=35000..}] run give @s diamond_sword

# Сообщение игроку о покупке набора
execute as @s[scores={money=35000..}] run tellraw @s {"rawtext":[{"translate":"message.shop.kit.diamond"}]}

# Списание денег за набор
execute as @s[scores={money=35000..}] run scoreboard players remove @s money 35000
