# Каждые 5 тиков (0.25 с). Вызывается из system/timers.
scoreboard players set t5 timer 0
# было: командный блок (58, 2, 58)
function system/autosale
# Табло игрока (actionbar). Раньше отправлялось каждый тик; деньги и опыт всё равно меняются
# только при автопродаже, раз в 5 тиков
function system/scoreboards
# «Магнит руды» (shop/tp_ore): предметы в радиусе 6 блоков летят к купившему
execute as @a[tag=boost:magnet] at @s run tp @e[type=item,r=6] @s