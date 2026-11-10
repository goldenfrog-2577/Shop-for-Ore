# Собирает behavior_packs/.../dialogue/fallback_menu.json — сцены запасного меню на NPC.
# Запасное меню работает без Script API: тексты — ключи .lang (rawtext translate), кнопки — функции и команды.
# Открывается функцией fallback/open, когда скрипты не отвечают (fallback/check). Запуск: python3 tools/fallback_menu.py
# Цены и функции — те же, что в scripts/menu/main_menu.js; поменял там — поменяй здесь и пересобери.
# Переход на другую сцену: кнопка ставит игроку теги sys:fb_go_<сцена> и sys:fb_nav, а сцену открывает функция
# functions/fallback/navigation не раньше чем через 5 тиков (timers/ticks_5: sys:fb_nav → sys:fb_nav_ready → navigation).
# Проверено в игре: команда /dialogue open из кнопки не открывает сцену (окно закрывается вслед за нажатием),
# а из чата и из функции — открывает. У каждой сцены свой NPC (тег npc:<сцена>, functions/fallback/npc_menu).
# Проверено в игре: команды кнопок выполняет NPC, а @initiator пуст — сцену открыла команда /dialogue open, а не
# нажатие на NPC. И кнопки срабатывают, только когда NPC рядом с игроком и не в блоках (NPC в земле под игроком —
# окно открывается, а кнопки молчат). Поэтому перед открытием NPC сцены переносится прямо к игроку (~ ~ ~), а кнопки
# адресуют ближайшего к NPC игрока — @p[r=4]. Пока игрок держит меню (sys:fb_open), NPC остаётся при нём;
# убрал меню или ушёл — NPC возвращается домой (fallback/npc_menu). Окно NPC, перенесённого издалека в тот же тик,
# кнопкам не отвечает — поэтому NPC переносится за 5 тиков до открытия (fallback/bring, потом fallback/navigation).
import json, os

BP = os.path.join(os.path.dirname(__file__), '..', 'behavior_packs', 'main-addon-shop_for_ore')
OUT = os.path.join(BP, 'dialogue', 'fallback_menu.json')
NPCS = os.path.join(BP, 'functions', 'fallback', 'npc_menu.mcfunction')
NAV = os.path.join(BP, 'functions', 'fallback', 'navigation.mcfunction')
BRING = os.path.join(BP, 'functions', 'fallback', 'bring.mcfunction')
GO, NAV_TAG, READY = 'sys:fb_go_', 'sys:fb_nav', 'sys:fb_nav_ready'
# NPC стоят в ряд под спавном: x 0…15, y −60, z 0 — один чанк, его держит ticking area fallback (fallback/check)
NPC_Y, NPC_Z = -60, 0
# Игрок, нажавший кнопку: ближайший к NPC сцены, который стоит там же, где игрок (см. выше)
PL = '@p[r=4]'
COIN, LVL = '', ''  # глифы цен: коин и уровень
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


def bring(players, scene):
    """Перенести NPC сцены к игроку (до /dialogue open) — команда функции, не кнопки."""
    return f'execute as {players} at @s run tp {npc(scene)} ~ ~ ~'


def open_scene(scene):
    return f'/tag {PL} add {GO}{scene[3:]}'


def button(name, *commands):
    commands = list(commands)
    if any(c.startswith(f'/tag {PL} add {GO}') for c in commands): commands.append(f'/tag {PL} add {NAV_TAG}')
    return {'name': raw(*name) if isinstance(name, tuple) else raw(name), 'commands': commands}


def go(name, scene):
    return button(name, open_scene(scene))


def back(scene):
    return go(B('back'), scene)


def fn(name, function, then):
    """Покупка/действие функцией от имени игрока, потом — раздел выше (сцена другого NPC)."""
    return button(name, f'/execute as {PL} at @s run function {function}', open_scene(then))


def tell(key):
    return f'/tellraw {PL} {json.dumps({"rawtext": [{"translate": key}]}, ensure_ascii=False)}'


def B(name):
    """Название кнопки — ключ legacy_menu.button.<name>: глиф и текст, не длиннее 16 символов (иначе обрезается)."""
    return f'%legacy_menu.button.{name}'


def prices(*items):
    """Цены — в тексте сцены (у кнопки одна строка): «<кнопка> — <цена> <глиф>» построчно."""
    out = ['\n']
    for name, cost, *glyph in items:
        out += ['\n', B(name), f' §7— {cost} §r§7{glyph[0] if glyph else COIN}']
    return out


def scene(tag, title, text, buttons):
    """Заголовок — §l§8 и название кнопки этого раздела (глиф и короткий текст): длинный заголовок обрезается."""
    assert len(buttons) <= 6, f'{tag}: больше 6 кнопок — игра не загружает такую сцену (проверено в игре)'
    name = raw(title) if title.startswith('%menu.') else {'rawtext': [{'text': '§l§8'}, {'translate': title[1:]}]}
    return {'scene_tag': tag, 'npc_name': name, 'text': raw(*text), 'buttons': buttons}


