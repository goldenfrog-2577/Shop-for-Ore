# Проверка: если уровень от 1 до 15 — ошибка (недостаточно уровня для перерождения)
execute as @s[scores={lvl=1..15}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.error.2"}]}

# Проверка: если уровень 26 — сообщение о наличии VIP
execute as @s[scores={lvl=26..26}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.haveVIP"}]}

# Максимум 5 ребитхов. Раньше условие было rebirth=0..5: на 5-м ребитхе счётчик становился 6,
# а сброс прогресса и телепорт (условия rebirth=1..5) не срабатывали
execute as @s[scores={lvl=16..25,rebirth=5..}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.rebirth.max"}]}

# Если уровень 16-25 и rebirth 0-4 — добавить тег rebirth и увеличить счётчик rebirth
execute as @s[scores={lvl=16..25,rebirth=0..4}] run tag @s add rebirth:now
execute as @s[tag=rebirth:now] run tag @s add rebirth
scoreboard players add @s[tag=rebirth:now] rebirth 1

# Если только что получен первый rebirth — сообщение всем и звук
execute as @s[tag=rebirth:now,scores={rebirth=1}] run tellraw @a {"rawtext":[{"text":" §5"},{"selector":"@s"},{"translate":"message.lvlup.rebirth.1"}]}
execute as @s[tag=rebirth:now,scores={rebirth=1}] positioned as @a run playsound mob.enderdragon.death @a ~~~ 0.7

# Сообщение игроку о текущем уровне rebirth (2 и выше)
execute as @s[tag=rebirth:now] run tellraw @s {"rawtext":[{"translate":"message.lvlup.rebirth.2"},{"score":{"name":"@s","objective":"rebirth"}}]}

# Звук для rebirth 2 и выше
execute as @s[tag=rebirth:now,scores={rebirth=2..}] run playsound mob.enderdragon.death @s ~~~ 0.5

# Удаление тега player после перерождения
execute as @s[tag=rebirth:now] run tag @s remove player

# Телепортация игрока после перерождения
execute as @s[tag=rebirth:now] run tp @s 0 5 0
tag @s remove rebirth:now