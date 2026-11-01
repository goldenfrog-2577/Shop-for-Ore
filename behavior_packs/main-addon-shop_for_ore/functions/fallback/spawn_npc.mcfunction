# --- NPC запасного меню: «владелец» сцен dialogue/fallback_menu.json ---
# Стоит под спавном на барьере (под картой пусто), игрокам не виден. Призывается, только когда его нет;
# пока чанк не загружен ticking area, призыв не проходит — следующая попытка через секунду.
setblock 0 -61 0 barrier
summon npc 0 -60 0 minecraft:entity_spawned fallback_menu
tag @e[type=npc,name=fallback_menu] add npc:fallback
