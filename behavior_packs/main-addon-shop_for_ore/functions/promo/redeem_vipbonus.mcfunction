# Общая с JS отметка использования ставится до выдачи награды.
tag @s remove sys:promo_ok
execute if score @s promo4 matches 1.. run tag @s add promo:vipbonus
execute as @s[tag=promo:vipbonus] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.used"}]}
execute as @s[tag=!promo:vipbonus,tag=!player:vip] run tellraw @s {"rawtext":[{"translate":"chat.promo.error.vip"}]}
execute as @s[tag=!promo:vipbonus,tag=player:vip] run tag @s add sys:promo_ok
execute as @s[tag=sys:promo_ok] run tag @s add promo:vipbonus
execute as @s[tag=sys:promo_ok] run scoreboard players add @s vip_coins 100
execute as @s[tag=sys:promo_ok] run tellraw @a {"rawtext":[{"translate":"chat.promo.reward","with":{"rawtext":[{"selector":"@s"},{"rawtext":[{"text":"§e+100 §f"}]}]}}]}
execute as @s[tag=sys:promo_ok] run function ui/menu_success
execute as @s[tag=sys:promo_ok] run scoreboard players set promo_book_result system 1
execute as @s[tag=!sys:promo_ok] run function ui/menu_error
tag @s remove sys:promo_ok
