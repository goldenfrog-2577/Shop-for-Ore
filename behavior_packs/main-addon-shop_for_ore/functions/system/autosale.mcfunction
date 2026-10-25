# --- Dirt (Земля) ---
# Продажа земли: деньги, опыт, эффекты
execute at @a[scores={lvl=1..25},hasitem={item=dirt}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 1
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=1..25},hasitem={item=dirt}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 1
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=1..25},hasitem={item=dirt}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 2
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=1..25},hasitem={item=dirt}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 4
execute at @a[scores={lvl=1..25},hasitem={item=dirt},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=1..25},hasitem={item=dirt},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=1..25},hasitem={item=dirt}] run execute if block ~~-1~ gold_block run clear @p dirt 0 1

# --- Cobblestone (Булыжник) ---
# Продажа булыжника: деньги, опыт, эффекты
execute at @a[scores={lvl=2..25},hasitem={item=cobblestone}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 2
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=2..25},hasitem={item=cobblestone}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 1
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=2..25},hasitem={item=cobblestone}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 3
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=2..25},hasitem={item=cobblestone}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 4
execute at @a[scores={lvl=2..25},hasitem={item=cobblestone},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=2..25},hasitem={item=cobblestone},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=2..25},hasitem={item=cobblestone}] run execute if block ~~-1~ gold_block run clear @p cobblestone 0 1

# --- Coal (Уголь) ---
# Продажа угля: деньги, опыт, эффекты
execute at @a[scores={lvl=3..25},hasitem={item=coal}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 2
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=3..25},hasitem={item=coal}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 2
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=3..25},hasitem={item=coal}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 4
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=3..25},hasitem={item=coal}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 8
execute at @a[scores={lvl=3..25},hasitem={item=coal},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=3..25},hasitem={item=coal},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=3..25},hasitem={item=coal}] run execute if block ~~-1~ gold_block run clear @p coal 0 1

# --- Iron (Сырой железо) ---
# Продажа сырого железа: деньги, опыт, эффекты
execute at @a[scores={lvl=5..25},hasitem={item=raw_iron}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 5
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=5..25},hasitem={item=raw_iron}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 4
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=5..25},hasitem={item=raw_iron}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 8
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=5..25},hasitem={item=raw_iron}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 16
execute at @a[scores={lvl=5..25},hasitem={item=raw_iron},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=5..25},hasitem={item=raw_iron},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=5..25},hasitem={item=raw_iron}] run execute if block ~~-1~ gold_block run clear @p raw_iron 0 1

# --- Copper (Сырая медь) ---
# Продажа сырой меди: деньги, опыт, эффекты
execute at @a[scores={lvl=6..25},hasitem={item=raw_copper}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 3
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=6..25},hasitem={item=raw_copper}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 3
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=6..25},hasitem={item=raw_copper}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 6
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=6..25},hasitem={item=raw_copper}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 12
execute at @a[scores={lvl=6..25},hasitem={item=raw_copper},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=6..25},hasitem={item=raw_copper},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=6..25},hasitem={item=raw_copper}] run execute if block ~~-1~ gold_block run clear @p raw_copper 0 1

# --- Redstone (Редстоун) ---
# Продажа редстоуна: деньги, опыт, эффекты
execute at @a[scores={lvl=8..25},hasitem={item=redstone}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 9
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=8..25},hasitem={item=redstone}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 6
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=8..25},hasitem={item=redstone}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 12
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=8..25},hasitem={item=redstone}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 24
execute at @a[scores={lvl=8..25},hasitem={item=redstone},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=8..25},hasitem={item=redstone},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=8..25},hasitem={item=redstone}] run execute if block ~~-1~ gold_block run clear @p redstone 0 1

# --- Gold (Сырое золото) ---
# Продажа сырого золота: деньги, опыт, эффекты
execute at @a[scores={lvl=10..25},hasitem={item=raw_gold}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 15
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=10..25},hasitem={item=raw_gold}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 10
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=10..25},hasitem={item=raw_gold}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 20
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=10..25},hasitem={item=raw_gold}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 40
execute at @a[scores={lvl=10..25},hasitem={item=raw_gold},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=10..25},hasitem={item=raw_gold},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=10..25},hasitem={item=raw_gold}] run execute if block ~~-1~ gold_block run clear @p raw_gold 0 1

