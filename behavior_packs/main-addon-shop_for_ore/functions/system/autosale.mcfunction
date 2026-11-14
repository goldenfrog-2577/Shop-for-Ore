# Автопродажа: раз в 5 тиков (timers/ticks_5) каждый, кто стоит на золотом блоке, продаёт по одному предмету
# каждого вида. Для каждого предмета: деньги (или VIP-коины), опыт — обычный, с бустом x2 и x4 (теги boost:x2 / boost:x4),
# частицы (тег player:particle; у купивших частицы продажи в Косметике — тег fx:sell, свои частицы рисует
# scripts/menu/cosmetics_shop.js), звук (тег player:sound) и списание предмета. Уровень: с какого продаётся — scores={lvl=N..40}.

## --- Шахта у спавна (уровни 1–15) ---
# --- Земля (с 1 уровня) ---
execute as @a[scores={lvl=1..40},hasitem={item=dirt}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 1
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=1..40},hasitem={item=dirt}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 1
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=1..40},hasitem={item=dirt}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 2
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=1..40},hasitem={item=dirt}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 4
execute as @a[scores={lvl=1..40},hasitem={item=dirt},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=1..40},hasitem={item=dirt},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=1..40},hasitem={item=dirt}] at @s if block ~~-1~ gold_block run clear @s dirt 0 1

# --- Булыжник (с 2 уровня) ---
execute as @a[scores={lvl=2..40},hasitem={item=cobblestone}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 2
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=2..40},hasitem={item=cobblestone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 1
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=2..40},hasitem={item=cobblestone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 2
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=2..40},hasitem={item=cobblestone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 4
execute as @a[scores={lvl=2..40},hasitem={item=cobblestone},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=2..40},hasitem={item=cobblestone},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=2..40},hasitem={item=cobblestone}] at @s if block ~~-1~ gold_block run clear @s cobblestone 0 1

# --- Уголь (с 3 уровня) ---
execute as @a[scores={lvl=3..40},hasitem={item=coal}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 2
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=3..40},hasitem={item=coal}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 2
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=3..40},hasitem={item=coal}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 4
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=3..40},hasitem={item=coal}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 8
execute as @a[scores={lvl=3..40},hasitem={item=coal},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=3..40},hasitem={item=coal},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=3..40},hasitem={item=coal}] at @s if block ~~-1~ gold_block run clear @s coal 0 1

# --- Сырое железо (с 5 уровня) ---
execute as @a[scores={lvl=5..40},hasitem={item=raw_iron}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 5
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=5..40},hasitem={item=raw_iron}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 4
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=5..40},hasitem={item=raw_iron}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 8
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=5..40},hasitem={item=raw_iron}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 16
execute as @a[scores={lvl=5..40},hasitem={item=raw_iron},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=5..40},hasitem={item=raw_iron},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=5..40},hasitem={item=raw_iron}] at @s if block ~~-1~ gold_block run clear @s raw_iron 0 1

# --- Сырая медь (с 6 уровня) ---
execute as @a[scores={lvl=6..40},hasitem={item=raw_copper}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 3
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=6..40},hasitem={item=raw_copper}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 3
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=6..40},hasitem={item=raw_copper}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 6
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=6..40},hasitem={item=raw_copper}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 12
execute as @a[scores={lvl=6..40},hasitem={item=raw_copper},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=6..40},hasitem={item=raw_copper},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=6..40},hasitem={item=raw_copper}] at @s if block ~~-1~ gold_block run clear @s raw_copper 0 1

# --- Редстоун (с 8 уровня) ---
execute as @a[scores={lvl=8..40},hasitem={item=redstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 9
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=8..40},hasitem={item=redstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 6
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=8..40},hasitem={item=redstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 12
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=8..40},hasitem={item=redstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 24
execute as @a[scores={lvl=8..40},hasitem={item=redstone},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=8..40},hasitem={item=redstone},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=8..40},hasitem={item=redstone}] at @s if block ~~-1~ gold_block run clear @s redstone 0 1

