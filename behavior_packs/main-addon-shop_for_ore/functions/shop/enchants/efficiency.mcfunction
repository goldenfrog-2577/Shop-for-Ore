execute as @s[scores={money=0..24999}] run tellraw @s {"rawtext":[{"translate":"message.basic.error"}]}
execute as @s[scores={money=25000..}] run scoreboard players add @s efficiency 1
execute as @s[scores={money=25000..}] run tellraw @s {"rawtext":[{"translate":"message.shop.enchant.efficiency"}]}
execute as @s[scores={money=25000..}] run scoreboard players remove @s money 25000
