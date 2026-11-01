# Собирает behavior_packs/.../dialogue/fallback_menu.json — сцены запасного меню на NPC.
# Запасное меню работает без Script API: тексты — ключи .lang (rawtext translate), кнопки — функции и команды.
# Открывается функцией fallback/open, когда скрипты не отвечают (fallback/check). Запуск: python3 tools/fallback_menu.py
# Цены и функции — те же, что в scripts/menu/main_menu.js; поменял там — поменяй здесь и пересобери.
# У каждой сцены свой NPC (тег npc:<сцена>, functions/fallback/npcs): кнопка открывает следующую сцену через её NPC.
# Один NPC свою же сцену из кнопки не открывает — нажатая кнопка закрывает его диалог вместе с новой сценой
# (проверено в игре). Поэтому и после покупки — переход в раздел выше (сцена другого NPC), а не та же сцена.
import json, os

BP = os.path.join(os.path.dirname(__file__), '..', 'behavior_packs', 'main-addon-shop_for_ore')
OUT = os.path.join(BP, 'dialogue', 'fallback_menu.json')
NPCS = os.path.join(BP, 'functions', 'fallback', 'npcs.mcfunction')
# NPC стоят в ряд под спавном: x 0…15, y −60, z 0 — один чанк, его держит ticking area fallback (fallback/check)
NPC_Y, NPC_Z = -60, 0
COIN, LVL, WARP = '', '', ''
MAX_LEVEL, RULES_COUNT = 40, 11


def raw(*parts):
    """rawtext: строки с «%» в начале — ключи перевода, остальное — текст."""
    out = []
    for p in parts:
        out.append({'translate': p[1:]} if p.startswith('%') else {'text': p})
    return {'rawtext': out}


def lines(prefix, n, start=1):
    """Ключи prefix.start … prefix.n через перенос строки."""
    out = []
    for i in range(start, n + 1):
        if out: out.append('\n')
        out.append(f'%{prefix}.{i}')
    return out


def npc(scene):
    return f'@e[type=npc,tag=npc:{scene},c=1]'


def open_scene(scene):
    return f'/dialogue open {npc(scene)} @initiator {scene}'


def button(name, *commands):
    commands = list(commands)
    return {'name': raw(*name) if isinstance(name, tuple) else raw(name), 'commands': commands}


def go(name, scene):
    return button(name, open_scene(scene))


def back(scene):
    return go('%menu.common.back', scene)


def fn(name, function, then):
    """Покупка/действие функцией от имени игрока, потом — раздел выше (сцена другого NPC)."""
    return button(name, f'/execute as @initiator at @s run function {function}', open_scene(then))


def tell(key):
    return f'/tellraw @initiator {json.dumps({"rawtext": [{"translate": key}]}, ensure_ascii=False)}'


def price(key, cost, glyph=COIN):
    return (f'%{key}', f'\n§8{cost} {glyph}')


def scene(tag, title, text, buttons):
    return {'scene_tag': tag, 'npc_name': raw(title), 'text': raw(*text), 'buttons': buttons}


howtoplay = [' ', *lines('menu.howtoplay.line', 5), '\n\n ', *lines('menu.howtoplay.line', 9, 6),
             '\n\n ', *lines('menu.howtoplay.line', 13, 10)]
for i in range(14, 22):
    howtoplay += ['\n\n', f'%menu.howtoplay.line.{i}']


def toggle(kind, on_cmds, off_cmds):
    return scene(f'fb_{kind}', f'%menu.settings.{kind}.title', [f'%menu.settings.{kind}.body'], [
        button('%menu.settings.button.enable', *on_cmds, tell('chat.settings.enabled'), open_scene('fb_settings')),
        button('%menu.settings.button.disable', *off_cmds, tell('chat.settings.disabled'), open_scene('fb_settings')),
        back('fb_settings')])


def board(label, fn_name, msg):
    return button(label, f'/execute as @initiator at @s run function settings/{fn_name}', tell(msg), open_scene('fb_settings'))


def warp(label, warp_id, x, y, z):
    done = json.dumps({'rawtext': [{'translate': 'chat.cmd.warp.done', 'with': {'rawtext': [{'translate': f'warp.{warp_id}'}]}}]}, ensure_ascii=False)
    return button((WARP + ' ', label), f'/tp @initiator {x} {y} {z}', f'/tellraw @initiator {done}')