# --- Сырое золото (с 10 уровня) ---
execute as @a[scores={lvl=10..40},hasitem={item=raw_gold}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 15
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=10..40},hasitem={item=raw_gold}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 10
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=10..40},hasitem={item=raw_gold}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 20
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=10..40},hasitem={item=raw_gold}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 40
execute as @a[scores={lvl=10..40},hasitem={item=raw_gold},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=10..40},hasitem={item=raw_gold},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=10..40},hasitem={item=raw_gold}] at @s if block ~~-1~ gold_block run clear @s raw_gold 0 1

# --- Лазурит (с 11 уровня) ---
execute as @a[scores={lvl=11..40},hasitem={item=lapis_lazuli}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 11
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=11..40},hasitem={item=lapis_lazuli}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 9
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=11..40},hasitem={item=lapis_lazuli}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 18
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=11..40},hasitem={item=lapis_lazuli}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 36
execute as @a[scores={lvl=11..40},hasitem={item=lapis_lazuli},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=11..40},hasitem={item=lapis_lazuli},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=11..40},hasitem={item=lapis_lazuli}] at @s if block ~~-1~ gold_block run clear @s lapis_lazuli 0 1

# --- Алмазы (с 13 уровня) ---
execute as @a[scores={lvl=13..40},hasitem={item=diamond}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 25
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=13..40},hasitem={item=diamond}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 20
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=13..40},hasitem={item=diamond}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 40
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=13..40},hasitem={item=diamond}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 80
execute as @a[scores={lvl=13..40},hasitem={item=diamond},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=13..40},hasitem={item=diamond},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=13..40},hasitem={item=diamond}] at @s if block ~~-1~ gold_block run clear @s diamond 0 1

# --- Изумруды (с 15 уровня) ---
execute as @a[scores={lvl=15..40},hasitem={item=emerald}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 50
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=15..40},hasitem={item=emerald}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 25
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=15..40},hasitem={item=emerald}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 50
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=15..40},hasitem={item=emerald}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 100
execute as @a[scores={lvl=15..40},hasitem={item=emerald},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=15..40},hasitem={item=emerald},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=15..40},hasitem={item=emerald}] at @s if block ~~-1~ gold_block run clear @s emerald 0 1

## --- Адская шахта (уровни 16–25) ---
# --- Адский камень (с 16 уровня) ---
execute as @a[scores={lvl=16..40},hasitem={item=netherrack}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 50
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=16..40},hasitem={item=netherrack}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 50
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=16..40},hasitem={item=netherrack}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 100
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=16..40},hasitem={item=netherrack}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 200
execute as @a[scores={lvl=16..40},hasitem={item=netherrack},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=16..40},hasitem={item=netherrack},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=16..40},hasitem={item=netherrack}] at @s if block ~~-1~ gold_block run clear @s netherrack 0 1

# --- Кварц (с 17 уровня) ---
execute as @a[scores={lvl=17..40},hasitem={item=quartz}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 53
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=17..40},hasitem={item=quartz}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 53
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=17..40},hasitem={item=quartz}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 106
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=17..40},hasitem={item=quartz}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 212
execute as @a[scores={lvl=17..40},hasitem={item=quartz},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=17..40},hasitem={item=quartz},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=17..40},hasitem={item=quartz}] at @s if block ~~-1~ gold_block run clear @s quartz 0 1

# --- Золотой самородок (с 18 уровня) ---
execute as @a[scores={lvl=18..40},hasitem={item=gold_nugget}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 56
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=18..40},hasitem={item=gold_nugget}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 56
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=18..40},hasitem={item=gold_nugget}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 112
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=18..40},hasitem={item=gold_nugget}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 224
execute as @a[scores={lvl=18..40},hasitem={item=gold_nugget},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=18..40},hasitem={item=gold_nugget},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=18..40},hasitem={item=gold_nugget}] at @s if block ~~-1~ gold_block run clear @s gold_nugget 0 1

