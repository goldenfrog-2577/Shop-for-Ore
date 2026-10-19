# --- Покупка VIP (уровень 25 → 26) за 125 000 ---
# Вызывается из меню (Улучшения) от имени игрока (@s).
# Тег buy:ok отмечает успешную покупку. Раньше игрок, у которого VIP уже был и было ≥125 000,
# «покупал» VIP повторно: снова списывались деньги и всем приходило объявление.

# Уже есть VIP
execute as @s[scores={lvl=26..}] run tellraw @s {"rawtext":[{"translate":"chat.vip.error.owned"}]}
# Уровень ниже 25 или не хватает денег
execute as @s[scores={lvl=..24}] run tellraw @s {"rawtext":[{"translate":"chat.vip.error.requirements"}]}
execute as @s[scores={lvl=25,money=..124999}] run tellraw @s {"rawtext":[{"translate":"chat.vip.error.requirements"}]}

# Покупка
execute as @s[scores={lvl=25,money=125000..}] run tag @s add buy:ok
scoreboard players remove @s[tag=buy:ok] money 125000
scoreboard players set @s[tag=buy:ok] lvl 26
execute as @s[tag=buy:ok] run tellraw @a {"rawtext":[{"translate":"chat.vip.bought","with":{"rawtext":[{"selector":"@s"}]}}]}
execute as @s[tag=buy:ok] positioned as @a run playsound minecraft.challenge.complete @a
execute as @s[tag=buy:ok] run tellraw @s {"rawtext":[{"translate":"chat.vip.welcome"}]}
tag @s remove buy:ok