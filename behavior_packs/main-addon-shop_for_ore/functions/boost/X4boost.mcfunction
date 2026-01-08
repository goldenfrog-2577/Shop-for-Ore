# --- X4boost: функция покупки и активации четверного буста ---
# Проверяет наличие буста, денег, выдает эффекты и сообщения

# Если уже есть x4boost — ошибка
execute as @s[tag=x4boost] run tellraw @s {"rawtext":[{"translate":"message.boost.error"}]}
execute as @s[tag=x4boost] run playsound minecraft.glass.broke @s

# Если уже есть x2boost — ошибка
execute as @s[tag=x2boost] run tellraw @s {"rawtext":[{"translate":"message.boost.error"}]}
execute as @s[tag=x2boost] run playsound minecraft.glass.broke @s

# Если не хватает денег — ошибка
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=0..49999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}

# Если хватает денег — активация буста
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=50000..}] run execute positioned as @a run playsound note.bell @a
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=50000..}] run scoreboard players set scoreboards.x4boost display 0
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=50000..}] run tellraw @a {"rawtext":[{"text":"§3"},{"selector":"@s"},{"translate":"message.x4boost"}]}
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=50000..}] run scoreboard players set @e[name="X4Boost"] system 300
execute as @s[tag=!x2boost,tag=!x4boost,scores={money=50000..}] run tag @a add x4boost

# Списание денег только если буст выдан
execute as @s[tag=!x2boost,tag=x4boost,scores={money=50000..}] run scoreboard players remove @s money 50000
