# --- Запасное меню → Телепортации → VIP-остров: только VIP и персоналу (как !warp vip) ---
tag @s remove sys:fb_ok
tag @s[tag=player:vip] add sys:fb_ok
tag @s[tag=role:helper] add sys:fb_ok
tag @s[tag=role:moder] add sys:fb_ok
tag @s[tag=role:admin] add sys:fb_ok
tag @s[tag=role:owner] add sys:fb_ok
tp @s[tag=sys:fb_ok] -60 5 -60
tellraw @s[tag=sys:fb_ok] {"rawtext":[{"translate":"chat.cmd.warp.done","with":{"rawtext":[{"translate":"warp.vip"}]}}]}
tellraw @s[tag=!sys:fb_ok] {"rawtext":[{"translate":"chat.cmd.warp.error.vip"}]}
tag @s remove sys:fb_ok
