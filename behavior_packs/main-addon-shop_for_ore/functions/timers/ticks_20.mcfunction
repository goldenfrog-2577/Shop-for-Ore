# Каждые 20 тиков (1 с). Вызывается из system/timers.
scoreboard players set t20 timer 0

## --- Счета игрока ---
tag @a[tag=!player] add player
# Недостающие счета: так бывает после вайпа у тех, кто был не в сети — вайп сбрасывает табло у всех
# («reset *»), а тег player снимает только у игроков в сети. Без уровня у игрока нет кирки и панели слева.
# «add 0» создаёт пустой счёт как 0 и не меняет существующий; уровня 0 не бывает
scoreboard players add @a xp 0
scoreboard players add @a money 0
scoreboard players add @a vip_coins 0
scoreboard players add @a lvl 0
scoreboard players set @a[scores={lvl=..0}] lvl 1
scoreboard players add @a efficiency 0
scoreboard players add @a fortune 0
scoreboard players add @a rebirth 0
# Стоимость следующего уровня
function system/xp_need
# Онлайн: один подсчёт на всех
scoreboard players set onlinecount system 0
execute as @a run scoreboard players add onlinecount system 1
scoreboard players operation @a online = onlinecount system

## --- Общие бусты x2 / x4 ---
# Служебные записи boost_x2 / boost_x4 в system (секунды).
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches 1.. run function boost/x2_tick
execute if score stand_timers_migrated system matches 1 if score boost_x4 system matches 1.. run function boost/x4_tick
# Пока таймер идёт, тег буста есть у всех в сети (и у зашедших позже), иначе снимается
# (и у тех, кто был не в сети в момент окончания)
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches 1.. run tag @a[tag=!boost:x2] add boost:x2
execute if score stand_timers_migrated system matches 1 if score boost_x2 system matches ..0 run tag @a[tag=boost:x2] remove boost:x2
execute if score stand_timers_migrated system matches 1 if score boost_x4 system matches 1.. run tag @a[tag=!boost:x4] add boost:x4
execute if score stand_timers_migrated system matches 1 if score boost_x4 system matches ..0 run tag @a[tag=boost:x4] remove boost:x4

## --- «Магнит руды» (личный) ---
# Секунды идут только в сети; по окончании — сообщение и снятие тега
scoreboard players remove @a[scores={magnet=1..}] magnet 1
execute as @a[tag=boost:magnet,scores={magnet=..0}] run tellraw @s {"rawtext":[{"translate":"chat.ore_magnet.end"}]}
tag @a[tag=boost:magnet,scores={magnet=..0}] remove boost:magnet
# Магнит, выданный администратором, закончился — знак «выдан» больше не нужен (scripts/system/boosts.js)
tag @a[tag=boost:magnet_admin,scores={magnet=..0}] remove boost:magnet_admin

## --- Ивенты ---
# «Золотой дождь»: служебная запись rain_event в system (секунды) и погода
execute if score stand_timers_migrated system matches 1 if score rain_event system matches 1..30 run scoreboard players remove rain_event system 1
execute if score stand_timers_migrated system matches 1 if score rain_event system matches 1..30 run weather rain
execute if score stand_timers_migrated system matches 1 if score rain_event system matches -1..0 run weather clear
# «Подарок» (events/gift_event): обратный отсчёт, пока его не подобрали
execute if score gift system matches 1.. run scoreboard players remove gift system 1

## --- Кирка уровня, зачарования, спешка за ребитхи ---
function system/pickaxe_lvl
# Купленные зачарования — на предмет в руке (Магазин → Зачарования, shop/enchants/*)
execute as @a[scores={efficiency=1..1}] run enchant @s efficiency 1
execute as @a[scores={efficiency=2..2}] run enchant @s efficiency 2
execute as @a[scores={efficiency=3..3}] run enchant @s efficiency 3
execute as @a[scores={efficiency=4..4}] run enchant @s efficiency 4
execute as @a[scores={efficiency=5..}] run enchant @s efficiency 5
execute as @a[scores={fortune=1..1}] run enchant @s fortune 1
execute as @a[scores={fortune=2..2}] run enchant @s fortune 2
execute as @a[scores={fortune=3..}] run enchant @s fortune 3
# Спешка: уровень = число ребитхов (до V)
effect @a[scores={rebirth=1..1}] haste 2 0 true
effect @a[scores={rebirth=2..2}] haste 2 1 true
effect @a[scores={rebirth=3..3}] haste 2 2 true
effect @a[scores={rebirth=4..4}] haste 2 3 true
effect @a[scores={rebirth=5..}] haste 2 4 true

## --- Голод только на PvP-арене ---
# Группы компонентов в entities/player.json; тег player:pvp ставит system/system
event entity @a[tag=!player:pvp] server:hunger_off
event entity @a[tag=player:pvp] server:hunger_on

## --- Запасное меню на NPC (functions/fallback/*): включено ли, NPC на месте ---
function fallback/check
