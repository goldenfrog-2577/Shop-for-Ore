/*
* Главный файл инициализации скриптов аддона "Shop for Ore".
* Здесь подключаются все основные модули: меню, чат, античит, спавн бота и загрузка скриптов.
* Scripts made by kapycta1231484 & NastyaXs00
* Omlet Arcade - @waxenjaguar2209 & @ss1_sashka
* Discord - GoldenFrog#2577 & xSashaES#0363
* Telegram - @goldenfrog_2577 & @sasha0FF
*   (╮°-°)╮┳━┳      (╯°□°)╯︵ ┻━┻
*/

// Лог о запуске скриптов аддона
console.warn('[Shop for Ore] Addon scripts is working');

// Импорт модулей меню
import './menu/menu.js';         // Основное меню магазина
import './menu/admin_menu.js';   // Админ-меню

// Импорт модулей чата
import './chat/chat.js';         // Чат-функционал
import './chat/commands.js';     // Команды чата

// Импорт других вспомогательных модулей
import './system/anticheat.js';   // Античит: очки нарушений, сигналы персоналу, проверка инвентаря
import './system/ac_checks.js';   // Античит: скорость, полёт, сквозь блоки, дальность и направление удара, копание
import './system/spawnbot.js';    // Спавн бота
import './system/tools.js';       // Неразрушаемая кирка уровня
import './system/pvp.js';         // PvP-арена: случайная точка входа и режим боя
import './system/mythic.js';      // Ивент «Мистик»: сундук с лутом в центре арены
import './system/freeze.js';      // Заморозка: игрок застывает на месте
import './system/ban.js';         // Бан по номеру игрока в мире и нику
import './system/migrate.js';     // Старые названия тегов → новые (0.3.0)
import './system/reload.js';      // «Скрипты загружены» администраторам после /reload
import './system/achievements.js'; // Достижения и испытания, счётчики stat_*
import './system/minigames.js';   // Основа мини-игр (PvP «Последний выживший»)
import './system/spleef.js';      // Мини-игра «Сплиф»
import './system/cps.js';         // Проверка CPS против автокликеров
import './system/music.js';       // Выключатель музыки (Настройки)
import './system/wipe.js';        // Вайп: номер вайпа, сброс игроков не в сети при входе
import './system/offline_reset.js'; // !resetoffline: всё сбросить игрокам не в сети
import './system/trident.js';     // Трезубец с «Громовержцем»: молния в поражённого игрока

// Импорт загрузчика скриптов
import './register/loadScript.js';