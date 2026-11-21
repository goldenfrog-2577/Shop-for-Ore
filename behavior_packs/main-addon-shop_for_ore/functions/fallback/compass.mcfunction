# Один резервный компас на свободное место хотбара. keep сохраняет уже занятые ячейки.
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 6 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 5 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 4 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 3 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 2 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 1 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 8 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 7 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute unless entity @s[hasitem={item=compass}] run replaceitem entity @s slot.hotbar 0 keep compass 1 0 {"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=0}] run tag @s add sys:fb_slot_0
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=1}] run tag @s add sys:fb_slot_1
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=2}] run tag @s add sys:fb_slot_2
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=3}] run tag @s add sys:fb_slot_3
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=4}] run tag @s add sys:fb_slot_4
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=5}] run tag @s add sys:fb_slot_5
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=6}] run tag @s add sys:fb_slot_6
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=7}] run tag @s add sys:fb_slot_7
execute if entity @s[hasitem={item=compass,location=slot.hotbar,slot=8}] run tag @s add sys:fb_slot_8
execute if entity @s[hasitem={item=compass}] run tag @s add sys:fb_compass
execute if entity @s[hasitem={item=compass}] run tag @s remove sys:fb_full
execute unless entity @s[hasitem={item=compass}] unless entity @s[tag=sys:fb_full] run tellraw @s {"rawtext":[{"translate":"chat.server.compass_full"}]}
execute unless entity @s[hasitem={item=compass}] run tag @s add sys:fb_full
