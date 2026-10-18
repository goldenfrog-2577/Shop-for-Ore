# Проверка: если уровень от 1 до 15 — ошибка (недостаточно уровня для перерождения)
execute as @s[scores={lvl=1..15}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.error.2"}]}

# Проверка: если уровень 26 — сообщение о наличии VIP
execute as @s[scores={lvl=26..26}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.haveVIP"}]}

# Если уровень 16-25 и rebirth 0-5 — добавить тег rebirth и увеличить счётчик rebirth
execute as @s[scores={lvl=16..25,rebirth=0..5}] run tag @s add rebirth
execute as @s[scores={lvl=16..25,rebirth=0..5}] run scoreboard players add @s rebirth 1

# Если только что получен первый rebirth — сообщение всем и звук
execute as @s[scores={lvl=16..25,rebirth=1..1}] run tellraw @a {"rawtext":[{"text":" §5"},{"selector":"@s[scores={rebirth=1..1}]"},{"translate":"message.lvlup.rebirth.1"}]}
execute as @s[scores={lvl=16..25,rebirth=1..1}] run execute positioned as @a run playsound mob.enderdragon.death @a ~~~ 0.7

# Сообщение игроку о текущем уровне rebirth (2 и выше)
execute as @s[scores={lvl=16..25,rebirth=1..5}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.rebirth.2"},{"score":{"name":"@s","objective":"rebirth"}}]}

# Звук для rebirth 2 и выше
execute as @s[scores={lvl=16..25,rebirth=2..5}] run playsound mob.enderdragon.death @s ~~~ 0.5

# Удаление тега player после перерождения
execute as @s[scores={lvl=16..25,rebirth=1..5}] run tag @s remove player

# Телепортация игрока после перерождения
execute as @s[scores={lvl=16..25,rebirth=1..5}] run tp @s 0 5 0