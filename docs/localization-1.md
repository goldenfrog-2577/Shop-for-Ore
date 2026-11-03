# Локализация: Меню, статусы и цвета

Проверены ru_RU, en_US, uk_UA и es_ES. Цвета подписи/значения проверяются в контексте собранной формы, включая VIP, мут и присутствие бота. Числа и игровые проверки не меняются.

Ванильные названия сверены с Mojang bedrock-samples v1.19.50.2; значения берутся без табличных комментариев. Название набора Netherite и Rebirth сохраняет глоссарий владельца. Зарезервированные изменения NPC/legacy_menu не переносятся и не переписываются.

Проверки: tools/lang.py check и tools/tests/*.mjs. Новый localization.mjs проверяет четыре набора ключей и подстановки, фактическую сборку меню, цвета монет/глифов, варианты мута и статусы бота. Это проверки с моками; переносы строк и ширину окон надо проверить в игре после перезахода.

Особенно проверить: admin.enchant.title, admin.bot.button.return, menu.promo.book, menu.shop.enchants.button.pickaxe, menu.settings.menu_sounds.success.title. Подписи укорочены целыми словами; обрезания слов нет.

## Изменённые ключи

| Ключ | Языки с изменениями | Причина |
|---|---|---|
| `admin.players.body.playtime` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.players.body.mute` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.players.mute.none` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.players.body.money` | en_US, es_ES | context and palette |
| `admin.players.body.vip_coins` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.players.money.currency` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.players.term` | en_US, uk_UA, es_ES | context and palette |
| `admin.players.resetpass.body` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.players.button.tp_to` | en_US, uk_UA, es_ES | context and palette |
| `admin.players.color.kind` | en_US, es_ES | context and palette |
| `admin.wipe.history.title` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.wipe.history.body` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.wipe.button.offline` | ru_RU, uk_UA, es_ES | context and palette |
| `admin.enchant.title` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.enchant.body` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.enchant.empty` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.enchant.choose` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.enchant.level` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.enchant.slot` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `menu.shop.balance` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `menu.settings.button.menu_sounds` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `menu.settings.menu_sounds.body` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `menu.settings.menu_sounds.success` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `menu.settings.menu_sounds.error` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.bot.status` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.bot.button.sit` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `admin.bot.button.totem` | ru_RU, en_US, uk_UA, es_ES | context and palette |
| `menu.shop.enchants.pickaxe.stick` | en_US, uk_UA, es_ES | owner color reset |
| `menu.shop.boosts.button.ore_magnet` | ru_RU, en_US, uk_UA, es_ES | owner glyph |
| `admin.tools.button.enchant` | ru_RU, en_US, uk_UA, es_ES | separate button and title |
| `menu.settings.menu_sounds.title` | ru_RU, en_US, uk_UA, es_ES | separate button and title |
| `menu.settings.menu_sounds.success.title` | ru_RU, en_US, uk_UA, es_ES | separate button and title |
| `menu.settings.menu_sounds.error.title` | ru_RU, en_US, uk_UA, es_ES | separate button and title |
| `admin.bot.mode.follow.desc` | ru_RU, en_US, uk_UA, es_ES | context |
| `admin.bot.mode.mirror.desc` | ru_RU, en_US, uk_UA, es_ES | context |
| `admin.bot.mode.game.desc` | ru_RU, en_US, uk_UA, es_ES | context |
| `admin.bot.button.return` | en_US, uk_UA, es_ES | context |
| `admin.bot.slots.id` | ru_RU, en_US, uk_UA, es_ES | context |
| `admin.bot.slots.slot` | es_ES | context |
| `admin.bot.slots.title` | es_ES | context |
| `admin.bot.button.slots` | es_ES | context |
| `admin.bot.slots.select` | en_US, es_ES | context |
| `admin.bot.effects.hide` | uk_UA | context |
| `chat.admin.bot.error.game` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.admin.bot.totem.on` | ru_RU, en_US, uk_UA, es_ES | text |
| `chat.admin.bot.totem.off` | ru_RU, en_US, uk_UA, es_ES | text |
| `effect.slowness.name` | uk_UA | vanilla 1.19.50 |
| `effect.haste.name` | ru_RU, uk_UA | vanilla 1.19.50 |
| `effect.mining_fatigue.name` | ru_RU, uk_UA, es_ES | vanilla 1.19.50 |
| `effect.instant_health.name` | ru_RU, uk_UA, es_ES | vanilla 1.19.50 |
| `effect.instant_damage.name` | uk_UA | vanilla 1.19.50 |
| `effect.jump_boost.name` | ru_RU, es_ES | vanilla 1.19.50 |
| `effect.regeneration.name` | uk_UA | vanilla 1.19.50 |
| `effect.resistance.name` | ru_RU | vanilla 1.19.50 |
| `effect.fire_resistance.name` | es_ES | vanilla 1.19.50 |
| `effect.water_breathing.name` | ru_RU, uk_UA | vanilla 1.19.50 |
| `effect.poison.name` | uk_UA | vanilla 1.19.50 |
| `effect.wither.name` | uk_UA, es_ES | vanilla 1.19.50 |
| `effect.health_boost.name` | ru_RU, uk_UA, es_ES | vanilla 1.19.50 |
| `effect.saturation.name` | ru_RU, uk_UA | vanilla 1.19.50 |
| `effect.slow_falling.name` | ru_RU | vanilla 1.19.50 |
| `effect.conduit_power.name` | uk_UA | vanilla 1.19.50 |
| `effect.village_hero.name` | uk_UA | vanilla 1.19.50 |
| `effect.darkness.name` | ru_RU | vanilla 1.19.50 |
| `admin.effects.button.haste` | ru_RU | vanilla 1.19.50 |
| `admin.effects.button.jump_boost` | ru_RU, es_ES | vanilla 1.19.50 |
| `admin.effects.button.health_boost` | ru_RU, uk_UA, es_ES | vanilla 1.19.50 |
| `admin.effects.button.slow_falling` | ru_RU | vanilla 1.19.50 |
| `admin.tools.button.structure_void` | uk_UA, es_ES | vanilla 1.19.50 |
| `admin.tools.button.jigsaw` | ru_RU | vanilla 1.19.50 |
| `admin.main.button.money` | ru_RU, en_US, uk_UA, es_ES | button palette |
| `admin.gamemode.body` | en_US, uk_UA, es_ES | text |
| `admin.effects.body` | en_US, uk_UA, es_ES | text |
| `admin.announce.body` | ru_RU, en_US, uk_UA, es_ES | text |
| `admin.time.body` | en_US, uk_UA, es_ES | text |
| `menu.shop.enchants.button.pickaxe` | en_US, uk_UA, es_ES | text |
| `menu.shop.enchants.pickaxe.body` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.shop.enchants.pickaxe.title` | uk_UA | context |
| `menu.shop.body` | uk_UA | context |
| `menu.shop.boosts.body` | uk_UA | context |
| `menu.upgrades.body` | uk_UA, es_ES | context |
| `menu.settings.board.body` | es_ES | context |
| `menu.settings.body` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.settings.button.sounds` | en_US | context |
| `menu.promo.book` | ru_RU, en_US, uk_UA, es_ES | text |
| `menu.warps.body` | en_US, es_ES | context |
| `menu.warps.button.minigames` | en_US, es_ES | context |
| `menu.main.button.about` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.shop` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.settings` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.bank` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.rules` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.promo` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.warps` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.upgrades` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.achievements` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.main.button.games` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.upgrades.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.shop.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.settings.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.bank.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.rules.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.promo.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `menu.warps.title` | ru_RU, en_US, uk_UA, es_ES | untinted glyph |
| `admin.main.button.boosts` | uk_UA | glossary |
| `admin.boosts.title` | uk_UA | glossary |
| `admin.boosts.body` | uk_UA | glossary |
| `admin.boosts.button.boost` | uk_UA | glossary |
| `admin.boosts.button.stop` | en_US, uk_UA, es_ES | glossary |
| `admin.boosts.stop.body` | uk_UA, es_ES | glossary |
| `admin.boosts.boost.title` | uk_UA | glossary |
| `admin.boosts.boost.type` | uk_UA | glossary |
| `admin.server.boost` | uk_UA | glossary |
| `admin.wipe.body` | uk_UA, es_ES | glossary |
| `admin.server.button.top_rebirth` | es_ES | context |