scenes = [
    scene('fb_main', '%menu.main.title', ['%menu.fallback.notice'], [
        go('%menu.main.button.about', 'fb_about'),
        go('%menu.main.button.shop', 'fb_shop'),
        go('%menu.main.button.settings', 'fb_settings'),
        go('%menu.main.button.rules', 'fb_rules'),
        go('%menu.main.button.warps', 'fb_warps'),
        go('%menu.main.button.upgrades', 'fb_upgrades')]),
    # О карте
    scene('fb_about', '%menu.about.title', ['%menu.about.body'], [
        go('%menu.about.button.levels', 'fb_levels'),
        go('%menu.about.button.howtoplay', 'fb_howtoplay'),
        back('fb_main')]),
    scene('fb_levels', '%menu.levels.title', lines('menu.levels.line', MAX_LEVEL), [back('fb_about')]),
    scene('fb_howtoplay', '%menu.howtoplay.title', howtoplay, [back('fb_about')]),
    # Магазин: только то, что покупают функции
    scene('fb_shop', '%menu.shop.title', ['%menu.shop.body'], [
        go('%menu.shop.button.enchants', 'fb_enchants'),
        go('%menu.shop.button.kits', 'fb_kits'),
        go('%menu.shop.button.boosts', 'fb_boosts'),
        back('fb_main')]),
    scene('fb_enchants', '%menu.shop.enchants.pickaxe.title', ['%menu.shop.enchants.pickaxe.body'], [
        fn(price('enchantment.digging', '25.0K'), 'shop/enchants/efficiency', 'fb_shop'),
        fn(price('enchantment.lootBonusDigger', '10.0K'), 'shop/enchants/fortune', 'fb_shop'),
        back('fb_shop')]),
    scene('fb_kits', '%menu.shop.kits.title', ['%menu.shop.kits.body'], [
        fn(price('menu.shop.kits.button.iron', '15.0K'), 'shop/pvp_kits/iron', 'fb_shop'),
        fn(price('menu.shop.kits.button.diamond', '35.0K'), 'shop/pvp_kits/diamond', 'fb_shop'),
        fn(price('menu.shop.kits.button.netherite', '50.0K'), 'shop/pvp_kits/netherite', 'fb_shop'),
        back('fb_shop')]),
    scene('fb_boosts', '%menu.shop.boosts.title', ['%menu.shop.boosts.body', '\n\n', '%menu.shop.boosts.x2', '\n', '%menu.shop.boosts.x4', '\n', '%menu.shop.boosts.magnet'], [
        fn(price('menu.shop.boosts.button.x2', '10.0K'), 'boost/x2_boost', 'fb_shop'),
        fn(price('menu.shop.boosts.button.x4', '50.0K'), 'boost/x4_boost', 'fb_shop'),
        fn(price('menu.shop.boosts.button.ore_magnet', '20.0K'), 'shop/ore_magnet/ore_magnet', 'fb_shop'),
        back('fb_shop')]),
    # Настройки
    scene('fb_settings', '%menu.settings.title', ['%menu.settings.body'], [
        go('%menu.settings.button.board', 'fb_board'),
        go('%menu.settings.button.particles', 'fb_particles'),
        go('%menu.settings.button.sounds', 'fb_sounds'),
        go('%menu.settings.button.music', 'fb_music'),
        back('fb_main')]),
    scene('fb_board', '%menu.settings.board.title', ['%menu.settings.board.body'], [
        board('%menu.settings.button.enable', 'scoreboard_on', 'chat.settings.enabled'),
        board('%menu.settings.button.icons_only', 'scoreboard_icons', 'chat.settings.icons_only'),
        board('%menu.settings.button.disable', 'scoreboard_off', 'chat.settings.disabled'),
        back('fb_settings')]),
    toggle('particles', ['/tag @initiator add player:particle'], ['/tag @initiator remove player:particle']),
    toggle('sounds', ['/tag @initiator add player:sound'], ['/tag @initiator remove player:sound']),
    toggle('music', ['/tag @initiator remove player:music_off'], ['/tag @initiator add player:music_off', '/stopsound @initiator music.game']),
    # Правила
    scene('fb_rules', '%menu.rules.title', ['%menu.rules.header', '\n\n', *lines('menu.rules.line', RULES_COUNT), '\n\n', '%menu.rules.footer'], [back('fb_main')]),
    # Телепортации: точки без скриптов (PvP-арена, сплиф и тир работают на скриптах — их нет)
    scene('fb_warps', '%menu.warps.title', ['%menu.warps.body'], [
        warp('%menu.warps.button.spawn', 'spawn', 0, 5, 0),
        button((WARP + ' ', '%menu.warps.button.mine'), '/execute as @initiator at @s run function fallback/warp_mine'),
        warp('%menu.warps.button.minigames', 'minigames', -109, 5, -60),
        button((WARP + ' ', '%menu.warps.button.vip'), '/execute as @initiator at @s run function fallback/warp_vip'),
        back('fb_main')]),
    # Прокачка
    scene('fb_upgrades', '%menu.upgrades.title', ['%menu.upgrades.body'], [
        fn(price('menu.upgrades.button.vip', '125.0K'), 'upgrade/upgrade_vip', 'fb_main'),
        fn(price('menu.upgrades.button.rebirth', f'25 - {MAX_LEVEL}', LVL), 'upgrade/upgrade_rebirth', 'fb_main'),
        back('fb_main')]),
]
data = {'format_version': '1.17', 'minecraft:npc_dialogue': {'scenes': scenes}}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(json.dumps(data, indent='\t', ensure_ascii=True) + '\n')
# NPC: по одному на сцену
npcs = ['# --- Запасное меню: NPC сцен — по одному на сцену (тег npc:<сцена>), раз в секунду из fallback/check ---',
        '# Собирается tools/fallback_menu.py. Нет NPC — барьер под ним и призыв; пока чанк не загружен, призыв не проходит —',
        '# следующая попытка через секунду. Прежний общий NPC (npc:fallback, до отдельных NPC) убирается.',
        'kill @e[type=npc,tag=npc:fallback]']
for x, sc in enumerate(scenes):
    t = sc['scene_tag']
    npcs.append(f'execute unless entity @e[type=npc,tag=npc:{t}] run setblock {x} {NPC_Y - 1} {NPC_Z} barrier')
    npcs.append(f'execute unless entity @e[type=npc,tag=npc:{t}] run summon npc {x} {NPC_Y} {NPC_Z} minecraft:entity_spawned {t}')
    npcs.append(f'tag @e[type=npc,name={t},tag=!npc:{t}] add npc:{t}')
assert len(scenes) <= 16, 'NPC не помещаются в один чанк'
with open(NPCS, 'w', encoding='utf-8') as f:
    f.write('\n'.join(npcs) + '\n')
print('сцен:', len(scenes))
