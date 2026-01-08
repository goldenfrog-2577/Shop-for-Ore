# --- Событие "Ускорение": выдача эффекта haste игрокам с определёнными условиями ---

execute as @r[tag=!host,scores={lvl=1..25,rebirth=0..0}] run tag @r add player:haste
execute as @p[tag=player:haste] run effect @a[tag=player:haste] haste 10 4 true
execute as @a[tag=player:haste] run titleraw @a title {"rawtext":[{"selector":"@p[tag=haste]"}]}
execute as @a[tag=player:haste] run titleraw @a subtitle {"rawtext":[{"translate":"message.event.haste_event"}]}
execute as @a[tag=player:haste] run tag @a remove player:haste
