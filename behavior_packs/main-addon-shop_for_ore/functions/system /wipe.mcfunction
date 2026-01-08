# Сброс всех основных счетчиков и прогресса игроков
scoreboard players reset * money
scoreboard players reset * money2
scoreboard players reset * lvl
scoreboard players reset * xp
scoreboard players reset * rebirth
scoreboard players reset * online
scoreboard players reset * efficiency
scoreboard players reset * fortune
scoreboard players reset * promo1
scoreboard players reset * promo2
scoreboard players reset * promo3
scoreboard players reset * promo4
scoreboard players reset * qx
scoreboard players reset * ticks

# Удаление тегов player и rebirth у всех сущностей
tag @e remove player
tag @e remove rebirth

# Воспроизведение звука и сообщение об успешном вайпе
playsound random.levelup @s
tellraw @s {"rawtext":[{"translate":"wipe.message.success"}]}
