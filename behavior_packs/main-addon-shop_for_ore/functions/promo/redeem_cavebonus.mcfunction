# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute as @s[tag=promo:cavebonus] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
scoreboard players add @s lvl 0
execute as @s[tag=!promo:cavebonus,scores={lvl=..25}] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.level","with":["26"]}]}
execute as @s[tag=!promo:cavebonus,scores={lvl=26..}] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:cavebonus
execute as @s[tag=sys:promo_ok] run scoreboard players add @s xp 50000
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e+50000 §f"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
