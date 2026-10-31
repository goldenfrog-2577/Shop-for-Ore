# Кирка по уровню игрока в слоте 1 хотбара. Вызывается из timers/ticks_20.
# Кирка выдаётся, только если уровень изменился с прошлой выдачи (табло pick) или нужной кирки
# нет в слоте (например, сломалась): замена сбивает копание и сбрасывает зачарования до следующего наложения.
# В Bedrock «execute if/unless score» с несуществующим счётом не срабатывает ни в одном варианте,
# поэтому счёт сначала создаётся через «add 0».

## --- Кому выдать кирку (тег sys:pick_update) ---
scoreboard players add @a pick 0
execute as @a unless score @s pick = @s lvl run tag @s add sys:pick_update
# Нужной кирки нет в слоте 1 — выдать заново. Шахта и Незер (1–25):
tag @a[scores={lvl=1..1},hasitem={item=stick,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=2..2},hasitem={item=wooden_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=3..7},hasitem={item=stone_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=8..12},hasitem={item=iron_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=13..14},hasitem={item=diamond_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=15..25},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
# Пещера (26–40): кирки идут заново от деревянной
tag @a[scores={lvl=26..27},hasitem={item=wooden_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=28..30},hasitem={item=stone_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=31..33},hasitem={item=iron_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=34..36},hasitem={item=diamond_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
tag @a[scores={lvl=37..},hasitem={item=netherite_pickaxe,location=slot.hotbar,slot=0,quantity=0}] add sys:pick_update
# В сплифе в этом слоте лопата (scripts/system/spleef.js) — кирку не выдаём, её вернут после игры
tag @a[tag=game:spleef] remove sys:pick_update
# В тире (scripts/system/tir.js) слот 1 свободен под лук — кирку вернём при выходе из зоны
tag @a[tag=zone:tir] remove sys:pick_update

## --- Выдача ---
# Кирка уровня: что она может ломать (can_destroy). Аметист VIP-шахты (amethyst_cluster) — у каждой: VIP покупается
# с 40 уровня и остаётся после ребитха, а на VIP-остров пускает только тег player:vip (system/system)
replaceitem entity @a[tag=sys:pick_update,scores={lvl=1..1}] slot.hotbar 0 stick 1 0 {"minecraft:can_destroy":{"blocks":["dirt","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=2..2}] slot.hotbar 0 wooden_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=3..4}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=5..5}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=6..7}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=8..9}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=10..10}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=11..12}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=13..14}] slot.hotbar 0 diamond_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=15..15}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=16..16}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=17..17}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=18..18}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=19..19}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=20..21}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=22..23}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","netherite_block","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=24..24}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","netherite_block","obsidian","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=25..25}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["dirt","stone","coal_ore","iron_ore","copper_ore","redstone_ore","lit_redstone_ore","gold_ore","lapis_ore","diamond_ore","emerald_ore","netherrack","magma","quartz_ore","nether_gold_ore","ancient_debris","netherite_block","obsidian","crying_obsidian","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=26..27}] slot.hotbar 0 wooden_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=28..29}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=30..30}] slot.hotbar 0 stone_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=31..32}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","tuff","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=33..33}] slot.hotbar 0 iron_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","tuff","calcite","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=34..34}] slot.hotbar 0 diamond_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","tuff","calcite","raw_iron_block","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=35..36}] slot.hotbar 0 diamond_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","tuff","calcite","raw_iron_block","raw_gold_block","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=37..38}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","tuff","calcite","raw_iron_block","raw_gold_block","raw_copper_block","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
replaceitem entity @a[tag=sys:pick_update,scores={lvl=39..}] slot.hotbar 0 netherite_pickaxe 1 0 {"minecraft:can_destroy":{"blocks":["stone","deepslate","tuff","calcite","raw_iron_block","raw_gold_block","raw_copper_block","amethyst_block","amethyst_cluster"]},"minecraft:item_lock":{"mode":"lock_in_slot"},"minecraft:keep_on_death":{}}
# Запомнить, на каком уровне выдана
execute as @a[tag=sys:pick_update] run scoreboard players operation @s pick = @s lvl
tag @a remove sys:pick_update