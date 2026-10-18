# Каждые 20 тиков (1 с). Вызывается из system/timers.
scoreboard players set t20 timer 0
# было: командный блок (56, 1, 58) и (56, 2, 58)
execute if entity @e[name="X2Boost",scores={system=1..300}] run function boost/x2_tick
execute if entity @e[name="X4Boost",scores={system=1..300}] run function boost/x4_tick
# было: командный блок (58, 5, 58)
tag @a[tag=!player] add player
# было: командный блок (58, 6, 58)
scoreboard players remove @e[name="rainEvent",scores={system=1..30}] system 1

# Бусты общие: пока таймер стойки идёт, тег есть у всех онлайн (в том числе у зашедших позже),
# иначе снимается (в том числе у тех, кто был офлайн в момент окончания буста)
execute if entity @e[name="X2Boost",scores={system=1..300}] run tag @a[tag=!x2boost] add x2boost
execute unless entity @e[name="X2Boost",scores={system=1..300}] run tag @a[tag=x2boost] remove x2boost
execute if entity @e[name="X4Boost",scores={system=1..300}] run tag @a[tag=!x4boost] add x4boost
execute unless entity @e[name="X4Boost",scores={system=1..300}] run tag @a[tag=x4boost] remove x4boost

# Погода по «золотому дождю» (раньше — каждый тик в system/system)
execute as @e[name="rainEvent",scores={system=1..30}] run weather rain
execute as @e[name="rainEvent",scores={system=-1..0}] run weather clear

# Ранги в чате и стоимость уровня (раньше — каждый тик в tick.json; qx ещё и сразу после повышения)
function ranks/rank_lvl_add
function ranks/rank_lvl_remove
function ranks/rank_lvl_reset
function system/qx

# Онлайн: один подсчёт вместо N² команд
scoreboard players set onlinecount system 0
execute as @a run scoreboard players add onlinecount system 1
scoreboard players operation @a online = onlinecount system

# Кирка по уровню (раньше — каждые 100 тиков, с заменой у всех и сбросом зачарований)
function system/pickaxe_lvl

# Зачарования кирки по купленному уровню (на предмет в руке) и спешка за ребитхи (раньше — каждый тик)
execute as @a[scores={efficiency=1..1}] run enchant @s efficiency 1
execute as @a[scores={efficiency=2..2}] run enchant @s efficiency 2
execute as @a[scores={efficiency=3..3}] run enchant @s efficiency 3
execute as @a[scores={efficiency=4..4}] run enchant @s efficiency 4
execute as @a[scores={efficiency=5..}] run enchant @s efficiency 5
execute as @a[scores={fortune=1..1}] run enchant @s fortune 1
execute as @a[scores={fortune=2..2}] run enchant @s fortune 2
execute as @a[scores={fortune=3..}] run enchant @s fortune 3
effect @a[scores={rebirth=1..1}] haste 2 0 true
effect @a[scores={rebirth=2..2}] haste 2 1 true
effect @a[scores={rebirth=3..3}] haste 2 2 true
effect @a[scores={rebirth=4..4}] haste 2 3 true
effect @a[scores={rebirth=5..}] haste 2 4 true

# «Магнит руды»: секунды идут только онлайн; по окончании — сообщение и снятие тега
scoreboard players remove @a[scores={tpore=1..}] tpore 1
execute as @a[tag=player:tp_ore,scores={tpore=..0}] run tellraw @s {"rawtext":[{"translate":"message.tp_ore.end"}]}
tag @a[tag=player:tp_ore,scores={tpore=..0}] remove player:tp_ore

# Подарок «в игре» (events/gift_event): обратный отсчёт, пока его не подобрали
execute if score gift system matches 1.. run scoreboard players remove gift system 1

# Голод только на PvP-арене (группы компонентов в entities/player.json, см. system/system)
event entity @a[tag=!player:pvp] server:hunger_off
event entity @a[tag=player:pvp] server:hunger_on