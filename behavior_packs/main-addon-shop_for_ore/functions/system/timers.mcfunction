# Планировщик: каждый тик (tick.json). Счётчики — «фейковые игроки» tN в табло timer: каждый тик +1,
# на N — запуск timers/ticks_N и сброс. Табло создаёт один раз system/setup.
# В Bedrock «execute if/unless score» с несуществующим счётом не срабатывает ни в одном варианте,
# поэтому счёт сначала создаётся через «add 0».
scoreboard players add setup system 0
execute if score setup system matches ..7 run function system/setup

# Стойки нужны только до завершения разовой миграции.
execute if score stand_timers_migrated system matches 0 run function system/migrate_timers

# Каждый тик: конец «золотого дождя»
execute if score stand_timers_migrated system matches 1 if score rain_event system matches 0 run function events/rain_end

scoreboard players add t5 timer 1
execute if score t5 timer matches 5.. run function timers/ticks_5
scoreboard players add t20 timer 1
execute if score t20 timer matches 20.. run function timers/ticks_20
scoreboard players add t40 timer 1
execute if score t40 timer matches 40.. run function timers/ticks_40
scoreboard players add t80 timer 1
execute if score t80 timer matches 80.. run function timers/ticks_80
scoreboard players add t500 timer 1
execute if score t500 timer matches 500.. run function timers/ticks_500
scoreboard players add t600 timer 1
execute if score t600 timer matches 600.. run function timers/ticks_600
scoreboard players add t3600 timer 1
execute if score t3600 timer matches 3600.. run function timers/ticks_3600
scoreboard players add t4800 timer 1
execute if score t4800 timer matches 4800.. run function timers/ticks_4800
scoreboard players add t6000 timer 1
execute if score t6000 timer matches 6000.. run function timers/ticks_6000