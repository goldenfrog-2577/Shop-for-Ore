# --- Событие «Подарок»: над случайным игроком появляется изумрудный блок, кто первый подберёт ---
# Запускается из timers/ticks_4800, если включено: /scoreboard players set gift settings 1
# Структура gift — один предмет «изумрудный блок». gift system — сколько секунд подарок «в игре»
# (60, уменьшается в timers/ticks_20); пока он больше 0, очистка предметов не трогает его,
# а первый подобравший объявляется в system/autosale (там же блок продаётся за 150).
# Раньше блок появлялся под картой (0 -50 0), искался по локализованному имени,
# а объявление «подобрал» срабатывало в тот же тик, до того как его кто-то подобрал.
execute if entity @a[tag=player,tag=!role:owner] run scoreboard players set gift system 60
execute if entity @a[tag=player,tag=!role:owner] at @r[tag=player,tag=!role:owner] run structure load gift ~ ~3 ~
execute if entity @a[tag=player,tag=!role:owner] run tellraw @a {"rawtext":[{"translate":"chat.event.gift"}]}
execute if entity @a[tag=player,tag=!role:owner] as @a at @s run playsound note.bell @s ~~~ 1.0 0.75