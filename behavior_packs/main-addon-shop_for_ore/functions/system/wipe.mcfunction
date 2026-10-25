# Сброс всех основных счетчиков и прогресса игроков
scoreboard players reset * money
scoreboard players reset * vip_coins
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
scoreboard players reset * xp_need
scoreboard players reset * magnet
scoreboard players reset * pick
scoreboard players reset * stat_mined
scoreboard players reset * stat_kills
scoreboard players reset * stat_playtime
scoreboard players reset * stat_wins

# Удаление тегов player и rebirth у всех сущностей
tag @e remove player
tag @e remove player:rebirth
tag @e remove boost:magnet

# Достижения (scripts/system/achievements.js) — у игроков в сети; список id — как в ACHIEVEMENTS
tag @e remove stat:paid
tag @e remove ach:welcome
tag @e remove ach:lvl_5
tag @e remove ach:lvl_10
tag @e remove ach:lvl_15
tag @e remove ach:lvl_20
tag @e remove ach:vip
tag @e remove ach:rebirth_1
tag @e remove ach:mined_1k
tag @e remove ach:mined_10k
tag @e remove ach:rich_100k
tag @e remove ach:enchant
tag @e remove ach:cosmetic
tag @e remove ach:pay
tag @e remove ach:pvp_kill
tag @e remove ach:game_win
tag @e remove ach:playtime_1h
tag @e remove ach:rebirth_5
tag @e remove ach:rich_1m
tag @e remove ach:vip_coins_1k
tag @e remove ach:mined_100k
tag @e remove ach:pvp_kills_25
tag @e remove ach:game_wins_10
tag @e remove ach:all_trails
tag @e remove ach:playtime_24h

# Воспроизведение звука и сообщение об успешном вайпе
playsound random.levelup @s
tellraw @s {"rawtext":[{"translate":"chat.server.wiped"}]}