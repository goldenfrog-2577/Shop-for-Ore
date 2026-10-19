# --- Событие «Ускорение»: случайный игрок (уровень 1-25, без ребитха) получает Спешку V на 10 с ---
# Запускается из timers/t3600, если включено: /scoreboard players set haste settings 1
# Раньше тег ставился ещё одному случайному игроку (@r вместо @s), а в заголовке искался
# несуществующий тег haste — имя победителя не показывалось.
tag @r[tag=player,tag=!host,scores={lvl=1..25,rebirth=0}] add player:haste
effect @a[tag=player:haste] haste 10 4 true
execute if entity @a[tag=player:haste] run titleraw @a title {"rawtext":[{"selector":"@a[tag=player:haste]"}]}
execute if entity @a[tag=player:haste] run titleraw @a subtitle {"rawtext":[{"translate":"screen.event.haste"}]}
tag @a remove player:haste