# --- Событие "Подарок": выдача награды и уведомления игрокам ---

execute as @a positioned ~~~ run playsound note.bell @a ~~~ 1.0 0.75
tellraw @a {"rawtext":[{"translate":"message.event.gift_event"}]}
structure load gift 0 -50 0
execute as @e[type=item,name="%tile.emerald_block.name"] run execute positioned as @r[tag=!host] run tp @s ~~5~
execute as @a[hasitem={item=minecraft:emerald_block}] run tellraw @a {"rawtext":[{"text":"§l >>§b "},{"selector":"@p[hasitem={item=minecraft:emerald_block}]"},{"translate":"message.event.gift_event.end"}]}
