/*
* Главный файл инициализации скриптов аддона "Shop for Ore".
* Здесь подключаются все основные модули: меню, чат, античит, спавн бота и загрузка скриптов.
* Scripts made by kapycta1231484 & NastyaXs00
* Omlet Arcade - @waxenjaguar2209 & @ss1_sashka
* Discord - GoldenFrog#2577 & xSashaES#0363
* Telegram - @goldenfrog_2577 & @sasha0FF
*   (╮°-°)╮┳━┳      (╯°□°)╯︵ ┻━┻
*/

import { world, system } from '@minecraft/server';
import { hasRole, tell } from './DataBase.js';

// Лог о запуске скриптов аддона
console.log('[Shop for Ore] Addon scripts are working properly');

// Импорт модулей меню
import './menu/main_menu.js';         // Основное меню магазина
import './menu/admin/admin_menu.js';   // Админ-меню

// Импорт модулей чата
import './chat/chat.js';         // Чат-функционал
import './chat/commands/commands.js';     // Команды чата

// Импорт других вспомогательных модулей
import './system/security/anticheat.js';   // Античит: очки нарушений, сигналы персоналу, проверка инвентаря
import './system/security/anticheat_checks.js';   // Античит: скорость, полёт, сквозь блоки, дальность и направление удара, копание
import './system/bot/spawnbot.js';    // Спавн бота
import './system/bot/bot.js';      // Поведение бота: режимы, груша, спарринг, мини-игры, возврат, гид
import './system/player/tools.js';       // Неразрушаемая кирка уровня
import './system/combat/pvp.js';         // PvP-арена: случайная точка входа и режим боя
import './system/combat/mythic.js';      // Ивент «Мистик»: сундук с лутом в центре арены
import './system/security/freeze.js';      // Заморозка: игрок застывает на месте
import './system/security/ban.js';         // Бан по номеру игрока в мире и нику
import './system/core/migrate.js';     // Старые названия тегов → новые (0.3.0)
import './system/player/achievements.js'; // Достижения и испытания, счётчики stat_*
import './system/minigames/minigames.js';   // Основа мини-игр (PvP «Последний выживший»)
import './system/minigames/spleef.js';      // Мини-игра «Сплиф»
import './system/security/cps.js';         // Проверка CPS против автокликеров
import './system/economy/boosts.js';      // Бусты, выданные администратором: запись и отключение
import './system/security/jail.js';        // Тюрьма (!jail): камера у спавна, срок или навсегда
import './system/minigames/tir.js';         // Тир: стрельба по мишеням за монеты, кирка убирается на время
import './system/economy/trader.js';      // Лавка странствующего торговца: кнопки, VIP-коины, товары-структуры
import './system/ui/music.js';       // Выключатель музыки (Настройки)
import './system/core/wipe.js';        // Вайп: номер вайпа, сброс игроков не в сети при входе
import './system/core/offline_reset.js'; // !resetoffline: всё сбросить игрокам не в сети
import './system/combat/trident.js';     // Трезубец с «Громовержцем»: молния в поражённого игрока
import './system/player/void.js';        // Бездна: упал ниже мира — на спавн
import './system/boss/arena.js';         // Арена Хранителя: музыка (Ancestry, «5») и эмбиент Древнего города
import './system/boss/boss.js';          // Босс Хранитель: старт с плиты у портала, фазы, тотем, награды
import './system/player/ranks.js';       // Префикс уровня в чате (rank:§rN, у VIP — rank:§aVIP)
import './system/ui/hud.js';         // Панель слева (actionbar)
import './system/core/fallback.js';    // Пульс скриптов: без него включается запасное меню на NPC
import './registration/system.js'; // Вход и регистрация в аккаунт: проверка, запись, смена пароля, сброс пароля

// После загрузки уведомить администраторов в сети.
system.run(() => {
	for (const player of world.getPlayers()) {
		if (hasRole(player, 'admin')) tell(player, 'chat.cmd.reload.done');
	}
});

import './system/player/playtime.js'; // Суммарное время в мире
import './system/core/reset_history.js'; // Очистка служебных номеров без повторного вайпа
import './system/core/player_scores.js'; // Восстановление отсутствующих счетов после сброса