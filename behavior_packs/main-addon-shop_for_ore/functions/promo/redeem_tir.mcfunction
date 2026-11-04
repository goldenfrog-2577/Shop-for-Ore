# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute as @s[tag=promo:tir] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
execute as @s[tag=!promo:tir] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:tir
execute as @s[tag=sys:promo_ok] run give @s bow 1
execute as @s[tag=sys:promo_ok] run give @s arrow 16
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e1× §f"},{"translate":"ach.item.bow"},{"text":"§7, "},{"text":"§e16× §f"},{"translate":"ach.item.arrow"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
