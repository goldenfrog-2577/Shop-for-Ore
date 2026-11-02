# Каждые 5 тиков (0.25 с). Вызывается из system/timers. Панель слева — scripts/system/hud.js, тоже раз в 5 тиков.
scoreboard players set t5 timer 0
function system/autosale
# «Магнит руды» (shop/ore_magnet/ore_magnet): предметы в радиусе 6 блоков летят к купившему
execute as @a[tag=boost:magnet] at @s run tp @e[type=item,r=6] @s
