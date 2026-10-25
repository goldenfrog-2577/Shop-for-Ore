# Каждые 20 тиков (1 с). Вызывается из system/timers.
scoreboard players set t20 timer 0
# было: командный блок (56, 1, 58) и (56, 2, 58)
# Диапазон 1.. (раньше 1..300): буст из !boost может длиться дольше 5 минут
execute if entity @e[name="X2Boost",scores={system=1..}] run function boost/x2_tick
execute if entity @e[name="X4Boost",scores={system=1..}] run function boost/x4_tick
# было: командный блок (58, 5, 58)
tag @a[tag=!player] add player

# Недостающие счета (раньше — каждый тик в system/system; секунды хватает)
# promo1-4: «add 0» только создаёт счёт новичку и не обнуляет его после перерождения,
# иначе промокоды снова срабатывают после каждого rebirth
scoreboard players add @a promo1 0
scoreboard players add @a promo2 0
scoreboard players add @a promo3 0
scoreboard players add @a promo4 0
# Счёта нет, а тег player есть — так бывает после вайпа у тех, кто был не в сети: вайп сбрасывает
# табло у всех («reset *»), а тег player снимает только с тех, кто в сети (@e). Без уровня у игрока
# нет кирки и панели слева. «add 0» создаёт пустой счёт как 0 и не меняет существующий; уровня 0 не бывает
scoreboard players add @a xp 0
scoreboard players add @a money 0
scoreboard players add @a vip_coins 0
scoreboard players add @a lvl 0
scoreboard players set @a[scores={lvl=..0}] lvl 1
scoreboard players add @a efficiency 0
scoreboard players add @a fortune 0
scoreboard players add @a rebirth 0
# было: командный блок (58, 6, 58)
scoreboard players remove @e[name="rainEvent",scores={system=1..30}] system 1

# Бусты общие: пока таймер стойки идёт, тег есть у всех онлайн (в том числе у зашедших позже),
# иначе снимается (в том числе у тех, кто был офлайн в момент окончания буста)
execute if entity @e[name="X2Boost",scores={system=1..}] run tag @a[tag=!boost:x2] add boost:x2
execute unless entity @e[name="X2Boost",scores={system=1..}] run tag @a[tag=boost:x2] remove boost:x2
execute if entity @e[name="X4Boost",scores={system=1..}] run tag @a[tag=!boost:x4] add boost:x4
execute unless entity @e[name="X4Boost",scores={system=1..}] run tag @a[tag=boost:x4] remove boost:x4

# Погода по «золотому дождю» (раньше — каждый тик в system/system)
execute as @e[name="rainEvent",scores={system=1..30}] run weather rain
execute as @e[name="rainEvent",scores={system=-1..0}] run weather clear

# Ранги в чате и стоимость уровня (раньше — каждый тик в tick.json; xp_need ещё и сразу после повышения)
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
scoreboard players remove @a[scores={magnet=1..}] magnet 1
execute as @a[tag=boost:magnet,scores={magnet=..0}] run tellraw @s {"rawtext":[{"translate":"chat.ore_magnet.end"}]}
tag @a[tag=boost:magnet,scores={magnet=..0}] remove boost:magnet

# Подарок «в игре» (events/gift_event): обратный отсчёт, пока его не подобрали
execute if score gift system matches 1.. run scoreboard players remove gift system 1

# Голод только на PvP-арене (группы компонентов в entities/player.json, см. system/system)
event entity @a[tag=!player:pvp] server:hunger_off
event entity @a[tag=player:pvp] server:hunger_on