# --- x2_boost: покупка и активация буста x2 (общий для всех игроков, 5 минут) ---
# Вызывается из меню (Магазин → Бусты) от имени игрока (@s).
# Тег sys:buy_ok отмечает успешную покупку: деньги списываются только вместе с выдачей буста.
# Раньше деньги снимались и тогда, когда буст уже шёл и игрок получал ошибку.

# Буст уже идёт (x2 или x4) — ошибка
execute as @s[tag=boost:x2] run tellraw @s {"rawtext":[{"translate":"chat.boost.error.active"}]}
execute as @s[tag=boost:x2] run playsound minecraft.glass.broke @s
execute as @s[tag=boost:x4] run tellraw @s {"rawtext":[{"translate":"chat.boost.error.active"}]}
execute as @s[tag=boost:x4] run playsound minecraft.glass.broke @s

# Не хватает денег — ошибка
execute as @s[tag=!boost:x2,tag=!boost:x4,scores={money=..9999}] run tellraw @s {"rawtext":[{"translate":"chat.error.no_money"}]}

# Покупка
execute as @s[tag=!boost:x2,tag=!boost:x4,scores={money=10000..}] run tag @s add sys:buy_ok
scoreboard players remove @s[tag=sys:buy_ok] money 10000
execute as @s[tag=sys:buy_ok] positioned as @a run playsound note.bell @a
execute as @s[tag=sys:buy_ok] run scoreboard players set scoreboards.x2boost display 0
execute as @s[tag=sys:buy_ok] run tellraw @a {"rawtext":[{"translate":"chat.boost.x2","with":{"rawtext":[{"selector":"@s"}]}}]}
execute as @s[tag=sys:buy_ok] run scoreboard players set @e[name="X2Boost"] system 300
# Тег буста получают все онлайн; зашедшим позже его выдаёт timers/ticks_20, пока таймер X2Boost идёт
execute as @s[tag=sys:buy_ok] run tag @a add boost:x2
tag @s remove sys:buy_ok