# --- Магма (с 19 уровня) ---
execute as @a[scores={lvl=19..40},hasitem={item=magma}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 59
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=19..40},hasitem={item=magma}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 59
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=19..40},hasitem={item=magma}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 118
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=19..40},hasitem={item=magma}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 236
execute as @a[scores={lvl=19..40},hasitem={item=magma},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=19..40},hasitem={item=magma},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=19..40},hasitem={item=magma}] at @s if block ~~-1~ gold_block run clear @s magma 0 1

# Позолоченный чернит иногда выпадает не блоком, а 2–5 золотыми самородками — они продаются выше, с 18 уровня
# --- Позолоченный чернит (с 20 уровня) ---
execute as @a[scores={lvl=20..40},hasitem={item=gilded_blackstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 62
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=20..40},hasitem={item=gilded_blackstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 62
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=20..40},hasitem={item=gilded_blackstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 124
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=20..40},hasitem={item=gilded_blackstone}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 248
execute as @a[scores={lvl=20..40},hasitem={item=gilded_blackstone},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=20..40},hasitem={item=gilded_blackstone},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=20..40},hasitem={item=gilded_blackstone}] at @s if block ~~-1~ gold_block run clear @s gilded_blackstone 0 1

# --- Древние обломки (с 21 уровня) ---
execute as @a[scores={lvl=21..40},hasitem={item=ancient_debris}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 65
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=21..40},hasitem={item=ancient_debris}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 65
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=21..40},hasitem={item=ancient_debris}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 130
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=21..40},hasitem={item=ancient_debris}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 260
execute as @a[scores={lvl=21..40},hasitem={item=ancient_debris},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=21..40},hasitem={item=ancient_debris},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=21..40},hasitem={item=ancient_debris}] at @s if block ~~-1~ gold_block run clear @s ancient_debris 0 1

# --- Незеритовый слиток (с 22 уровня) ---
execute as @a[scores={lvl=22..40},hasitem={item=netherite_ingot}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 75
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=22..40},hasitem={item=netherite_ingot}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 75
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=22..40},hasitem={item=netherite_ingot}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 150
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=22..40},hasitem={item=netherite_ingot}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 300
execute as @a[scores={lvl=22..40},hasitem={item=netherite_ingot},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=22..40},hasitem={item=netherite_ingot},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=22..40},hasitem={item=netherite_ingot}] at @s if block ~~-1~ gold_block run clear @s netherite_ingot 0 1

# --- Обсидиан (с 24 уровня) ---
execute as @a[scores={lvl=24..40},hasitem={item=obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 90
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=24..40},hasitem={item=obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 90
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=24..40},hasitem={item=obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 180
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=24..40},hasitem={item=obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 360
execute as @a[scores={lvl=24..40},hasitem={item=obsidian},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=24..40},hasitem={item=obsidian},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=24..40},hasitem={item=obsidian}] at @s if block ~~-1~ gold_block run clear @s obsidian 0 1

# --- Плачущий обсидиан (с 25 уровня) ---
# Опыт и с 25 уровня: до 26 нужно 66 000 опыта
execute as @a[scores={lvl=25..40},hasitem={item=crying_obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 100
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=25..40},hasitem={item=crying_obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 100
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=25..40},hasitem={item=crying_obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 200
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=25..40},hasitem={item=crying_obsidian}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 400
execute as @a[scores={lvl=25..40},hasitem={item=crying_obsidian},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=25..40},hasitem={item=crying_obsidian},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=25..40},hasitem={item=crying_obsidian}] at @s if block ~~-1~ gold_block run clear @s crying_obsidian 0 1

