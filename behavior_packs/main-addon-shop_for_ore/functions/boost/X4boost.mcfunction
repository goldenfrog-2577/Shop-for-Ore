# --- X4boost: покупка и активация буста x4 (общий для всех игроков, 5 минут) ---
# Вызывается из меню (Магазин → Бусты) от имени игрока (@s).
# Тег buy:ok отмечает успешную покупку: деньги списываются только вместе с выдачей буста.
# Раньше деньги снимались и тогда, когда буст уже шёл и игрок получал ошибку.

# Буст уже идёт (x2 или x4) — ошибка
execute as @s[tag=x4boost] run tellraw @s {"rawtext":[{"translate":"message.boost.error"}]}
execute as @s[tag=x4boost] run playsound minecraft.glass.broke @s
execute as @s[tag=x2boost] run tellraw @s {"rawtext":[{"translate":"message.boost.error"}]}
execute as @s[tag=x2boost] run playsound minecraft.glass.broke @s

# Не хватает денег — ошибка
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=..49999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}

# Покупка
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=50000..}] run tag @s add buy:ok
scoreboard players remove @s[tag=buy:ok] money 50000
execute as @s[tag=buy:ok] positioned as @a run playsound note.bell @a
execute as @s[tag=buy:ok] run scoreboard players set scoreboards.x4boost display 0
execute as @s[tag=buy:ok] run tellraw @a {"rawtext":[{"text":"§3"},{"selector":"@s"},{"translate":"message.x4boost"}]}
execute as @s[tag=buy:ok] run scoreboard players set @e[name="X4Boost"] system 300
# Тег буста получают все онлайн; зашедшим позже его выдаёт timers/t20, пока таймер X4Boost идёт
execute as @s[tag=buy:ok] run tag @a add x4boost
tag @s remove buy:ok