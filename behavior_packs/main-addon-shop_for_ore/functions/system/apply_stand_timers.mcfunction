# Повторный вызов после миграции не перезаписывает работающие таймеры.
execute if score stand_timers_migrated system matches 0 run scoreboard players add @e[type=armor_stand,name="X2Boost",c=1] system 0
execute if score stand_timers_migrated system matches 0 run scoreboard players add @e[type=armor_stand,name="X4Boost",c=1] system 0
execute if score stand_timers_migrated system matches 0 run scoreboard players operation boost_x2 system = @e[type=armor_stand,name="X2Boost",c=1] system
execute if score stand_timers_migrated system matches 0 run scoreboard players operation boost_x4 system = @e[type=armor_stand,name="X4Boost",c=1] system
# Отсутствующий счёт дождя означает неактивный ивент (-1), без ложного сообщения об окончании.
execute if score stand_timers_migrated system matches 0 as @e[type=armor_stand,name="rainEvent",c=1] if score @s system = @s system run scoreboard players operation rain_event system = @s system
execute if score stand_timers_migrated system matches 0 run scoreboard players set stand_timers_migrated system 1
execute if score stand_timers_migrated system matches 1 run tickingarea remove shop_stand_migration