## --- Пещера (уровни 26–40) ---
# --- Гранит (с 26 уровня) ---
execute as @a[scores={lvl=26..40},hasitem={item=stone,data=1}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 110
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=26..40},hasitem={item=stone,data=1}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 110
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=26..40},hasitem={item=stone,data=1}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 220
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=26..40},hasitem={item=stone,data=1}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 440
execute as @a[scores={lvl=26..40},hasitem={item=stone,data=1},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=26..40},hasitem={item=stone,data=1},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=26..40},hasitem={item=stone,data=1}] at @s if block ~~-1~ gold_block run clear @s stone 1 1

# --- Андезит (с 27 уровня) ---
execute as @a[scores={lvl=27..40},hasitem={item=stone,data=5}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 120
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=27..40},hasitem={item=stone,data=5}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 120
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=27..40},hasitem={item=stone,data=5}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 240
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=27..40},hasitem={item=stone,data=5}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 480
execute as @a[scores={lvl=27..40},hasitem={item=stone,data=5},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=27..40},hasitem={item=stone,data=5},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=27..40},hasitem={item=stone,data=5}] at @s if block ~~-1~ gold_block run clear @s stone 5 1

# --- Диорит (с 28 уровня) ---
execute as @a[scores={lvl=28..40},hasitem={item=stone,data=3}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 130
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=28..40},hasitem={item=stone,data=3}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 130
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=28..40},hasitem={item=stone,data=3}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 260
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=28..40},hasitem={item=stone,data=3}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 520
execute as @a[scores={lvl=28..40},hasitem={item=stone,data=3},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=28..40},hasitem={item=stone,data=3},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=28..40},hasitem={item=stone,data=3}] at @s if block ~~-1~ gold_block run clear @s stone 3 1

# --- Глубинный сланец (с 30 уровня) ---
execute as @a[scores={lvl=30..40},hasitem={item=cobbled_deepslate}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 145
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=30..40},hasitem={item=cobbled_deepslate}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 145
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=30..40},hasitem={item=cobbled_deepslate}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 290
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=30..40},hasitem={item=cobbled_deepslate}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 580
execute as @a[scores={lvl=30..40},hasitem={item=cobbled_deepslate},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=30..40},hasitem={item=cobbled_deepslate},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=30..40},hasitem={item=cobbled_deepslate}] at @s if block ~~-1~ gold_block run clear @s cobbled_deepslate 0 1

# --- Туф (с 31 уровня) ---
execute as @a[scores={lvl=31..40},hasitem={item=tuff}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 160
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=31..40},hasitem={item=tuff}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 160
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=31..40},hasitem={item=tuff}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 320
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=31..40},hasitem={item=tuff}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 640
execute as @a[scores={lvl=31..40},hasitem={item=tuff},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=31..40},hasitem={item=tuff},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=31..40},hasitem={item=tuff}] at @s if block ~~-1~ gold_block run clear @s tuff 0 1

# --- Кальцит (с 33 уровня) ---
execute as @a[scores={lvl=33..40},hasitem={item=calcite}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 175
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=33..40},hasitem={item=calcite}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 175
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=33..40},hasitem={item=calcite}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 350
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=33..40},hasitem={item=calcite}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 700
execute as @a[scores={lvl=33..40},hasitem={item=calcite},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=33..40},hasitem={item=calcite},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=33..40},hasitem={item=calcite}] at @s if block ~~-1~ gold_block run clear @s calcite 0 1

# --- Блок рудного железа (с 34 уровня) ---
execute as @a[scores={lvl=34..40},hasitem={item=raw_iron_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 190
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=34..40},hasitem={item=raw_iron_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 190
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=34..40},hasitem={item=raw_iron_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 380
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=34..40},hasitem={item=raw_iron_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 760
execute as @a[scores={lvl=34..40},hasitem={item=raw_iron_block},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=34..40},hasitem={item=raw_iron_block},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=34..40},hasitem={item=raw_iron_block}] at @s if block ~~-1~ gold_block run clear @s raw_iron_block 0 1

