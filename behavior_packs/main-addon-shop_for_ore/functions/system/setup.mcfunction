# Разовая настройка табло. Вызывается из system/timers, пока setup system меньше 2.
# 2 — табло qx и tpore переименованы в xp_need и magnet (единый стиль названий, 0.3.0)
# Если понадобится новое табло — добавить сюда и поднять номер в timers и ниже.
scoreboard objectives add xp_need dummy System
scoreboard objectives add timer dummy
scoreboard objectives add settings dummy
scoreboard objectives add magnet dummy
scoreboard objectives add pick dummy
# Остатки старой версии: ticks (счётчик входа до 0.2.0) и loginAttempts нигде не используются
scoreboard objectives remove ticks
scoreboard objectives remove loginAttempts
# Старые названия: xp_need пересчитывается раз в секунду (system/qx), магнит — временный, его не переносим
scoreboard objectives remove qx
scoreboard objectives remove tpore
scoreboard players set setup system 2