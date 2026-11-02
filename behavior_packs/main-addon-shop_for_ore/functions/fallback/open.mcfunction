# --- Запасное меню: открыть, когда игрок выбрал 9-й слот (меню в руке) ---
# Вызывается из timers/ticks_5, пока меню включено. Снова откроется после смены слота и возврата.
# Не открывается: до входа в аккаунт, замороженным и в камере тюрьмы (как обычное меню).
# Переходы между сценами — fallback/navigation (из timers/ticks_5), у каждой сцены свой NPC (fallback/npc_menu).
tag @a[tag=sys:fb_open,hasitem={item=server:menu,location=slot.weapon.mainhand,quantity=0}] remove sys:fb_open
tag @a[tag=sys:fb_pre,hasitem={item=server:menu,location=slot.weapon.mainhand,quantity=0}] remove sys:fb_pre
tag @a remove sys:fb_block
tag @a[tag=auth:login] add sys:fb_block
tag @a[tag=auth:register] add sys:fb_block
tag @a[tag=state:frozen] add sys:fb_block
tag @a[x=-19,y=0,z=-3,dx=3,dy=4,dz=3] add sys:fb_block
# Открытие в два шага, через 5 тиков: сначала NPC главной сцены переносится к игроку (sys:fb_pre), потом окно.
# Кнопки работают, только когда NPC рядом с игроком, и адресуют ближайшего к NPC игрока (@initiator после
# /dialogue open пуст); окно NPC, перенесённого издалека в тот же тик, кнопкам не отвечает (проверено в игре).
execute as @a[tag=sys:fb_pre,tag=!sys:fb_open,tag=!sys:fb_block,hasitem={item=server:menu,location=slot.weapon.mainhand}] at @s run tp @e[type=npc,tag=npc:fb_main,c=1] ~ ~ ~
execute as @a[tag=sys:fb_pre,tag=!sys:fb_open,tag=!sys:fb_block,hasitem={item=server:menu,location=slot.weapon.mainhand}] at @s run dialogue open @e[type=npc,tag=npc:fb_main,c=1] @s fb_main
tag @a[tag=sys:fb_pre,hasitem={item=server:menu,location=slot.weapon.mainhand}] add sys:fb_open
tag @a[tag=sys:fb_block,hasitem={item=server:menu,location=slot.weapon.mainhand}] add sys:fb_open
tag @a[tag=sys:fb_open] remove sys:fb_pre
execute as @a[tag=!sys:fb_open,tag=!sys:fb_block,hasitem={item=server:menu,location=slot.weapon.mainhand}] at @s run tp @e[type=npc,tag=npc:fb_main,c=1] ~ ~ ~
tag @a[tag=!sys:fb_open,tag=!sys:fb_block,hasitem={item=server:menu,location=slot.weapon.mainhand}] add sys:fb_pre
