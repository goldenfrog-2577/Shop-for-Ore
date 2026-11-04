# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute as @s[tag=promo:sweethome] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
execute as @s[tag=!promo:sweethome] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:sweethome
execute as @s[tag=sys:promo_ok] run scoreboard players add @s money 1000
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e+1000 §f"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
