# Резервный путь: переименовать книгу в код строчными буквами и бросить рядом с собой.
# Движок выбирает выброшенный предмет по имени; принимается один вошедший игрок в радиусе двух блоков.
tellraw @a[tag=auth:done,tag=!auth:login,tag=!auth:register,tag=!sys:bot,tag=!role:bot,tag=!sys:promo_hint] {"rawtext":[{"translate":"chat.promo.book.hint"}]}
tag @a[tag=auth:done,tag=!auth:login,tag=!auth:register,tag=!sys:bot,tag=!role:bot,tag=!sys:promo_hint] add sys:promo_hint
execute as @e[type=item,name="kapycta",tag=!sys:promo_checked] at @s run function promo/book_kapycta
execute as @e[type=item,name="parkour",tag=!sys:promo_checked] at @s run function promo/book_parkour
execute as @e[type=item,name="sweethome",tag=!sys:promo_checked] at @s run function promo/book_sweethome
execute as @e[type=item,name="sweetHome",tag=!sys:promo_checked] at @s run function promo/book_sweethome
execute as @e[type=item,name="pvpfighter",tag=!sys:promo_checked] at @s run function promo/book_pvpfighter
execute as @e[type=item,name="pvpFighter",tag=!sys:promo_checked] at @s run function promo/book_pvpfighter
execute as @e[type=item,name="tir",tag=!sys:promo_checked] at @s run function promo/book_tir
execute as @e[type=item,name="hellbonus",tag=!sys:promo_checked] at @s run function promo/book_hellbonus
execute as @e[type=item,name="cavebonus",tag=!sys:promo_checked] at @s run function promo/book_cavebonus
execute as @e[type=item,name="vipbonus",tag=!sys:promo_checked] at @s run function promo/book_vipbonus
execute as @e[type=item,name="VIPbonus",tag=!sys:promo_checked] at @s run function promo/book_vipbonus
