# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute as @s[tag=promo:pvpfighter] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
execute as @s[tag=!promo:pvpfighter] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:pvpfighter
execute as @s[tag=sys:promo_ok] run give @s golden_apple 4
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e4× §f"},{"translate":"ach.item.golden_apple"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
