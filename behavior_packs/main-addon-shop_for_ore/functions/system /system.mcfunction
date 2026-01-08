# Телепортация игроков из определённых зон и условий
execute as @a[x=0,y=1,z=-20,r=3,scores={lvl=1..15}] at @s run tp @s 0 5 0
execute as @a[x=50,y=0,z=50,r=25,tag=!host] at @s run tp @s 0 5 0
execute as @a[x=0,y=-60,z=0,r=55] at @s run tp @s 0 5 0
execute as @a[x=60,y=-60,z=0,r=55] at @s run tp @s 0 5 0
execute as @a[x=0,y=-60,z=-33,r=55] at @s run tp @s 0 5 0
execute as @a at @s if block ~~~ planks 5 run tp @s 0 5 0
# Телепортация на спавн, если игрок стоит на багровых или искажённых досках
execute as @a at @s if block ~~~ crimson_planks run tp @s 0 5 -33
execute as @a at @s if block ~~~ warped_planks run tp @s 0 5 -33
# Телепортация в определённые мини-игры
execute as @a[x=-103,y=0,z=-51,r=1] at @s run tp @s 292 -25 259
execute as @a[x=-115,y=0,z=-51,r=1] at @s run tp @s 500 3 500

# Управление погодой через сущность rainEvent
execute as @e[name="rainEvent",scores={system=1..30}] run weather rain
execute as @e[name="rainEvent",scores={system=-1..0}] run weather clear

# Подсчёт предметов типа item
execute as @e[type=item] run scoreboard players set item system 0
execute as @e[type=item] run scoreboard players add item system 1

# Установка режима приключения и снятие опыта
gamemode a @a[tag=!host]
xp -100l @a

# Обновление счётчика онлайн-игроков
execute as @a run scoreboard players set @a online 0
execute as @a run scoreboard players add @a online 1

# Сброс значений для новых игроков (без тега player)
scoreboard players set @a[tag=!player] xp 0
scoreboard players set @a[tag=!player] money 0
scoreboard players set @a[tag=!player] money2 0
scoreboard players set @a[tag=!player] lvl 1
scoreboard players set @a[tag=!player] promo1 0
scoreboard players set @a[tag=!player] promo2 0
scoreboard players set @a[tag=!player] promo3 0
scoreboard players set @a[tag=!player] promo4 0
scoreboard players set @a[tag=!player] efficiency 0
scoreboard players set @a[tag=!player] fortune 0
scoreboard players set @a[tag=!rebirth] rebirth 0

# Выдача меню администратора и обычного меню
replaceitem entity @a[tag=host] slot.hotbar 7 server:admin_menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a slot.hotbar 8 server:menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}

# Автоматическое наложение зачарования эффективность по уровню
execute as @a[scores={efficiency=1..1}] run enchant @s efficiency 1
execute as @a[scores={efficiency=2..2}] run enchant @s efficiency 2
execute as @a[scores={efficiency=3..3}] run enchant @s efficiency 3
execute as @a[scores={efficiency=4..4}] run enchant @s efficiency 4
execute as @a[scores={efficiency=5..}] run enchant @s efficiency 5

# Автоматическое наложение зачарования удача по уровню
execute as @a[scores={fortune=1..1}] run enchant @s fortune 1
execute as @a[scores={fortune=2..2}] run enchant @s fortune 2
execute as @a[scores={fortune=3..}] run enchant @s fortune 3

# Эффект спешки в зависимости от количества перерождений
execute as @a[scores={rebirth=1..1}] run effect @s haste 2 0 true
execute as @a[scores={rebirth=2..2}] run effect @s haste 2 1 true
execute as @a[scores={rebirth=3..3}] run effect @s haste 2 2 true
execute as @a[scores={rebirth=4..4}] run effect @s haste 2 3 true
execute as @a[scores={rebirth=5..}] run effect @s haste 2 4 true

## --- PVP AREA MANAGEMENT ---

# 1. Всем, кто находится ВНУТРИ зоны, выдаем тег и убираем сопротивление
execute as @a[x=236,y=-32,z=240,dx=127,dy=32,dz=127,tag=!player:pvp] run tag @s add player:pvp
execute as @a[tag=player:pvp,x=236,y=-32,z=240,dx=127,dy=32,dz=127] run effect @s resistance 0 0

# 2. Всем, кто ВЫШЕЛ из зоны (имеет тег, но физически не в координатах), снимаем тег и возвращаем бафф
# Сначала находим тех, кто ушел
execute as @a[tag=player:pvp] at @s unless entity @s[x=236,y=-32,z=240,dx=127,dy=32,dz=127] run tag @s add player:left_pvp

# Выдаем им сопротивление и удаляем оба тега
execute as @a[tag=player:left_pvp] run effect @s resistance 99999 255 true
execute as @a[tag=player:left_pvp] run tag @s remove player:pvp
execute as @a[tag=player:left_pvp] run tag @s remove player:left_pvp

# 3. Страховка для спавна (на всякий случай, если игрок тепнулся)
execute as @a[x=-5,y=0,z=-5,dx=10,dy=10,dz=10] run effect @s resistance 99999 255 true
