# Разовый перенос; chunk стоек держит временная ticking area из system/setup.
# Пока хотя бы одна стойка не прогружена, готовность не выставляется.
execute if score stand_timers_migrated system matches 0 if entity @e[type=armor_stand,name="X2Boost"] if entity @e[type=armor_stand,name="X4Boost"] if entity @e[type=armor_stand,name="rainEvent"] run function system/apply_stand_timers
