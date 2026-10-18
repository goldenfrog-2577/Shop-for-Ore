# Разовая настройка табло. Вызывается из system/timers, пока setup system не равен 1.
# Если понадобится новое табло — добавить сюда и поднять номер в timers и ниже.
scoreboard objectives add qx dummy System
scoreboard objectives add timer dummy
scoreboard objectives add settings dummy
scoreboard objectives add tpore dummy
scoreboard objectives add pick dummy
# Остатки старой версии: ticks (счётчик входа до 0.2.0) и loginAttempts нигде не используются
scoreboard objectives remove ticks
scoreboard objectives remove loginAttempts
scoreboard players set setup system 1