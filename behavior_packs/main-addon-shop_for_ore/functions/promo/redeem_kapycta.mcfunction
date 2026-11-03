# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute if score @s promo1 matches 1.. run tag @s add promo:kapycta
execute as @s[tag=promo:kapycta] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
execute as @s[tag=!promo:kapycta] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:kapycta
execute as @s[tag=sys:promo_ok] run scoreboard players add @s xp 500
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e+500 §f"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
