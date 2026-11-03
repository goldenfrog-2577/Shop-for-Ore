# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute if score @s promo3 matches 1.. run tag @s add promo:hellbonus
execute as @s[tag=promo:hellbonus] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
scoreboard players add @s lvl 0
execute as @s[tag=!promo:hellbonus,scores={lvl=..15}] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.level","with":["16"]}]}
execute as @s[tag=!promo:hellbonus,scores={lvl=16..}] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:hellbonus
execute as @s[tag=sys:promo_ok] run scoreboard players add @s xp 25000
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e+25000 §f"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
