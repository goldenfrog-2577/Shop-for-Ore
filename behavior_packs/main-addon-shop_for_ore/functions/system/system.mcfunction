# Телепортация игроков из определённых зон и условий
execute as @a[x=0,y=1,z=-20,r=3,scores={lvl=1..15}] at @s run tp @s 0 5 0
execute as @a[x=50,y=0,z=50,r=25,tag=!host,tag=!role:admin] at @s run tp @s 0 5 0
execute as @a[x=0,y=-60,z=0,r=55] at @s run tp @s 0 5 0
execute as @a[x=60,y=-60,z=0,r=55] at @s run tp @s 0 5 0
execute as @a[x=0,y=-60,z=-33,r=55] at @s run tp @s 0 5 0
execute as @a at @s if block ~~~ planks 5 run tp @s 0 5 0
# Телепортация на спавн, если игрок стоит на багровых или искажённых досках
execute as @a at @s if block ~~~ crimson_planks run tp @s 0 5 -33
execute as @a at @s if block ~~~ warped_planks run tp @s 0 5 -33
# Телепортация в определённые мини-игры
# PvP-арена: телепорт в случайную точку площадки делает scripts/system/pvp.js по тегу warp:pvp
tag @a[x=-103,y=0,z=-51,r=1,tag=!warp:pvp] add warp:pvp
execute as @a[x=-115,y=0,z=-51,r=1] at @s run tp @s 500 3 500

# Установка режима приключения и снятие опыта
# Владельцу, администраторам и модераторам режим не сбрасывается (!gm1, !gm6)
gamemode a @a[tag=!host,tag=!role:admin,tag=!role:moder,m=!a]
xp -100l @a[lm=1]

# Сброс значений для новых игроков (без тега player)
# promo1-4: "add 0" только создаёт счёт новичку и не обнуляет его после перерождения,
# иначе промокоды снова срабатывают после каждого rebirth
scoreboard players set @a[tag=!player] xp 0
scoreboard players set @a[tag=!player] money 0
scoreboard players set @a[tag=!player] money2 0
scoreboard players set @a[tag=!player] lvl 1
scoreboard players add @a promo1 0
scoreboard players add @a promo2 0
scoreboard players add @a promo3 0
scoreboard players add @a promo4 0
scoreboard players set @a[tag=!player] efficiency 0
scoreboard players set @a[tag=!player] fortune 0
scoreboard players set @a[tag=!rebirth] rebirth 0

# Выдача меню администратора и обычного меню — только если его нет в слоте
# (раньше предмет перевыдавался каждый тик всем игрокам)
replaceitem entity @a[tag=host,hasitem={item=server:admin_menu,location=slot.hotbar,slot=7,quantity=0}] slot.hotbar 7 server:admin_menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=role:admin,hasitem={item=server:admin_menu,location=slot.hotbar,slot=7,quantity=0}] slot.hotbar 7 server:admin_menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
# Роль сняли — забираем меню администратора
clear @a[tag=!host,tag=!role:admin,hasitem={item=server:admin_menu}] server:admin_menu
replaceitem entity @a[hasitem={item=server:menu,location=slot.hotbar,slot=8,quantity=0}] slot.hotbar 8 server:menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}

# Зачарования, спешка за ребитхи, погода, онлайн — раз в секунду в timers/t20;
# счёт предметов — в system/clear_items

## --- PVP AREA MANAGEMENT ---
# Урон между игроками блокирует minecraft:damage_sensor в entities/player.json:
# игрок может ранить игрока, только если у ОБОИХ есть тег player:pvp.
# Здесь только выдаём/снимаем тег по координатам арены — эффекты больше не нужны.
# Арена: x=236..363, y=-32..0, z=240..367

tag @a[x=236,y=-32,z=240,dx=127,dy=32,dz=127,tag=!player:pvp] add player:pvp
execute as @a[tag=player:pvp] unless entity @s[x=236,y=-32,z=240,dx=127,dy=32,dz=127] run tag @s remove player:pvp

## --- ГОЛОД ТОЛЬКО НА PVP-АРЕНЕ ---
# Вне арены у игрока группа server:hunger_off (entities/player.json): все exhaustion_values = 0,
# голод не тратится. На арене — server:hunger_normal (ванильные значения).
# Сами события group on/off шлются раз в секунду из timers/t20 (повторное событие безвредно,
# а если player.json ещё не перечитан — сработает после перезахода).
# Здесь только разово восполняем голод при выходе с арены; тег hunger:off это и отмечает.
execute as @a[tag=!player:pvp,tag=!hunger:off] run effect @s saturation 1 20 true
tag @a[tag=!player:pvp,tag=!hunger:off] add hunger:off
tag @a[tag=player:pvp,tag=hunger:off] remove hunger:off

# Опыт с руд (и с игроков при смерти) не нужен: свои очки опыта — табло xp
kill @e[type=xp_orb]

# Разовая миграция: снимаем старую «защиту» resistance 99999 255, которую выдавала прошлая версия.
# Тег pvp:v2 ставится один раз, поэтому сопротивление от админ-меню потом не сбрасывается
effect @a[tag=!pvp:v2] resistance 0 0
tag @a[tag=!pvp:v2] add pvp:v2