# Каждые 500 тиков (25 с). Вызывается из system/timers.
scoreboard players set t500 timer 0
# Перезаливка шахт
execute if score scripts system matches 5.. run function system/automine