howtoplay = [' ', *lines('menu.howtoplay.line', 5), '\n\n ', *lines('menu.howtoplay.line', 9, 6),
             '\n\n ', *lines('menu.howtoplay.line', 13, 10)]
for i in range(14, 22):
    howtoplay += ['\n\n', f'%menu.howtoplay.line.{i}']


def toggle(kind, on_cmds, off_cmds):
    return scene(f'fb_{kind}', B(kind), [f'%menu.settings.{kind}.body'], [
        button(B('enable'), *on_cmds, tell('chat.settings.enabled'), open_scene('fb_settings')),
        button(B('disable'), *off_cmds, tell('chat.settings.disabled'), open_scene('fb_settings')),
        back('fb_settings')])


def board(label, fn_name, msg):
    return button(label, f'/execute as {PL} at @s run function settings/{fn_name}', tell(msg), open_scene('fb_settings'))


def warp(label, warp_id, x, y, z):
    done = json.dumps({'rawtext': [{'translate': 'chat.cmd.warp.done', 'with': {'rawtext': [{'translate': f'warp.{warp_id}'}]}}]}, ensure_ascii=False)
    return button(label, f'/tellraw {PL} {done}', f'/tp {PL} {x} {y} {z}')  # сначала сообщение: после tp игрок уже не рядом с NPC