# --- Lapis (Лазурит) ---
# Продажа лазурита: деньги, опыт, эффекты
execute at @a[scores={lvl=11..25},hasitem={item=lapis_lazuli}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 11
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=11..25},hasitem={item=lapis_lazuli}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 9
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=11..25},hasitem={item=lapis_lazuli}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 18
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=11..25},hasitem={item=lapis_lazuli}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 36
execute at @a[scores={lvl=11..25},hasitem={item=lapis_lazuli},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=11..25},hasitem={item=lapis_lazuli},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=11..25},hasitem={item=lapis_lazuli}] run execute if block ~~-1~ gold_block run clear @p lapis_lazuli 0 1

# --- Diamonds (Алмазы) ---
# Продажа алмазов: деньги, опыт, эффекты
execute at @a[scores={lvl=13..25},hasitem={item=diamond}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 25
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=13..25},hasitem={item=diamond}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 20
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=13..25},hasitem={item=diamond}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 40
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=13..25},hasitem={item=diamond}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 80
execute at @a[scores={lvl=13..25},hasitem={item=diamond},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=13..25},hasitem={item=diamond},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=13..25},hasitem={item=diamond}] run execute if block ~~-1~ gold_block run clear @p diamond 0 1

# --- Emeralds (Изумруды) ---
# Продажа изумрудов: деньги, опыт, эффекты
execute at @a[scores={lvl=15..25},hasitem={item=emerald}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 50
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=15..25},hasitem={item=emerald}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 25
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=15..25},hasitem={item=emerald}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 50
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=15..25},hasitem={item=emerald}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 100
execute at @a[scores={lvl=15..25},hasitem={item=emerald},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=15..25},hasitem={item=emerald},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=15..25},hasitem={item=emerald}] run execute if block ~~-1~ gold_block run clear @p emerald 0 1

# --- Netherrack (Адский камень) ---
# Продажа адского камня: деньги, опыт, эффекты
execute at @a[scores={lvl=16..25},hasitem={item=netherrack}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 50
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=16..25},hasitem={item=netherrack}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 50
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=16..25},hasitem={item=netherrack}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 100
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=16..25},hasitem={item=netherrack}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 200
execute at @a[scores={lvl=15..25},hasitem={item=netherrack},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=16..25},hasitem={item=netherrack},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=16..25},hasitem={item=netherrack}] run execute if block ~~-1~ gold_block run clear @p netherrack 0 1

# --- Magma (Магма) ---
# Продажа магмы: деньги, опыт, эффекты
execute at @a[scores={lvl=17..25},hasitem={item=magma}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 53
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=17..25},hasitem={item=magma}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 53
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=17..25},hasitem={item=magma}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 106
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=17..25},hasitem={item=magma}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 212
execute at @a[scores={lvl=17..25},hasitem={item=magma},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=17..25},hasitem={item=magma},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=17..25},hasitem={item=magma}] run execute if block ~~-1~ gold_block run clear @p magma 0 1

# --- Quartz (Кварц) ---
# Продажа кварца: деньги, опыт, эффекты
execute at @a[scores={lvl=18..25},hasitem={item=quartz}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 56
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=18..25},hasitem={item=quartz}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 56
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=18..25},hasitem={item=quartz}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 112
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=18..25},hasitem={item=quartz}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 224
execute at @a[scores={lvl=18..25},hasitem={item=quartz},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=18..25},hasitem={item=quartz},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=18..25},hasitem={item=quartz}] run execute if block ~~-1~ gold_block run clear @p quartz 0 1

# --- Gold Nugget (Золотой самородок) ---
# Продажа золотого самородка: деньги, опыт, эффекты
execute at @a[scores={lvl=19..25},hasitem={item=gold_nugget}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 59
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=19..25},hasitem={item=gold_nugget}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 59
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=19..25},hasitem={item=gold_nugget}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 118
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=19..25},hasitem={item=gold_nugget}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 236
execute at @a[scores={lvl=19..25},hasitem={item=gold_nugget},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=19..25},hasitem={item=gold_nugget},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=19..25},hasitem={item=gold_nugget}] run execute if block ~~-1~ gold_block run clear @p gold_nugget 0 1

