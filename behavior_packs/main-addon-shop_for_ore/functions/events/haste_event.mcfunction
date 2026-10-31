# --- Событие «Ускорение»: случайный игрок (уровень 1–40, без ребитха) получает Спешку V на 10 с ---
# Запускается из timers/ticks_3600, если включено: /scoreboard players set haste settings 1
tag @r[tag=player,tag=!role:owner,scores={lvl=1..40,rebirth=0}] add player:haste
effect @a[tag=player:haste] haste 10 4 true
execute if entity @a[tag=player:haste] run titleraw @a title {"rawtext":[{"selector":"@a[tag=player:haste]"}]}
execute if entity @a[tag=player:haste] run titleraw @a subtitle {"rawtext":[{"translate":"screen.event.haste"}]}
tag @a remove player:haste