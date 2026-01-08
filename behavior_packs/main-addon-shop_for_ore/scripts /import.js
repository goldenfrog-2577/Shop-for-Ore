/*
* Главный файл инициализации скриптов аддона "Shop for Ore".
* Здесь подключаются все основные модули: меню, чат, античит, спавн бота и загрузка скриптов.
* Scripts made by kapycta1231484 & NastyaXs00
* Omlet Arcade - @waxenjaguar2209 & @ss1_sashka
* Discord - GoldenFrog#2577 & xSashaES#0363
* Telegram - @xdxd1338 & @sasha0FF
*   (╮°-°)╮┳━┳      (╯°□°)╯︵ ┻━┻
*/

// Лог о запуске скриптов аддона
console.log('[Shop for Ore] Addon scripts is working')

// Импорт модулей меню
import './menu/menu.js'         // Основное меню магазина
import './menu/admin_menu.js'   // Админ-меню

// Импорт модулей чата
import './chat/chat.js'         // Чат-функционал
import './chat/commands.js'     // Команды чата

// Импорт других вспомогательных модулей
import './system/anticheat.js'   // Античит
import './system/spawnbot.js'    // Спавн бота

// Импорт загрузчика скриптов
import './register/loadScript.js'
