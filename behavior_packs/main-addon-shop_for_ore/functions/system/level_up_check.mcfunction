# Повышение уровня: каждый тик (tick.json). Игрок на золотом блоке, у которого опыта не меньше
# стоимости уровня (табло xp_need, system/xp_need), получает +1 уровень — system/levelup_apply.
# Не больше одного уровня за тик; 40 — последний.
execute as @a[scores={lvl=1..39}] at @s if block ~~-1~ gold_block 0 if score @s xp >= @s xp_need run function system/level_up_apply
