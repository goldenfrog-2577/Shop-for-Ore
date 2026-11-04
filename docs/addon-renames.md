# Исправление ссылок после переименований

Подготовлено с помощью Codex. Имена выбраны владельцем и сохранены.

## Файлы JavaScript

| Было в scripts/ | Стало |
|---|---|
| chat/commands/moderation.js | chat/commands/moderator.js |
| chat/commands.js | chat/commands/commands.js |
| menu/admin_enchant.js | menu/admin/admin_enchant.js |
| menu/admin_menu.js | menu/admin/admin_menu.js |
| menu/forms.js | menu/common/forms.js |
| register/change.js | registration/change.js |
| register/login.js | registration/login.js |
| register/password.js | registration/password.js |
| register/register.js | registration/register.js |
| register/system.js | registration/system.js |

## Функции

| Было | Стало |
|---|---|
| system/apply_stand_timers | system/apply_timers |
| system/levelup_apply | system/level_up_apply |
| system/levelup_check | system/level_up_check |
| system/migrate_stand_timers | system/migrate_timers |
| system/spawnbot | system/spawn_bot |

Перед исправлением найдены 42 неразрешимые ссылки импортов (включая повторные ссылки экспорта) и 15 устаревших записей contents.json. Относительные пути пересчитаны от исходного местоположения к новому, включая входящие ссылки, импорты и реэкспорты самих перенесённых файлов.

Исправлены tick.json, вызов level_up_apply, миграция/apply таймеров и вызов system/spawn_bot из JS. Идентификатор GameTest server:spawnbot, структура server:bot, stand_timers_migrated, номера setup, теги и динамические свойства не переименовываются.

Названия fallback/navigation и fallback/npc_menu существовали в мире до этих переименований. Они сохраняются в независимой версии индекса мира. NPC-файлы и их ручные изменения не перезаписываются из репозитория. Новых копий по старым именам не создаётся.

## Проверки

- 53 модуля и 181 относительный импорт, порядок загрузки/подписок/таймеров по ESM с моками старого API.
- Все существующие JS-наборы с новыми путями; проверка таймеров использует новые имена функций.
- addon_references.mjs проверяет точные имена и регистр, отсутствие конфликтующих путей/записей индекса, manifest.entry, tick.json, вызовы функций из функций и JS, регистрацию GameTest. Тот же тест запускается непосредственно на файлах установленного мира.
- JSON, формат локализации, ключи и переводы; исходные тела файлов сравнены с учётом замены путей.

В Minecraft нужно перезайти в мир: индекс пакета изменён. Проверить сообщение о загрузке, меню/вход, призыв бота и повышение уровня. Проверки на моках не заменяют запуск в клиенте.

В индексе ресурспака также удалены шесть записей отсутствующих старых музыкальных файлов. Они не используются текущим sound_definitions.json; main.theme и три пользовательских эффекта остаются. Сами .ogg, шрифты и определения звуков не меняются и не публикуются. Дополнительная локальная запись glyph_E2 в индексе мира сохранена.