# --- Ancient Debris (Древние обломки) ---
# Продажа древних обломков: деньги, опыт, эффекты
execute at @a[scores={lvl=20..25},hasitem={item=ancient_debris}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 65
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=20..25},hasitem={item=ancient_debris}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 65
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=20..25},hasitem={item=ancient_debris}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 130
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=20..25},hasitem={item=ancient_debris}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 260
execute at @a[scores={lvl=20..25},hasitem={item=ancient_debris},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=20..25},hasitem={item=ancient_debris},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=20..25},hasitem={item=ancient_debris}] run execute if block ~~-1~ gold_block run clear @p ancient_debris 0 1

# --- Netherite Ingot (Незеритовый слиток) ---
# Продажа незеритового слитка: деньги, опыт, эффекты
execute at @a[scores={lvl=22..25},hasitem={item=netherite_ingot}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 75
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=22..25},hasitem={item=netherite_ingot}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 75
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=22..25},hasitem={item=netherite_ingot}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 150
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=22..25},hasitem={item=netherite_ingot}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 300
execute at @a[scores={lvl=22..25},hasitem={item=netherite_ingot},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=22..25},hasitem={item=netherite_ingot},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=22..25},hasitem={item=netherite_ingot}] run execute if block ~~-1~ gold_block run clear @p netherite_ingot 0 1

# --- Obsidian (Обсидиан) ---
# Продажа обсидиана: деньги, опыт, эффекты
execute at @a[scores={lvl=24..25},hasitem={item=obsidian}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 90
execute at @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=24..25},hasitem={item=obsidian}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 90
execute at @a[tag=boost:x2,tag=!boost:x4,scores={lvl=24..25},hasitem={item=obsidian}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 180
execute at @a[tag=boost:x4,tag=!boost:x2,scores={lvl=24..25},hasitem={item=obsidian}] run execute if block ~~-1~ gold_block run scoreboard players add @p xp 360
execute at @a[scores={lvl=24..25},hasitem={item=obsidian},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=24..25},hasitem={item=obsidian},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=24..25},hasitem={item=obsidian}] run execute if block ~~-1~ gold_block run clear @p obsidian 0 1

# --- Crying Obsidian (Плачущий обсидиан) ---
# Продажа плачущего обсидиана: деньги, эффекты
execute at @a[scores={lvl=25..25},hasitem={item=crying_obsidian}] run execute if block ~~-1~ gold_block run scoreboard players add @p money 100
execute at @a[scores={lvl=25..25},hasitem={item=crying_obsidian},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute at @a[scores={lvl=25..25},hasitem={item=crying_obsidian},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=25..25},hasitem={item=crying_obsidian}] run execute if block ~~-1~ gold_block run clear @p crying_obsidian 0 1

# --- Amethyst (Аметист) ---
# Продажа аметиста (уровень 26): деньги, эффекты
execute at @a[scores={lvl=26..26},hasitem={item=amethyst_shard}] run execute if block ~~-1~ gold_block run scoreboard players add @p money2 1
execute at @a[scores={lvl=26..26},hasitem={item=amethyst_shard},tag=player:particle] run execute if block ~~-1~ gold_block run particle minecraft:lava_particle ~~~
execute at @a[scores={lvl=26..26},hasitem={item=amethyst_shard},tag=player:sound] run execute if block ~~-1~ gold_block run playsound random.pop @p
execute at @a[scores={lvl=26..26},hasitem={item=amethyst_shard}] run execute if block ~~-1~ gold_block run clear @p amethyst_shard 0 1

# --- Coins (Золотой слиток) ---
# Продажа золотого слитка: деньги
execute at @a[scores={lvl=1..26},hasitem={item=gold_ingot}] run scoreboard players add @p money 3
execute at @a[scores={lvl=1..26},hasitem={item=gold_ingot}] run clear @p gold_ingot 0 1

# --- Gift (Изумрудный блок) ---
# Подарок из events/gift_event: первый, кто подобрал, объявляется всем (gift system > 0, пока подарок не найден)
execute if score gift system matches 1.. as @a[hasitem={item=emerald_block}] run tellraw @a {"rawtext":[{"translate":"chat.event.gift_end","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score gift system matches 1.. if entity @a[hasitem={item=emerald_block}] run scoreboard players set gift system 0
# Продажа изумрудного блока: много денег (@s — сам владелец блока; раньше @p искал ближайшего к точке запуска функции)
execute as @a[scores={lvl=1..26},hasitem={item=emerald_block}] run scoreboard players add @s money 150
execute as @a[scores={lvl=1..26},hasitem={item=emerald_block}] run clear @s emerald_block 0 1