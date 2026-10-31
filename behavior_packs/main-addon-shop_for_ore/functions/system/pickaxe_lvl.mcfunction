# Кирка по уровню игрока в слоте 1 хотбара. Вызывается из timers/ticks_20.
# Кирка выдаётся только если уровень изменился с прошлой выдачи (табло pick) или нужной кирки
# нет в слоте (например, сломалась). Раньше она заменялась у всех каждые 5 с: сбивалось
# копание и слетали зачарования до следующего наложения.
# В Bedrock «execute if/unless score» с несуществующим счётом не срабатывает ни в одном варианте,
# поэтому счёт сначала создаётся через «add 0».
scoreboard players add @a pick 0
execute as @a unless score @s pick = @s lvl run tag @s add sys:pick_update
tag @a[scores={lvl=1..1},hasitem={item=stick,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=2..2},hasitem={item=wooden_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=3..4},hasitem={item=stone_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=5..5},hasitem={item=stone_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=6..7},hasitem={item=stone_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=8..9},hasitem={item=iron_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=10..10},hasitem={item=iron_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=11..12},hasitem={item=iron_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=13..14},hasitem={item=diamond_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=15..15},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=16..16},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=17..17},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=18..18},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=19..19},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=20..21},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=22..23},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=24..24},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=25..},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
# В сплифе в этом слоте лопата (scripts/system/spleef.js) — кирку не выдаём, её вернут после игры
tag @a[tag=game:spleef] remove sys:pick_update
# В тире (scripts/system/tir.js) слот 1 свободен под лук — кирку вернём при выходе из зоны
tag @a[tag=zone:tir] remove sys:pick_update
replaceitem entity @a[tag=sys:pick_update,scores={lvl=1..1}] slot.hotbar 0 stick 1 0 {"minecraft:can_destroy":{"blocks":["dirt"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=2..2}] slot.hotbar 0 wooden_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=3..4}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=5..5}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=6..7}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=8..9}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=10..10}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=11..12}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=13..14}] slot.hotbar 0 diamond_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=15..15}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=16..16}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=17..17}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=18..18}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=19..19}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=20..21}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=22..23}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","netherite_block"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=24..24}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","netherite_block","obsidian"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=25..}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","netherite_block","obsidian","crying_obsidian","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
execute as @a[tag=sys:pick_update] run scoreboard players operation @s pick = @s lvl
tag @a remove sys:pick_update