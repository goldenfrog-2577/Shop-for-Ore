# Повышение уровня: каждый тик (tick.json). Игрок на золотом блоке, у которого опыта не меньше
# стоимости уровня (табло xp_need, system/xp_need), получает +1 уровень — system/level_up_apply.
# Не больше одного уровня за тик; 40 — последний.
# Проверяем актуальную стоимость перед списанием, в том числе при входе с сохранённым старым порогом.
execute as @a[scores={lvl=1..39}] at @s if block ~~-1~ gold_block 0 if score @s xp >= @s xp_need run tag @s add sys:level_check
execute if entity @a[tag=sys:level_check] run function system/xp_need
execute as @a[tag=sys:level_check,scores={lvl=1..39}] at @s if block ~~-1~ gold_block 0 if score @s xp >= @s xp_need run function system/level_up_apply
tag @a[tag=sys:level_check] remove sys:level_check
