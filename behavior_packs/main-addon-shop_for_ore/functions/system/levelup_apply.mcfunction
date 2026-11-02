# Вызывается из system/levelup_check для одного игрока (@s), который может повыситься.
# Сообщения, титры и звуки — те же, что были в командных блоках, для каждого уровня.
# Сначала эффекты по текущему уровню, затем списание опыта и +1 уровень.

# 1 -> 2 (нужно 100 опыта)
execute if score @s lvl matches 1 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.2","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 1 run title @s title 1 §7>>§f 2
execute if score @s lvl matches 1 run execute as @a at @s run playsound random.levelup @s
# 2 -> 3 (нужно 125 опыта)
execute if score @s lvl matches 2 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.3","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 2 run title @s title 2 §7>>§f 3
execute if score @s lvl matches 2 run execute as @a at @s run playsound random.orb @s
# 3 -> 4 (нужно 250 опыта)
execute if score @s lvl matches 3 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.4","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 3 run title @s title 3 §7>>§f 4
execute if score @s lvl matches 3 run execute as @a at @s run playsound random.orb @s
# 4 -> 5 (нужно 600 опыта)
execute if score @s lvl matches 4 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.5","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 4 run title @s title 4 §7>>§f 5
execute if score @s lvl matches 4 run execute as @a at @s run playsound random.orb @s
# 5 -> 6 (нужно 1200 опыта)
execute if score @s lvl matches 5 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.6","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 5 run title @s title 5 §7>>§f 6
execute if score @s lvl matches 5 run execute as @a at @s run playsound random.orb @s
# 6 -> 7 (нужно 2600 опыта)
execute if score @s lvl matches 6 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.7","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 6 run title @s title 6 §7>>§f 7
execute if score @s lvl matches 6 run execute as @a at @s run playsound random.orb @s
# 7 -> 8 (нужно 3200 опыта)
execute if score @s lvl matches 7 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.8","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 7 run title @s title 7 §7>>§f 8
execute if score @s lvl matches 7 run execute as @a at @s run playsound random.levelup @s
# 8 -> 9 (нужно 5000 опыта)
execute if score @s lvl matches 8 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.9","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 8 run title @s title 8 §7>>§f 9
execute if score @s lvl matches 8 run execute as @a at @s run playsound random.orb @s
# 9 -> 10 (нужно 6600 опыта)
execute if score @s lvl matches 9 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.10","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 9 run title @s title 9 §7>>§f 10
execute if score @s lvl matches 9 run execute as @a at @s run playsound random.orb @s
# 10 -> 11 (нужно 7500 опыта)
execute if score @s lvl matches 10 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.11","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 10 run title @s title 10 §7>>§f 11
execute if score @s lvl matches 10 run execute as @a at @s run playsound random.orb @s
# 11 -> 12 (нужно 9000 опыта)
execute if score @s lvl matches 11 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.12","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 11 run title @s title 11 §7>>§f 12
execute if score @s lvl matches 11 run execute as @a at @s run playsound random.orb @s
# 12 -> 13 (нужно 10100 опыта)
execute if score @s lvl matches 12 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.13","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 12 run title @s title 12 §7>>§f 13
execute if score @s lvl matches 12 run execute as @a at @s run playsound random.levelup @s
# 13 -> 14 (нужно 12300 опыта)
execute if score @s lvl matches 13 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.14","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 13 run title @s title 13 §7>>§f 14
execute if score @s lvl matches 13 run execute as @a at @s run playsound random.orb @s
# 14 -> 15 (нужно 15000 опыта)
execute if score @s lvl matches 14 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.15","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 14 run title @s title 14 §7>>§f 15
execute if score @s lvl matches 14 run execute as @a at @s run playsound random.levelup @s
# 15 -> 16 (нужно 18000 опыта)
execute if score @s lvl matches 15 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.16","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 15 run title @s title 15 §7>>§c 16
execute if score @s lvl matches 15 run execute as @a at @s run playsound minecraft.challenge.complete @s
# 16 -> 17 (нужно 21500 опыта)
execute if score @s lvl matches 16 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.17","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 16 run title @s title 16 §7>>§f 17
execute if score @s lvl matches 16 run execute as @a at @s run playsound random.levelup @s
# 17 -> 18 (нужно 24000 опыта)
execute if score @s lvl matches 17 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.18","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 17 run title @s title 17 §7>>§f 18
execute if score @s lvl matches 17 run execute as @a at @s run playsound random.levelup @s
# 18 -> 19 (нужно 27000 опыта)
execute if score @s lvl matches 18 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.19","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 18 run title @s title 18 §7>>§f 19
execute if score @s lvl matches 18 run execute as @a at @s run playsound random.levelup @s
# 19 -> 20 (нужно 33000 опыта)
execute if score @s lvl matches 19 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.20","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 19 run title @s title 19 §7>>§f 20
execute if score @s lvl matches 19 run execute as @a at @s run playsound random.levelup @s
# 20 -> 21 (нужно 35000 опыта)
execute if score @s lvl matches 20 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.21","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 20 run title @s title 20 §7>>§f 21
execute if score @s lvl matches 20 run execute as @a at @s run playsound random.orb @s
# 21 -> 22 (нужно 40000 опыта)
execute if score @s lvl matches 21 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.22","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 21 run title @s title 21 §7>>§f 22
execute if score @s lvl matches 21 run execute as @a at @s run playsound random.levelup @s
# 22 -> 23 (нужно 42000 опыта)
execute if score @s lvl matches 22 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.23","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 22 run title @s title 22 §7>>§f 23
execute if score @s lvl matches 22 run execute as @a at @s run playsound random.orb @s
# 23 -> 24 (нужно 50000 опыта)
execute if score @s lvl matches 23 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.24","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 23 run title @s title 23 §7>>§f 24
execute if score @s lvl matches 23 run execute as @a at @s run playsound random.levelup @s
# 24 -> 25 (нужно 60000 опыта)
execute if score @s lvl matches 24 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.25","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 24 run title @s title 24 §7>>§a 25
execute if score @s lvl matches 24 run execute as @a at @s run playsound minecraft.challenge.complete @s

