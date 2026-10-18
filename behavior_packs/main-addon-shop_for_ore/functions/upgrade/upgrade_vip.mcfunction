# Ошибка: недостаточно уровня или денег для получения VIP
execute as @s[scores={lvl=1..25,money=0..124999}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.error.1"}]}
# Ошибка: уровень не 25, но денег достаточно — всё равно ошибка
execute as @s[scores={lvl=!25,money=125000..}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.error.1"}]}
# Уже есть VIP (уровень 26)
execute as @s[scores={lvl=26..26}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.haveVIP"}]}
# Успешное получение VIP: установка уровня 26
execute as @s[scores={lvl=25..25,money=125000..}] run scoreboard players set @s lvl 26
# Сообщение всем о получении VIP
execute as @s[scores={lvl=26..26,money=125000..}] run tellraw @a {"rawtext":[{"text":"[ §aLvL UP§r] "},{"selector":"@s[scores={money=125000..}]"},{"translate":"message.lvlup.vip"}]}
# Звук получения VIP
execute as @s[scores={lvl=26..26,money=125000..}] run execute positioned as @a run playsound minecraft.challenge.complete @a
# Сообщение игроку об успешном получении VIP
execute as @s[scores={lvl=26..26,money=125000..}] run tellraw @s {"rawtext":[{"translate":"message.lvlup.vip.success"}]}
# Списание денег за VIP
execute as @s[scores={lvl=26..26,money=125000..}] run scoreboard players remove @s money 125000