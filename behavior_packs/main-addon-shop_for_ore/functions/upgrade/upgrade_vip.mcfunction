# --- Покупка VIP за 125 000 (с 40 уровня) ---
# VIP — тег player:vip. До Пещеры (третьей локации) VIP был уровнем 26; такие игроки получают тег в scripts/system/migrate.js
# Вызывается из меню (Улучшения) от имени игрока (@s).
# Тег sys:buy_ok отмечает успешную покупку.

# Уже есть VIP
execute as @s[tag=player:vip] run tellraw @s {"rawtext":[{"translate":"chat.vip.error.owned"}]}
execute as @s[tag=player:vip] run function ui/menu_error
# Уровень ниже 40 или не хватает денег
execute as @s[tag=!player:vip,scores={lvl=..39}] run tellraw @s {"rawtext":[{"translate":"chat.vip.error.requirements"}]}
execute as @s[tag=!player:vip,scores={lvl=..39}] run function ui/menu_error
execute as @s[tag=!player:vip,scores={lvl=40..,money=..124999}] run tellraw @s {"rawtext":[{"translate":"chat.vip.error.requirements"}]}
execute as @s[tag=!player:vip,scores={lvl=40..,money=..124999}] run function ui/menu_error

# Покупка
execute as @s[tag=!player:vip,scores={lvl=40..,money=125000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 125000
tag @s[tag=sys:buy_ok] add player:vip
execute as @s[tag=sys:buy_ok] run tellraw @a {"rawtext":[{"translate":"chat.vip.bought","with":{"rawtext":[{"selector":"@s"}]}}]}
execute as @s[tag=sys:buy_ok] run tellraw @s {"rawtext":[{"translate":"chat.vip.welcome"}]}
execute as @s[tag=sys:buy_ok] run function ui/menu_success
tag @s remove sys:buy_ok