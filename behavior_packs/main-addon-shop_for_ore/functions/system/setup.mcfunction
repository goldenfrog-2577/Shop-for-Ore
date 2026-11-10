# Разовая настройка табло. Вызывается из system/timers, пока setup system меньше 10.
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
# Старые названия: xp_need пересчитывается раз в секунду (system/xp_need), магнит — временный, его не переносим
scoreboard objectives remove qx
scoreboard objectives remove tpore
# 3 — money2 (VIP-коины) → vip_coins; у игроков в сети баланс переносится
scoreboard objectives add vip_coins dummy
scoreboard players operation @a vip_coins = @a money2
scoreboard objectives remove money2
# 4 — счётчики для достижений (scripts/system/achievements.js)
scoreboard objectives add stat_mined dummy
scoreboard objectives add stat_kills dummy
scoreboard objectives add stat_playtime dummy
scoreboard objectives add stat_wins dummy
# 5 — K/D и победы по мини-играм (!top kd / pvp / spleef)
scoreboard objectives add stat_deaths dummy
scoreboard objectives add stat_win_pvp_ffa dummy
scoreboard objectives add stat_win_spleef dummy
# 6 — счётчики новых достижений: проданные осколки аметиста и попадания в тире
scoreboard objectives add stat_amethyst dummy
scoreboard objectives add stat_tir_hits dummy
# 7 — таймеры общих бустов и дождя без сущностей; стойки читаются только при миграции.
scoreboard players add stand_timers_migrated system 0
scoreboard players add boost_x2 system 0
scoreboard players add boost_x4 system 0
execute if score stand_timers_migrated system matches 0 run scoreboard players set rain_event system -1
execute if score stand_timers_migrated system matches 0 run tickingarea add 48 0 48 63 15 63 shop_stand_migration
scoreboard objectives add play_seconds dummy
# 8 — вход в мир без скриптов (system/session): у игроков в сети — 1, у вышедших счёта нет
scoreboard objectives add session dummy
# 9 — новый порядок блоков Незера (кварц 17, самородки 18, магма 19, позолоченный чернит 20, обломки 21):
# кирки всем заново — у кого старая кирка своего уровня, она ломала бы другие блоки
scoreboard players reset * pick
scoreboard players set setup system 10