# --- Ребитх: с 25 уровня, не больше 5 ---
# Вызывается из меню (Улучшения) от имени игрока (@s). Снимает тег player — прогресс сбрасывает system/system,
# остаются VIP (тег player:vip), VIP-коины и тег player:rebirth. Тег sys:rebirth_now — ребитх прошёл.

# Уровень ниже 25
execute as @s[scores={lvl=1..24}] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.error.level"}]}
# Уже 5 ребитхов
execute as @s[scores={lvl=25..40,rebirth=5..}] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.error.max"}]}

# Ребитх: +1 к счётчику, тег player:rebirth (ребитх был хотя бы раз)
execute as @s[scores={lvl=25..40,rebirth=0..4}] run tag @s add sys:rebirth_now
execute as @s[tag=sys:rebirth_now] run tag @s add player:rebirth
scoreboard players add @s[tag=sys:rebirth_now] rebirth 1

# Первый ребитх — объявление всем
execute as @s[tag=sys:rebirth_now,scores={rebirth=1}] run tellraw @a {"rawtext":[{"translate":"chat.rebirth.first","with":{"rawtext":[{"selector":"@s"}]}}]}
execute as @s[tag=sys:rebirth_now,scores={rebirth=1}] as @a at @s run playsound mob.enderdragon.death @s ~~~ 0.7

# Игроку — какой это ребитх по счёту; со второго — звук только ему
execute as @s[tag=sys:rebirth_now] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.level","with":{"rawtext":[{"score":{"name":"@s","objective":"rebirth"}}]}}]}
execute as @s[tag=sys:rebirth_now,scores={rebirth=2..}] run playsound mob.enderdragon.death @s ~~~ 0.5

# Без тега player system/system сбросит прогресс (как новичку), затем — на спавн
execute as @s[tag=sys:rebirth_now] run tag @s remove player
execute as @s[tag=sys:rebirth_now] run tp @s 0 5 0
tag @s remove sys:rebirth_now