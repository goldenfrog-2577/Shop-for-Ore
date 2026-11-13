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
import './system/security/portals.js';   // Порталы закрыты: поджиг отменяется, порталы ломаются, из Незера и Энда — на спавн
import './system/player/discs.js';       // Коллекция пластинок: дроп при копании и за мини-игры, «Меломан» за все 15
import './system/boss/arena.js';         // Арена Хранителя: музыка (Ancestry, «5») и эмбиент Древнего города
import './system/boss/boss.js';          // Босс Хранитель: старт с плиты у портала, фазы, тотем, награды
import './system/boss/portal.js';        // Бирюзовый портал в мини-играх → арена (проверки как у !warp boss)
import './system/player/ranks.js';       // Префикс уровня в чате (rank:§rN, у VIP — rank:§aVIP)
import './system/ui/hud.js';         // Панель слева (actionbar)
import { heartbeatConfirmed } from './system/core/fallback.js';    // Пульс скриптов: без него включается запасное меню на NPC
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

const loadedModules = [
// BEGIN GENERATED MODULE LIST
	"DataBase.js",
	"import.js",
	"chat/censor.js",
	"chat/chat.js",
	"chat/commands/admin.js",
	"chat/commands/commands.js",
	"chat/commands/common.js",
	"chat/commands/moderator.js",
	"chat/commands/player.js",
	"chat/commands/selectors.js",
	"menu/achievements_menu.js",
	"menu/admin/admin_enchant.js",
	"menu/admin/admin_menu.js",
	"menu/common/forms.js",
	"menu/cosmetics_shop.js",
	"menu/enchant_shop.js",
	"menu/main_menu.js",
	"registration/change.js",
	"registration/forgot.js",
	"registration/login.js",
	"registration/password.js",
	"registration/register.js",
	"registration/system.js",
	"system/boss/arena.js",
	"system/boss/boss.js",
	"system/boss/portal.js",
	"system/bot/bot.js",
	"system/bot/spawnbot.js",
	"system/combat/mythic.js",
	"system/combat/pvp.js",
	"system/combat/trident.js",
	"system/core/fallback.js",
	"system/core/migrate.js",
	"system/core/offline_reset.js",
	"system/core/player_scores.js",
	"system/core/reset_history.js",
	"system/core/wipe.js",
	"system/economy/boosts.js",
	"system/economy/promo.js",
	"system/economy/trader.js",
	"system/minigames/minigames.js",
	"system/minigames/spleef.js",
	"system/minigames/tir.js",
	"system/player/achievements.js",
	"system/player/discs.js",
	"system/player/playtime.js",
	"system/player/ranks.js",
	"system/player/tools.js",
	"system/player/void.js",
	"system/security/anticheat.js",
	"system/security/anticheat_checks.js",
	"system/security/ban.js",
	"system/security/cps.js",
	"system/security/freeze.js",
	"system/security/jail.js",
	"system/security/portals.js",
	"system/security/staff_log.js",
	"system/ui/error_keys.js",
	"system/ui/hud.js",
	"system/ui/music.js",
	"system/ui/music_tracks.js",
	"system/ui/toast.js",
	"system/worldedit.js",
// END GENERATED MODULE LIST
];

console.warn('[Shop for Ore] Загрузка модулей');
let lastGroup;
for (const file of loadedModules) {
	const parts = file.split('/');
	const group = parts.length === 1 ? 'scripts/' : parts.slice(0, parts[0] === 'system' && parts.length > 2 ? 2 : 1).join('/') + '/';
	if (lastGroup !== group) {
		console.warn('[Shop for Ore]   ' + group);
		lastGroup = group;
	}
	console.warn('[Shop for Ore]     ' + file + ' — загружен');
}
console.warn('[Shop for Ore] Загрузка завершена · файлов: ' + loadedModules.length);

// При первом запуске табло может появиться после начала работы нативных функций.
let readinessChecks = 0;
const readinessTimer = system.runSchedule(() => {
	const missing = ['system', 'money', 'lvl', 'xp', 'xp_need'].filter(id => !world.scoreboard.getObjective(id));
	if (++readinessChecks < 5 && (missing.length || !heartbeatConfirmed)) return;
	system.clearRunSchedule(readinessTimer);
	console.warn('[Shop for Ore] Проверка табло · ' + (missing.length ? 'отсутствуют: ' + missing.join(', ') : 'доступны'));
	console.warn('[Shop for Ore] Проверка legacy · ' + (heartbeatConfirmed ? 'сигнал обновляется' : 'сигнал не подтверждён'));
}, 20);