# --- Ребитх: с 25 уровня, не больше 5 ---
# Вызывается из меню (Улучшения) от имени игрока (@s). VIP-статус и VIP-коины сохраняются.

# Уровень ниже 25
execute as @s[scores={lvl=1..24}] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.error.level"}]}
execute as @s[scores={lvl=1..24}] run function ui/menu_error
# Уже 5 ребитхов
execute as @s[scores={lvl=25..40,rebirth=5..}] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.error.max"}]}
execute as @s[scores={lvl=25..40,rebirth=5..}] run function ui/menu_error

# Ребитх: сброс и начисление выполняются одной функцией.
tag @s remove sys:rebirth_now
execute as @s[scores={lvl=25..40,rebirth=0..4}] run tag @s add sys:rebirth_now
execute as @s[tag=sys:rebirth_now] run tag @s add player:rebirth
# Банк использует золотые слитки как физические монеты.
clear @s[tag=sys:rebirth_now,hasitem={item=gold_ingot}] gold_ingot
scoreboard players set @s[tag=sys:rebirth_now] money 0
scoreboard players set @s[tag=sys:rebirth_now] xp 0
scoreboard players set @s[tag=sys:rebirth_now] lvl 1
scoreboard players set @s[tag=sys:rebirth_now] efficiency 0
scoreboard players set @s[tag=sys:rebirth_now] fortune 0
execute if entity @s[tag=sys:rebirth_now] run function system/xp_need
scoreboard players add @s[tag=sys:rebirth_now] rebirth 1

# Первый ребитх — объявление всем
execute as @s[tag=sys:rebirth_now,scores={rebirth=1}] run tellraw @a {"rawtext":[{"translate":"chat.rebirth.first","with":{"rawtext":[{"selector":"@s"}]}}]}

# Игроку — какой это ребитх по счёту; со второго — звук только ему
execute as @s[tag=sys:rebirth_now] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.level","with":{"rawtext":[{"score":{"name":"@s","objective":"rebirth"}}]}}]}
execute as @s[tag=sys:rebirth_now] run function ui/menu_success

# После сброса — на спавн.
execute as @s[tag=sys:rebirth_now] run tp @s 0 5 0
tag @s remove sys:rebirth_now