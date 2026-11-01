# --- Запасное меню: открыть, когда игрок выбрал 9-й слот (меню в руке) ---
# Вызывается из timers/ticks_5, пока меню включено. Снова откроется после смены слота и возврата.
# Не открывается: до входа в аккаунт, замороженным и в камере тюрьмы (как обычное меню).
# Переходы между сценами (кнопки) — fallback/nav.
function fallback/nav
tag @a[tag=sys:fb_open,hasitem={item=server:menu,location=slot.weapon.mainhand,quantity=0}] remove sys:fb_open
tag @a remove sys:fb_block
tag @a[tag=auth:login] add sys:fb_block
tag @a[tag=auth:register] add sys:fb_block
tag @a[tag=state:frozen] add sys:fb_block
tag @a[x=-19,y=0,z=-3,dx=3,dy=4,dz=3] add sys:fb_block
execute as @a[tag=!sys:fb_open,tag=!sys:fb_block,hasitem={item=server:menu,location=slot.weapon.mainhand}] run dialogue open @e[type=npc,tag=npc:fallback,c=1] @s fb_main
tag @a[hasitem={item=server:menu,location=slot.weapon.mainhand}] add sys:fb_open
