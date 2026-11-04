# Для одного выброшенного предмета; обработчик не выбирает игрока при неоднозначности.
scoreboard players set promo_claimants system 0
execute as @a[r=2,tag=auth:done,tag=!auth:login,tag=!auth:register,tag=!sys:bot,tag=!role:bot] run scoreboard players add promo_claimants system 1
scoreboard players set promo_book_result system 0
execute if score promo_claimants system matches 1 as @p[r=2,tag=auth:done,tag=!auth:login,tag=!auth:register,tag=!sys:bot,tag=!role:bot] run function promo/redeem_sweethome
execute if score promo_claimants system matches 1 run tag @s[type=item] add sys:promo_checked
execute if score promo_book_result system matches 1 run kill @s[type=item,tag=sys:promo_checked]
