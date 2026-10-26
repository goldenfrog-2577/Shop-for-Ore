# Сброс счетов прогресса у всех игроков, и у тех, кто не в сети (*). Вызывает scripts/system/wipe.js (!wipe confirm, меню администратора)
scoreboard players reset * money
scoreboard players reset * vip_coins
scoreboard players reset * lvl
scoreboard players reset * xp
scoreboard players reset * rebirth
scoreboard players reset * online
scoreboard players reset * efficiency
scoreboard players reset * fortune
scoreboard players reset * promo1
scoreboard players reset * promo2
scoreboard players reset * promo3
scoreboard players reset * promo4
scoreboard players reset * xp_need
scoreboard players reset * magnet
scoreboard players reset * pick
scoreboard players reset * stat_mined
scoreboard players reset * stat_kills
scoreboard players reset * stat_playtime
scoreboard players reset * stat_wins
scoreboard players reset * stat_deaths
scoreboard players reset * stat_win_pvp_ffa
scoreboard players reset * stat_win_spleef

# Теги (прогресс, достижения, косметика) снимает scripts/system/wipe.js — у игроков в сети сразу,
# у остальных при входе (номер вайпа в свойстве мира shop:wipe_id)

# Воспроизведение звука и сообщение об успешном вайпе
playsound random.levelup @s
tellraw @s {"rawtext":[{"translate":"chat.server.wiped"}]}