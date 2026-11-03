# Локализация: Чат, обучение и достижения

Проверены ru_RU, en_US, uk_UA и es_ES. Цвета подписи/значения проверяются в контексте собранной формы, включая VIP, мут и присутствие бота. Числа и игровые проверки не меняются.

Ванильные названия сверены с Mojang bedrock-samples v1.19.50.2; значения берутся без табличных комментариев. Название набора Netherite и Rebirth сохраняет глоссарий владельца. Зарезервированные изменения NPC/legacy_menu не переносятся и не переписываются.

Проверки: tools/lang.py check и tools/tests/*.mjs. Новый localization.mjs проверяет четыре набора ключей и подстановки, фактическую сборку меню, цвета монет/глифов, варианты мута и статусы бота. Это проверки с моками; переносы строк и ширину окон надо проверить в игре после перезахода.

Особенно проверить: admin.enchant.title, admin.bot.button.return, menu.promo.book, menu.shop.enchants.button.pickaxe, menu.settings.menu_sounds.success.title. Подписи укорочены целыми словами; обрезания слов нет.

## Смысл и проверки кода

`chat.cmd.error.role`: «Нельзя применить к %1$s: его роль равна твоей или выше». Проверено на фактическом canPunish для всех пар ролей, включая исключение владельца и запрет наказать себя.

`chat.cmd.error.issuer`: «Ограничение выдано ролью %1$s. Снять его может эта роль или более высокая». Проверено на canLift: равная инициатору роль разрешена, более низкая запрещена. Игровые проверки не изменены.

Чат, обучение, уровни и достижения вычитаны по смыслу: в переводах возвращены редкая руда в описании VIP и бесплатный выбор купленной косметики. Украинское «кайло/бустер» и испанский Reinicio согласованы с глоссарием. Золотой самородок больше не называется слитком. Исправлены русская метка Банка в EN/ES-сообщении и опечатка Shop for Orel.

Числа и подстановки проверены относительно исходных файлов мира: изменений нет. Единственная смена цвета подстановки — ник в chat.cmd.money.vip.done: жёлтый заменён на белый, как в соседнем сообщении обычных монет; сумма остаётся жёлтой. Цвета ролей, зелёных достижений/фиолетовых испытаний, статусов и бустов сохранены.

Проверка tools/lang.py теперь различает типы %s/%d/%i/%f, повторения и порядок ненумерованных параметров; три отдельные Python-проверки проходят.

## Граница работы Claude

В мире сохранены все 34 legacy_menu-ключа и отсутствующий там старый menu.fallback.notice не восстановлен. Все 33 короткие подписи NPC во всех языках не длиннее 16 символов. В legacy_menu.notice осталась фраза, что промокоды недоступны без скриптов; после добавления книг она требует пересмотра Claude. Его NPC-реализация и тексты не переписаны.

## Изменённые ключи

| Ключ | Языки с изменениями | Причина |
|---|---|---|
| `item.stick.name` | en_US, uk_UA, es_ES | level number color |
| `item.wooden_pickaxe.name` | en_US, uk_UA, es_ES | level number color |
| `item.stone_pickaxe.name` | en_US, uk_UA, es_ES | level number color |
| `item.iron_pickaxe.name` | en_US, uk_UA, es_ES | level number color |
| `item.diamond_pickaxe.name` | en_US, uk_UA, es_ES | level number color |
| `item.netherite_pickaxe.name` | en_US, uk_UA, es_ES | level number color |
| `item.gold_nugget.name` | uk_UA | vanilla 1.19.50 |
| `item.server:menu` | uk_UA | voice |
| `item.server:admin_menu` | uk_UA | voice |
| `item.server:admin_stick` | uk_UA | glossary |
| `menu.common.tap_to_open` | uk_UA | voice |
| `menu.common.back` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `chat.error.no_money` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `chat.cmd.error.role` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.cmd.error.issuer` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.cmd.error.number` | en_US | meaning |
| `scoreboards.map` | es_ES | typo |
| `account.register.agree` | en_US, es_ES | meaning |
| `chat.account.error.no_cheats` | en_US | meaning |
| `account.register.welcome` | es_ES | meaning |
| `account.register.remember` | ru_RU | meaning |
| `account.login.placeholder` | uk_UA | meaning |
| `chat.help.gm6` | en_US | meaning |
| `chat.help.top` | es_ES | glossary |
| `chat.help.stats` | es_ES | glossary |
| `chat.help.boost` | uk_UA, es_ES | glossary |
| `chat.help.debug` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.help.worldedit` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.about.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.about.button.levels` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.about.button.version` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.levels.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.levels.line.2` | uk_UA | vanilla names/meaning |
| `menu.levels.line.3` | uk_UA | vanilla names/meaning |
| `menu.levels.line.8` | uk_UA | vanilla names/meaning |
| `menu.levels.line.13` | uk_UA | vanilla names/meaning |
| `menu.levels.line.15` | uk_UA | vanilla names/meaning |
| `menu.levels.line.19` | uk_UA | vanilla names/meaning |
| `menu.levels.line.34` | uk_UA | vanilla names/meaning |
| `menu.howtoplay.line.2` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.3` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.howtoplay.line.7` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.howtoplay.line.8` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.11` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.howtoplay.line.12` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.15` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.16` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.17` | ru_RU, uk_UA | tutorial context |
| `menu.howtoplay.line.18` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.19` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.20` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.howtoplay.line.21` | ru_RU, en_US, uk_UA, es_ES | tutorial context |
| `menu.version.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.version.line.6` | uk_UA | glossary |
| `menu.version.line.22` | uk_UA | glossary |
| `menu.upgrades.body` | ru_RU | context |
| `chat.lvlup.level.2` | uk_UA | glossary |
| `chat.lvlup.level.3` | uk_UA | glossary |
| `chat.lvlup.level.8` | uk_UA | glossary |
| `chat.lvlup.level.13` | uk_UA | glossary |
| `chat.lvlup.level.15` | uk_UA | glossary |
| `chat.lvlup.level.26` | uk_UA | glossary |
| `chat.vip.welcome` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.shop.enchant.error.stick` | uk_UA | glossary |
| `chat.cmd.boost.use` | uk_UA | glossary |
| `chat.cmd.boost.stop.none` | uk_UA | glossary |
| `chat.cmd.boost.stop.done` | uk_UA | glossary |
| `chat.cmd.boost.started` | uk_UA | glossary |
| `menu.shop.cosmetics.name.body` | en_US, uk_UA, es_ES | omitted meaning |
| `menu.shop.cosmetics.text.body` | en_US, uk_UA, es_ES | omitted meaning |
| `menu.shop.cosmetics.trail.body` | en_US, uk_UA, es_ES | omitted meaning |
| `menu.shop.cosmetics.death.body` | en_US, uk_UA, es_ES | omitted meaning |
| `chat.bank.sent` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `chat.bank.received` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `chat.cmd.money.vip.done` | ru_RU, en_US, uk_UA, es_ES | white player name |
| `chat.cmd.money.vip.received` | en_US, es_ES | translated service label |
| `chat.promo.book.hint` | ru_RU, en_US, uk_UA, es_ES | same book instructions in menu/chat |
| `ach.lvl_10.desc` | en_US, uk_UA | meaning |
| `ach.lvl_20.name` | uk_UA | meaning |
| `ach.vip.name` | en_US | meaning |
| `ach.vip.desc` | en_US, uk_UA, es_ES | text |
| `ach.rebirth_1.desc` | ru_RU, uk_UA, es_ES | meaning |
| `ach.mined_10k.desc` | uk_UA | meaning |
| `ach.enchant.desc` | en_US, uk_UA | meaning |
| `ach.rebirth_5.desc` | ru_RU, uk_UA, es_ES | meaning |
| `ach.mined_100k.desc` | en_US | meaning |
| `ach.tir_first.desc` | es_ES | meaning |
| `ach.tir_100.desc` | es_ES | meaning |
| `ach.spleef_5.name` | uk_UA | meaning |
| `ach.spleef_5.desc` | uk_UA | meaning |
| `ach.trader.name` | es_ES | meaning |
| `chat.ach.task` | en_US | meaning |
| `chat.cmd.top.header.rebirth` | es_ES | meaning |
| `chat.cmd.stats.rebirth` | es_ES | meaning |
| `trader.item.wither_skull` | ru_RU, uk_UA, es_ES | vanilla 1.19.50 |
| `trader.item.dragon_head` | ru_RU, en_US, uk_UA | vanilla 1.19.50 |
| `trader.item.creeper_head` | es_ES | vanilla 1.19.50 |
| `trader.item.haste` | ru_RU, uk_UA | vanilla 1.19.50 |
| `chat.cmd.mute.active.permanent` | es_ES | glossary |
| `chat.cmd.unwarn.received` | en_US | glossary |
| `chat.cmd.freeze.active` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.cmd.stick` | uk_UA | glossary |
| `chat.cmd.wipe.summary` | uk_UA, es_ES | glossary |
| `chat.cmd.worldedit.help.5` | en_US, uk_UA, es_ES | text |
| `chat.cmd.worldedit.help.4` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.cmd.worldedit.error.idle` | ru_RU | meaning |
| `admin.tools.button.admin_stick` | uk_UA | glossary |