# --- Блок рудного золота (с 35 уровня) ---
execute as @a[scores={lvl=35..40},hasitem={item=raw_gold_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 210
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=35..40},hasitem={item=raw_gold_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 210
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=35..40},hasitem={item=raw_gold_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 420
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=35..40},hasitem={item=raw_gold_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 840
execute as @a[scores={lvl=35..40},hasitem={item=raw_gold_block},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=35..40},hasitem={item=raw_gold_block},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=35..40},hasitem={item=raw_gold_block}] at @s if block ~~-1~ gold_block run clear @s raw_gold_block 0 1

# --- Блок рудной меди (с 37 уровня) ---
execute as @a[scores={lvl=37..40},hasitem={item=raw_copper_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 230
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=37..40},hasitem={item=raw_copper_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 230
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=37..40},hasitem={item=raw_copper_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 460
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=37..40},hasitem={item=raw_copper_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 920
execute as @a[scores={lvl=37..40},hasitem={item=raw_copper_block},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=37..40},hasitem={item=raw_copper_block},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=37..40},hasitem={item=raw_copper_block}] at @s if block ~~-1~ gold_block run clear @s raw_copper_block 0 1

# --- Блок аметиста (с 39 уровня) ---
execute as @a[scores={lvl=39..40},hasitem={item=amethyst_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s money 250
execute as @a[tag=!boost:x2,tag=!boost:x4,scores={lvl=39..40},hasitem={item=amethyst_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 250
execute as @a[tag=boost:x2,tag=!boost:x4,scores={lvl=39..40},hasitem={item=amethyst_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 500
execute as @a[tag=boost:x4,tag=!boost:x2,scores={lvl=39..40},hasitem={item=amethyst_block}] at @s if block ~~-1~ gold_block run scoreboard players add @s xp 1000
execute as @a[scores={lvl=39..40},hasitem={item=amethyst_block},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[scores={lvl=39..40},hasitem={item=amethyst_block},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[scores={lvl=39..40},hasitem={item=amethyst_block}] at @s if block ~~-1~ gold_block run clear @s amethyst_block 0 1

## --- VIP-шахта (VIP-остров) ---
# --- Аметист (только VIP) ---
# Осколки из VIP-шахты — за VIP-коины
execute as @a[tag=player:vip,hasitem={item=amethyst_shard}] at @s if block ~~-1~ gold_block run scoreboard players add @s vip_coins 1
# Счётчик для достижения «Аметистовая лихорадка» (scripts/system/achievements.js)
execute as @a[tag=player:vip,hasitem={item=amethyst_shard}] at @s if block ~~-1~ gold_block run scoreboard players add @s stat_amethyst 1
execute as @a[tag=player:vip,hasitem={item=amethyst_shard},tag=player:particle,tag=!fx:sell] at @s if block ~~-1~ gold_block run particle minecraft:totem_particle ~~~
execute as @a[tag=player:vip,hasitem={item=amethyst_shard},tag=player:sound] at @s if block ~~-1~ gold_block run playsound random.pop @s
execute as @a[tag=player:vip,hasitem={item=amethyst_shard}] at @s if block ~~-1~ gold_block run clear @s amethyst_shard 0 1

## --- Особые предметы ---
# --- Изумрудный блок ---
# Подарок из events/gift_event: первый, кто подобрал, объявляется всем (gift system > 0, пока подарок не найден).
# Продаётся сразу, без золотого блока, за 150
execute if score gift system matches 1.. as @a[hasitem={item=emerald_block}] run tellraw @a {"rawtext":[{"translate":"chat.event.gift_end","with":{"rawtext":[{"selector":"@s"}]}}]}
execute if score gift system matches 1.. if entity @a[hasitem={item=emerald_block}] run scoreboard players set gift system 0
execute as @a[scores={lvl=1..40},hasitem={item=emerald_block}] run scoreboard players add @s money 150
execute as @a[scores={lvl=1..40},hasitem={item=emerald_block}] run clear @s emerald_block 0 1