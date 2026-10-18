# ⛏️ Shop for Ore by GoldenFrog

Профессиональная техническая карта-симулятор для Minecraft Bedrock Edition.

Проект сочетает в себе:
- сложную экономическую модель,
- систему прогрессии инструментов,
- полную мультиязычность.

## 🎯 Для кого эта карта?
- Игрокам, которым важны механики и прогрессия
- Разработчикам карт, изучающих Script API и MCFunction

## ⚙️ Технический стек
* **Core Logic**: MCFunction (оптимизированные цепочки команд)
* **Scripting**: Minecraft Script API (JavaScript) — меню, чат-команды, регистрация, античит
* **Engine**: Bedrock, `min_engine_version` 1.19.50
* **Script API**: `@minecraft/server` 1.1.0-beta, `@minecraft/server-ui` 1.0.0-beta, `@minecraft/server-gametest` 1.0.0-beta
* **Localization**: `.lang` интеграция (RU, EN, UK, ES)

> ⚠️ Аддон использует **beta**-версии Script API эпохи 1.19.50. В актуальных версиях Bedrock старые beta-модули не загружаются, поэтому скрипты (меню, чат) там работать не будут без миграции на современный API.

## 🌟 Ключевые системы

### 🔄 1. Advanced Rebirth System
Система перерождений, реализованная через `.mcfunction` (`functions/upgrade/upgrade_rebirth.mcfunction`).
* **Условие**: перерождение доступно с 16 по 25 уровень, максимум — 5 перерождений.
* **Permanent Buffs**: постоянный эффект Haste I–V в зависимости от числа перерождений.
* **Global Notifications**: оповещение всех игроков в чате и звук при первом перерождении.
* **Progress Reset**: сброс уровня, опыта, денег и прокачки зачарований; счётчик перерождений сохраняется.

### 🔨 2. Dynamic Tool Evolution
Автоматическая выдача инструмента под уровень игрока (`functions/system/pickaxe_lvl.mcfunction`).
* **Item Locking**: компонент `item_lock` (`lock_in_slot`) — инструмент нельзя выбросить или переместить.
* **Block Sensitivity**: 18 ступеней инструмента на 25 уровней игрока, у каждой свой список `can_destroy` — от земли до аметистового кластера.
* **Keep Inventory**: компонент `keep_on_death` — инструмент не теряется при смерти.

### 📊 3. Smart Economy & UI
* **Autosale**: продажа добытого через `.mcfunction` (`functions/system/autosale.mcfunction`) — игрок встаёт на золотой блок, руда превращается в деньги и опыт с учётом бустов X2/X4.
* **Boosts & Upgrades**: бусты X2/X4, VIP-уровень, зачарования (эффективность, удача), PvP-киты.
* **Custom HUD**: собственный scoreboard с иконками (профиль, деньги, опыт, уровень, перерождения, онлайн).
* **Multilingual Support**: все игровые сообщения через `.lang` под язык клиента.

## 📁 Структура репозитория
```
behavior_packs/
  main-addon-shop_for_ore/     # Behavior pack
    functions/                 # Командная логика (system, ranks, upgrade, shop, boost, events, tp_ore, settings)
    scripts/                   # Script API: меню, чат, регистрация, античит
    entities/ items/ structures/ animation_controllers/
    texts/                     # Локализация названий пака
resource_packs/
  main-rp-shop_for_ore/        # Основной resource pack: UI, текстуры, сущности, локализация сообщений
  server-ui/                   # UI-пак со скорбордом
```

## 🛠 Установка и разработка
Репозиторий содержит три пака — их нужно разложить по своим папкам, а не клонировать целиком в одну:

1. `behavior_packs/main-addon-shop_for_ore` → `development_behavior_packs/` (или `behavior_packs/` внутри папки мира).
2. `resource_packs/main-rp-shop_for_ore` и `resource_packs/server-ui` → `development_resource_packs/` (или `resource_packs/` внутри папки мира).
3. Подключите оба resource pack и behavior pack к миру. Для Script API в настройках мира должны быть включены экспериментальные функции (Beta APIs).

### Что не входит в репозиторий
* **Шрифты** (`resource_packs/main-rp-shop_for_ore/font/`) — без них используется стандартный шрифт игры.
* **Звуки** (`sounds/**/*.ogg`) — `sound_definitions.json` ссылается на 4 звука (`challenge.complete`, `tnt.explode`, `glass.broke`, `music/main.theme`); без файлов они не проигрываются.

## 📱 Оптимизация
Протестировано и стабильно работает на:
* **Google Pixel 6** (Android 15)
* Стабильный FPS при нагрузке 90%+ сущностей.

---
## 👥 Авторство
* **[GoldenFrog](https://github.com/goldenfrog-2577)** (в Minecraft Bedrock — `kapycta1231484`) — автор карты и аддона
* **NastyaXs00** — соавтор скриптов
* **GitHub Copilot** — помощь в разработке
* **Claude (Anthropic)** — сопровождение репозитория: синхронизация паков, исправление путей, README, лицензия

## 📄 Лицензия
Проект распространяется по лицензии **[PolyForm Noncommercial 1.0.0](LICENSE)**.

Кратко (юридическую силу имеет только текст в [LICENSE](LICENSE)):
* ✅ Можно изучать, запускать, изменять и делиться своими версиями — в некоммерческих целях.
* ✅ При распространении нужно сохранить текст лицензии и строку `Required Notice` с авторами.
* ❌ Нельзя использовать в коммерческих целях (продажа, платный доступ, монетизация серверов и т.п.) без отдельного разрешения автора.

Логотипы сторонних сервисов в `textures/server_icons/` (Discord, Telegram, Xbox, Omlet Arcade) принадлежат их правообладателям и под эту лицензию не подпадают.
