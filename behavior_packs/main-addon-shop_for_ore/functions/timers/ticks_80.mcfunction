# Каждые 80 тиков (4 с). Вызывается из system/timers.
scoreboard players set t80 timer 0
# «Золотой дождь» (events/rain_start): слиток падает рядом с каждым игроком
execute if score stand_timers_migrated system matches 1 if score rain_event system matches 1..30 at @a[tag=player] run structure load "gold_2" ~-2~8~-3