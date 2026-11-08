# Каждый тик (tick.json): зоны и телепорты, режим игры, новички, меню в хотбаре, PvP-арена.

## --- Закрытые зоны: обратно ---
# Мост к адской шахте (z −20) — с 16 уровня, к Пещере (z −56) — с 26: ниже — на шаг назад
execute as @a[x=0,y=1,z=-20,r=3,scores={lvl=1..15}] at @s run tp @s 0 5 0
execute as @a[x=0,y=1,z=-56,r=3,scores={lvl=1..25}] at @s run tp @s 0 5 -33
# VIP-остров (x −86…−34, z −70…−43: VIP-шахта и лавка торговца) — только VIP (тег player:vip) и персоналу.
# Попасть туда — !warp vip или Меню сервера → Телепортации (scripts/DataBase.js, WARPS)
execute as @a[x=-87,y=-8,z=-71,dx=54,dy=30,dz=29,tag=!player:vip,tag=!role:owner,tag=!role:admin,tag=!role:moder,tag=!role:helper,tag=!role:bot,tag=!sys:bot] at @s run tp @s 0 5 0
# Зона командных блоков — владельцу, администраторам и боту (тег role:bot, scripts/system/spawnbot.js)
execute as @a[x=50,y=0,z=50,r=25,tag=!role:owner,tag=!role:admin,tag=!role:bot,tag=!sys:bot] at @s run tp @s 0 5 0

## --- Телепорты-площадки ---
# Тёмные дубовые доски — на спавн; багровые и искажённые — в адскую шахту
execute as @a[tag=!role:bot,tag=!sys:bot] at @s if block ~~~ planks 5 run tp @s 0 5 0
execute as @a[tag=!role:bot,tag=!sys:bot] at @s if block ~~~ crimson_planks run tp @s 0 5 -33
execute as @a[tag=!role:bot,tag=!sys:bot] at @s if block ~~~ warped_planks run tp @s 0 5 -33
# Порталы мини-игр. PvP-арена: случайную точку площадки выбирает scripts/system/pvp.js по тегу sys:warp_pvp
tag @a[x=-103,y=0,z=-51,r=1,tag=!sys:warp_pvp] add sys:warp_pvp
# Арена босса — бирюзовый портал (телепорт с проверками !warp boss делает scripts/system/boss/portal.js), тир — зелёный (рамка из зелёного бетона x −111…−107)
tag @a[x=-115,y=0,z=-51,r=1,tag=!role:bot,tag=!sys:warp_boss] add sys:warp_boss
execute as @a[x=-109,y=0,z=-51,r=1] at @s run tp @s 435 -50 338

## --- Режим игры и ванильный опыт ---
# Приключение всем, кроме персонала (у него свой режим: !gm1, !gm6)
gamemode a @a[tag=!role:owner,tag=!role:admin,tag=!role:moder,tag=!role:helper,m=!a]
# Ванильный опыт не нужен: свои очки — табло xp. Сферы опыта с руд и игроков — сразу убрать
xp -100l @a[lm=1]
kill @e[type=xp_orb]

## --- Новичок (без тега player; его ставит timers/ticks_20) ---
# Так же — после ребитха (upgrade/upgrade_rebirth снимает player): прогресс заново
scoreboard players set @a[tag=!player] xp 0
scoreboard players set @a[tag=!player] money 0
# VIP-коины переживают ребитх: «add 0» создаёт счёт новичку и не трогает накопленное
scoreboard players add @a[tag=!player] vip_coins 0
scoreboard players set @a[tag=!player] lvl 1
scoreboard players set @a[tag=!player] efficiency 0
scoreboard players set @a[tag=!player] fortune 0
scoreboard players set @a[tag=!player:rebirth] rebirth 0

## --- Меню в хотбаре ---
# Выдаётся, только если его нет в слоте; меню администратора — владельцу и администраторам
replaceitem entity @a[tag=role:owner,hasitem={item=server:admin_menu,location=slot.hotbar,slot=7,quantity=0}] slot.hotbar 7 server:admin_menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=role:admin,hasitem={item=server:admin_menu,location=slot.hotbar,slot=7,quantity=0}] slot.hotbar 7 server:admin_menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
# Роль сняли — забираем меню администратора
clear @a[tag=!role:owner,tag=!role:admin,hasitem={item=server:admin_menu}] server:admin_menu
replaceitem entity @a[hasitem={item=server:menu,location=slot.hotbar,slot=8,quantity=0}] slot.hotbar 8 server:menu 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}

## --- PvP-арена (x 236…363, y −32…0, z 240…367) ---
# Урон между игроками блокирует minecraft:damage_sensor в entities/player.json: игрок может ранить игрока,
# только если у обоих есть тег player:pvp. Здесь тег выдаётся и снимается по координатам арены
tag @a[x=236,y=-32,z=240,dx=127,dy=32,dz=127,tag=!player:pvp] add player:pvp
execute as @a[tag=player:pvp] unless entity @s[x=236,y=-32,z=240,dx=127,dy=32,dz=127] run tag @s remove player:pvp
# Голод тратится только на арене (события hunger_off / hunger_on — раз в секунду, timers/ticks_20).
# При выходе с арены голод разово восполняется; тег sys:hunger_off это и отмечает
execute as @a[tag=!player:pvp,tag=!sys:hunger_off] run effect @s saturation 1 20 true
tag @a[tag=!player:pvp,tag=!sys:hunger_off] add sys:hunger_off
tag @a[tag=player:pvp,tag=sys:hunger_off] remove sys:hunger_off

## --- Разовая миграция с 0.2.0 ---
# Снять старую «защиту» resistance 99999 255; тег sys:pvp_v2 ставится один раз, поэтому
# сопротивление из меню администратора потом не сбрасывается
effect @a[tag=!sys:pvp_v2] resistance 0 0
tag @a[tag=!sys:pvp_v2] add sys:pvp_v2
