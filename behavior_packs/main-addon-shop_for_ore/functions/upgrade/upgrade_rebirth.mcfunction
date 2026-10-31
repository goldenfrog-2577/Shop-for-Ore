# Проверка: если уровень от 1 до 24 — ошибка (недостаточно уровня для перерождения)
execute as @s[scores={lvl=1..24}] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.error.level"}]}

# VIP (тег player:vip) ребитху не мешает: тег после ребитха остаётся

# Максимум 5 ребитхов. Раньше условие было rebirth=0..5: на 5-м ребитхе счётчик становился 6,
# а сброс прогресса и телепорт (условия rebirth=1..5) не срабатывали
execute as @s[scores={lvl=25..40,rebirth=5..}] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.error.max"}]}

# Если уровень 25-40 и rebirth 0-4 — добавить тег rebirth и увеличить счётчик rebirth
execute as @s[scores={lvl=25..40,rebirth=0..4}] run tag @s add sys:rebirth_now
execute as @s[tag=sys:rebirth_now] run tag @s add player:rebirth
scoreboard players add @s[tag=sys:rebirth_now] rebirth 1

# Если только что получен первый rebirth — сообщение всем и звук
execute as @s[tag=sys:rebirth_now,scores={rebirth=1}] run tellraw @a {"rawtext":[{"translate":"chat.rebirth.first","with":{"rawtext":[{"selector":"@s"}]}}]}
execute as @s[tag=sys:rebirth_now,scores={rebirth=1}] positioned as @a run playsound mob.enderdragon.death @a ~~~ 0.7

# Сообщение игроку о текущем уровне rebirth (2 и выше)
execute as @s[tag=sys:rebirth_now] run tellraw @s {"rawtext":[{"translate":"chat.rebirth.level","with":{"rawtext":[{"score":{"name":"@s","objective":"rebirth"}}]}}]}

# Звук для rebirth 2 и выше
execute as @s[tag=sys:rebirth_now,scores={rebirth=2..}] run playsound mob.enderdragon.death @s ~~~ 0.5

# Удаление тега player после перерождения
execute as @s[tag=sys:rebirth_now] run tag @s remove player

# Телепортация игрока после перерождения
execute as @s[tag=sys:rebirth_now] run tp @s 0 5 0
tag @s remove sys:rebirth_now