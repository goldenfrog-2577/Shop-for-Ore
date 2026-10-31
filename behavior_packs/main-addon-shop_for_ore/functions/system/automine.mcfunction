# Перезаливка шахт (раз в 500 тиков = 25 с). Вызывается из timers/ticks_500.
# Перед заливкой игроков внутри шахты поднимаем на её поверхность (y=1),
# иначе их замуровывало в блоках.
execute as @a[x=-11,y=-4,z=7,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=0,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=-7,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=-14,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-4,y=-4,z=-14,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=3,y=-4,z=-14,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=10,y=-4,z=-14,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=10,y=-4,z=-7,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=10,y=-4,z=0,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=10,y=-4,z=7,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=-28,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=-35,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=-42,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-11,y=-4,z=-49,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=-4,y=-4,z=-49,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=3,y=-4,z=-49,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=10,y=-4,z=-49,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
execute as @a[x=10,y=-4,z=-42,dx=2,dy=4,dz=2] at @s run tp @s ~ 1 ~
# Третья локация (уровни 26–40): всех ниже пола (ямы и пустота под площадкой) — на поверхность
execute as @a[x=-15,y=-4,z=-87,dx=30,dy=4,dz=29] at @s run tp @s ~ 1 ~
fill -11 -4 9 -9 0 7 dirt
fill -11 -4 0 -9 0 2 stone
fill -11 -4 -5 -9 0 -7 coal_ore
fill -11 -4 -14 -9 0 -12 iron_ore
fill -4 -4 -14 -2 0 -12 copper_ore
fill 3 -4 -14 5 0 -12 redstone_ore
fill 12 -4 -14 10 0 -12 gold_ore
fill 12 -4 -7 10 0 -5 lapis_ore
fill 12 -4 0 10 0 2 diamond_ore
fill 12 -4 7 10 0 9 emerald_ore
fill -9 0 -26 -11 -4 -28 netherrack
fill -9 0 -33 -11 -4 -35 magma
fill -9 0 -40 -11 -4 -42 quartz_ore
fill -9 0 -47 -11 -4 -49 nether_gold_ore
fill -4 0 -47 -2 -4 -49 ancient_debris
fill 3 0 -47 5 -4 -49 netherite_block
fill 10 0 -47 12 -4 -49 obsidian
fill 10 0 -42 12 -4 -40 crying_obsidian
fill -37 -1 -68 -35 -1 -66 amethyst_cluster
# Третья локация: пол и стенки ям — обычный камень, а гранит, андезит и диорит в 1.19.50 тоже «stone»,
# поэтому кирка 26+ уровня ломает и их. Перед заливкой ям: дыры в полу (y 0) — снова камень (декор не трогаем:
# replace air), стенки ям (кольцо 5×5, y −4…−1; под полом пустота) — заново камнем.
fill -15 0 -87 15 0 -58 stone 0 replace air
fill -12 -4 -64 -8 -1 -60 stone 0
fill 9 -4 -64 13 -1 -60 stone 0
fill -12 -4 -71 -8 -1 -67 stone 0
fill 9 -4 -71 13 -1 -67 stone 0
fill -12 -4 -78 -8 -1 -74 stone 0
fill 9 -4 -78 13 -1 -74 stone 0
fill -12 -4 -85 -8 -1 -81 stone 0
fill -5 -4 -85 -1 -1 -81 stone 0
fill 2 -4 -85 6 -1 -81 stone 0
fill 9 -4 -85 13 -1 -81 stone 0
# Третья локация (уровни 26–40): 10 ям, от гранита до аметиста
fill -11 -4 -63 -9 0 -61 stone 1
fill 10 -4 -63 12 0 -61 stone 5
fill -11 -4 -70 -9 0 -68 stone 3
fill 10 -4 -70 12 0 -68 deepslate
fill -11 -4 -77 -9 0 -75 tuff
fill 10 -4 -77 12 0 -75 calcite
fill -11 -4 -84 -9 0 -82 raw_iron_block
fill -4 -4 -84 -2 0 -82 raw_gold_block
fill 3 -4 -84 5 0 -82 raw_copper_block
fill 10 -4 -84 12 0 -82 amethyst_block