# 25 -> 26 (нужно 66000 опыта)
execute if score @s lvl matches 25 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.26","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 25 run title @s title 25 §7>>§a 26
execute if score @s lvl matches 25 run execute as @a at @s run playsound minecraft.challenge.complete @s
# 26 -> 27 (нужно 72000 опыта)
execute if score @s lvl matches 26 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.27","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 26 run title @s title 26 §7>>§f 27
execute if score @s lvl matches 26 run execute as @a at @s run playsound random.orb @s
# 27 -> 28 (нужно 78000 опыта)
execute if score @s lvl matches 27 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.28","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 27 run title @s title 27 §7>>§f 28
execute if score @s lvl matches 27 run execute as @a at @s run playsound random.orb @s
# 28 -> 29 (нужно 85000 опыта)
execute if score @s lvl matches 28 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.29","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 28 run title @s title 28 §7>>§f 29
execute if score @s lvl matches 28 run execute as @a at @s run playsound random.orb @s
# 29 -> 30 (нужно 92000 опыта)
execute if score @s lvl matches 29 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.30","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 29 run title @s title 29 §7>>§f 30
execute if score @s lvl matches 29 run execute as @a at @s run playsound random.orb @s
# 30 -> 31 (нужно 100000 опыта)
execute if score @s lvl matches 30 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.31","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 30 run title @s title 30 §7>>§f 31
execute if score @s lvl matches 30 run execute as @a at @s run playsound random.orb @s
# 31 -> 32 (нужно 108000 опыта)
execute if score @s lvl matches 31 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.32","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 31 run title @s title 31 §7>>§f 32
execute if score @s lvl matches 31 run execute as @a at @s run playsound random.orb @s
# 32 -> 33 (нужно 117000 опыта)
execute if score @s lvl matches 32 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.33","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 32 run title @s title 32 §7>>§f 33
execute if score @s lvl matches 32 run execute as @a at @s run playsound random.orb @s
# 33 -> 34 (нужно 126000 опыта)
execute if score @s lvl matches 33 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.34","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 33 run title @s title 33 §7>>§f 34
execute if score @s lvl matches 33 run execute as @a at @s run playsound random.orb @s
# 34 -> 35 (нужно 136000 опыта)
execute if score @s lvl matches 34 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.35","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 34 run title @s title 34 §7>>§f 35
execute if score @s lvl matches 34 run execute as @a at @s run playsound random.orb @s
# 35 -> 36 (нужно 147000 опыта)
execute if score @s lvl matches 35 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.36","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 35 run title @s title 35 §7>>§f 36
execute if score @s lvl matches 35 run execute as @a at @s run playsound random.orb @s
# 36 -> 37 (нужно 158000 опыта)
execute if score @s lvl matches 36 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.37","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 36 run title @s title 36 §7>>§f 37
execute if score @s lvl matches 36 run execute as @a at @s run playsound random.orb @s
# 37 -> 38 (нужно 170000 опыта)
execute if score @s lvl matches 37 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.38","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 37 run title @s title 37 §7>>§f 38
execute if score @s lvl matches 37 run execute as @a at @s run playsound random.orb @s
# 38 -> 39 (нужно 183000 опыта)
execute if score @s lvl matches 38 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.39","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 38 run title @s title 38 §7>>§f 39
execute if score @s lvl matches 38 run execute as @a at @s run playsound random.orb @s
# 39 -> 40 (нужно 197000 опыта)
execute if score @s lvl matches 39 run tellraw @a {"rawtext":[{"translate":"chat.lvlup.level.40","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score @s lvl matches 39 run title @s title 39 §7>>§a 40
execute if score @s lvl matches 39 run execute as @a at @s run playsound minecraft.challenge.complete @s

# Списываем стоимость текущего уровня и повышаем
scoreboard players operation @s xp -= @s xp_need
scoreboard players add @s lvl 1
# Сразу пересчитать стоимость нового уровня (иначе до timers/ticks_20 действовала бы старая, меньшая)
function system/xp_need