scenes = [
    scene('fb_main', '%menu.main.title', ['%legacy_menu.notice', '\n\n', '%legacy_menu.promo'], [
        go(B('about'), 'fb_about'),
        go(B('shop'), 'fb_shop'),
        go(B('settings'), 'fb_settings'),
        go(B('rules'), 'fb_rules'),
        go(B('warps'), 'fb_warps'),
        go(B('upgrades'), 'fb_upgrades')]),
    # О карте
    scene('fb_about', B('about'), ['%menu.about.body'], [
        go(B('levels'), 'fb_levels'),
        go(B('howtoplay'), 'fb_howtoplay'),
        back('fb_main')]),
    scene('fb_levels', B('levels'), lines('menu.levels.line', MAX_LEVEL), [back('fb_about')]),
    scene('fb_howtoplay', B('howtoplay'), howtoplay, [back('fb_about')]),
    # Магазин: только то, что покупают функции
    scene('fb_shop', B('shop'), ['%menu.shop.body'], [
        go(B('enchants'), 'fb_enchants'),
        go(B('kits'), 'fb_kits'),
        go(B('boosts'), 'fb_boosts'),
        back('fb_main')]),
    scene('fb_enchants', B('enchants'), ['%menu.shop.enchants.pickaxe.body', *prices(('efficiency', '25.0K'), ('fortune', '10.0K'))], [
        fn(B('efficiency'), 'shop/enchants/efficiency', 'fb_shop'),
        fn(B('fortune'), 'shop/enchants/fortune', 'fb_shop'),
        back('fb_shop')]),
    scene('fb_kits', B('kits'), ['%menu.shop.kits.body', *prices(('kit_iron', '15.0K'), ('kit_diamond', '35.0K'), ('kit_netherite', '50.0K'))], [
        fn(B('kit_iron'), 'shop/pvp_kits/iron', 'fb_shop'),
        fn(B('kit_diamond'), 'shop/pvp_kits/diamond', 'fb_shop'),
        fn(B('kit_netherite'), 'shop/pvp_kits/netherite', 'fb_shop'),
        back('fb_shop')]),
    scene('fb_boosts', B('boosts'), ['%menu.shop.boosts.body', '\n\n', '%menu.shop.boosts.x2', '\n', '%menu.shop.boosts.x4', '\n', '%menu.shop.boosts.magnet',
                                                   *prices(('x2', '10.0K'), ('x4', '50.0K'), ('magnet', '20.0K'))], [
        fn(B('x2'), 'boost/x2_boost', 'fb_shop'),
        fn(B('x4'), 'boost/x4_boost', 'fb_shop'),
        fn(B('magnet'), 'shop/ore_magnet/ore_magnet', 'fb_shop'),
        back('fb_shop')]),
    # Настройки
    scene('fb_settings', B('settings'), ['%menu.settings.body'], [
        go(B('board'), 'fb_board'),
        go(B('particles'), 'fb_particles'),
        go(B('sounds'), 'fb_sounds'),
        go(B('music'), 'fb_music'),
        back('fb_main')]),
    scene('fb_board', B('board'), ['%menu.settings.board.body'], [
        board(B('enable'), 'scoreboard_on', 'chat.settings.enabled'),
        board(B('icons_only'), 'scoreboard_icons', 'chat.settings.icons_only'),
        board(B('disable'), 'scoreboard_off', 'chat.settings.disabled'),
        back('fb_settings')]),
    toggle('particles', [f'/tag {PL} add player:particle'], [f'/tag {PL} remove player:particle']),
    toggle('sounds', [f'/tag {PL} add player:sound'], [f'/tag {PL} remove player:sound']),
    toggle('music', [f'/tag {PL} remove player:music_off'], [f'/tag {PL} add player:music_off', f'/stopsound {PL} music.game']),
    # Правила
    scene('fb_rules', B('rules'), ['%menu.rules.header', '\n\n', *lines('menu.rules.line', RULES_COUNT), '\n\n', '%menu.rules.footer'], [back('fb_main')]),
    # Телепортации: точки без скриптов (PvP-арена, сплиф и тир работают на скриптах — их нет)
    scene('fb_warps', B('warps'), ['%menu.warps.body'], [
        warp(B('spawn'), 'spawn', 0, 5, 0),
        button(B('mine'), f'/execute as {PL} at @s run function fallback/warp_mine'),
        warp(B('minigames'), 'minigames', -109, 5, -60),
        button(B('vip_island'), f'/execute as {PL} at @s run function fallback/warp_vip'),
        back('fb_main')]),
    # Прокачка
    scene('fb_upgrades', B('upgrades'), ['%menu.upgrades.body', *prices(('vip', '125.0K'), ('rebirth', f'25 - {MAX_LEVEL}', LVL))], [
        fn(B('vip'), 'upgrade/upgrade_vip', 'fb_main'),
        fn(B('rebirth'), 'upgrade/upgrade_rebirth', 'fb_main'),
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
        '# Перед открытием сцены NPC переносится к игроку (fallback/open, fallback/bring): кнопки адресуют ближайшего',
        '# к NPC игрока, @initiator после /dialogue open пуст. Нет рядом игрока с меню в руке — NPC возвращается домой.',
        'kill @e[type=npc,tag=npc:fallback]']
for x, sc in enumerate(scenes):
    t = sc['scene_tag']
    npcs.append(f'execute unless entity @e[type=npc,tag=npc:{t}] run setblock {x} {NPC_Y - 1} {NPC_Z} barrier')
    npcs.append(f'execute unless entity @e[type=npc,tag=npc:{t}] run summon npc {x} {NPC_Y} {NPC_Z} minecraft:entity_spawned {t}')
    npcs.append(f'tag @e[type=npc,name={t},tag=!npc:{t}] add npc:{t}')
    # Рядом нет игрока с меню в руке — домой (NPC переносится к игроку при открытии сцены)
    npcs.append(f'execute as @e[type=npc,tag=npc:{t}] at @s unless entity @a[r=6,hasitem={{item=server:menu,location=slot.weapon.mainhand}}] run tp @s {x} {NPC_Y} {NPC_Z}')
assert len(scenes) <= 16, 'NPC не помещаются в один чанк'
# Переходы: открыть сцену тем, у кого кнопка поставила тег, — уже после закрытия окна
nav = ['# --- Запасное меню: открыть сцену, выбранную кнопкой (теги sys:fb_go_<сцена>) ---',
       '# Собирается tools/fallback_menu.py. Вызывается из timers/ticks_5 для игроков с sys:fb_nav_ready — не раньше',
       '# чем через 5 тиков после нажатия: команда /dialogue open из самой кнопки сцену не открывает (проверено в игре).',
       '# Перед открытием NPC сцены переносится к игроку — иначе кнопки не сработают и не найдут, кто их нажал.']
for sc in scenes:
    t = sc['scene_tag']
    who = f'@a[tag={READY},tag={GO}{t[3:]}]'
    nav.append(bring(who, t))
    nav.append(f'execute as {who} at @s run dialogue open {npc(t)} @s {t}')
for sc in scenes:
    nav.append(f'tag @a[tag={READY}] remove {GO}{sc["scene_tag"][3:]}')
nav.append(f'tag @a remove {READY}')
# Перенос NPC к игроку — за 5 тиков до открытия сцены (timers/ticks_5: sys:fb_nav → bring, sys:fb_nav_ready → navigation)
bring_fn = ['# --- Запасное меню: NPC сцены, выбранной кнопкой, — к игроку (за 5 тиков до fallback/navigation) ---',
            '# Собирается tools/fallback_menu.py. Вызывается из timers/ticks_5 для игроков с sys:fb_nav: окно NPC,',
            '# перенесённого издалека в тот же тик, кнопкам не отвечает (проверено в игре).']
for sc in scenes:
    t = sc['scene_tag']
    bring_fn.append(bring(f'@a[tag={NAV_TAG},tag={GO}{t[3:]}]', t))
with open(BRING, 'w', encoding='utf-8') as f:
    f.write('\n'.join(bring_fn) + '\n')
with open(NAV, 'w', encoding='utf-8') as f:
    f.write('\n'.join(nav) + '\n')
with open(NPCS, 'w', encoding='utf-8') as f:
    f.write('\n'.join(npcs) + '\n')
print('сцен:', len(scenes))
