execute as @s[scores={money=0..9999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}
execute as @s[scores={money=10000..}] run scoreboard players add @s fortune 1
execute as @s[scores={money=10000..}] run tellraw @s {"rawtext":[{"translate":"message.shop.enchant.fortune"}]}
execute as @s[scores={money=10000..}] run scoreboard players remove @s money 10000
