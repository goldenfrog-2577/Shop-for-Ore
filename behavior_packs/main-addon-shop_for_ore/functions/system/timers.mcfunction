# Планировщик: заменяет повторяющиеся командные блоки с задержкой (x=56 и x=58, z≈53..58).
# Счётчики — «фейковые игроки» tN в табло timer; каждый тик +1, на N — запуск timers/tN и сброс.
# Табло создаются один раз (system/setup), а не каждый тик
execute unless score setup system matches 1 run function system/setup

# Каждый тик: конец «золотого дождя»
# было: командный блок (56, 4, 56)
execute if entity @e[name="rainEvent",scores={system=0..0}] run function events/rain_end

scoreboard players add t5 timer 1
execute if score t5 timer matches 5.. run function timers/t5
scoreboard players add t20 timer 1
execute if score t20 timer matches 20.. run function timers/t20
scoreboard players add t40 timer 1
execute if score t40 timer matches 40.. run function timers/t40
scoreboard players add t80 timer 1
execute if score t80 timer matches 80.. run function timers/t80
scoreboard players add t500 timer 1
execute if score t500 timer matches 500.. run function timers/t500
scoreboard players add t600 timer 1
execute if score t600 timer matches 600.. run function timers/t600
scoreboard players add t3600 timer 1
execute if score t3600 timer matches 3600.. run function timers/t3600
scoreboard players add t4800 timer 1
execute if score t4800 timer matches 4800.. run function timers/t4800
scoreboard players add t6000 timer 1
execute if score t6000 timer matches 6000.. run function timers/t6000