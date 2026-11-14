// --- Панель слева (actionbar): ник, монеты, опыт, уровень, ребитхи, онлайн ---
// Настройки → Панель слева (functions/settings/*): обычная, «только значки» (тег player:board_icons)
// или выключена (player:board_no). У VIP вместо монет — VIP-коины, на любом уровне.
// Опыт — «текущий/нужный» (нужный — табло xp_need, functions/system/xp_need, сокращённо: «/195.0K»),
// уровень — «N >> N+1»; на последнем уровне опыт без «/…», уровень — «40 >> МАКС.».
// Числа подставляет игра (компоненты score), поэтому панель всегда показывает текущий счёт.
// Раз в HUD_TICKS тиков проверяем данные; отправляем при изменении или для продления показа.

import { world } from '@minecraft/server';
import { getScore, isVip, metricNumbers, run, MAX_LEVEL } from '../../utils.js';

export const ICONS_TAG = 'player:board_icons';
export const OFF_TAG = 'player:board_no';
const HUD_TICKS = 5;
const KEEPALIVE_TICKS = 20;
// Следующий уровень другим цветом — переход в новую локацию: 16 — Адская шахта, 26 — Пещера из Caves & Cliffs. В остальных случаях цвет по умолчанию (белый).
const NEXT_LEVEL_COLOR = { 16: '§c', 26: '§7' };

const score = (objective) => ({ score: { name: '@s', objective } });
const line = (text) => ({ text: `\n${text}` });
const nextLevel = (n) => NEXT_LEVEL_COLOR[n] ? `${NEXT_LEVEL_COLOR[n]}${n}§f` : String(n);

/** Строки панели «только значки». */
function iconsRawtext(vip, coins) {
	return [
		{ text: '§l\ue101 ➠ §r' }, { selector: '@s' },
		line(`${vip ? '\ue186' : '§l\ue152'} ➠ `), score(coins),
		line('\ue154 ➠ '), vip ? { text: '\ue128' } : score('xp'),
		line('\ue153 ➠ '), vip ? { text: '§aVIP§f' } : score('lvl'),
		{ text: ' \n\ue116 ➠ ' }, score('rebirth'),
		line('\ue110 ➠ '), score('online')
	];
}

/** Обычная панель: подписи из .lang (hud.*). */
function fullRawtext(vip, coins, level, need) {
	const last = level >= MAX_LEVEL;
	return [
		{ translate: 'hud.profile' }, { selector: '@s' },
		line(''), { translate: vip ? 'hud.vip_coins' : 'hud.money' }, score(coins),
		line(''), { translate: 'hud.xp' }, ...(vip ? [{ text: '\ue128' }] : [score('xp'), ...(last || need <= 0 ? [] : [{ text: `/${metricNumbers(need)}` }])]),
		line(''), { translate: 'hud.lvl' }, ...(vip ? [{ text: '§aVIP§f' }] : [score('lvl'), ...(last ? [{ text: ' >> ' }, { translate: 'hud.lvl.max' }] : [{ text: ` >> ${nextLevel(level + 1)}` }])]),
		line(''), { translate: 'hud.rebirth' }, score('rebirth'),
		line(''), { translate: 'hud.online' }, score('online')
	];
}

function viewOf(player) {
	if (player.hasTag(OFF_TAG)) return undefined;
	const vip = isVip(player);
	const coins = vip ? 'vip_coins' : 'money';
	const icons = player.hasTag(ICONS_TAG);
	const level = getScore(player, 'lvl');
	if (!vip && !icons && level < 1) return undefined;
	const need = !icons && level < MAX_LEVEL ? getScore(player, 'xp_need') : 0;
	return { vip, coins, icons, level, need };
}

const rawtextOf = (view) => view.icons ? iconsRawtext(view.vip, view.coins) : fullRawtext(view.vip, view.coins, view.level, view.need);

/** rawtext панели игрока или undefined — панель выключена или уровня ещё нет. */
export function hudRawtext(player) {
	const view = viewOf(player);
	return view ? rawtextOf(view) : undefined;
}

const sent = new Map();
world.events.playerLeave.subscribe((e) => sent.delete(e.playerName));
let tick = 0;
world.events.tick.subscribe(() => {
	if (++tick % HUD_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		const view = viewOf(player);
		if (!view) {
			sent.delete(player.name);
			continue;
		}
		const mode = `${view.vip}|${view.icons}|${view.level}|${view.need}`;
		// Компоненты score вычисляются игрой при отправке команды: сравниваем и сами счета.
		const signature = `${mode}|${getScore(player, view.coins)}|${getScore(player, 'xp')}|${getScore(player, 'rebirth')}|${getScore(player, 'online')}`;
		const previous = sent.get(player.name);
		if (previous?.signature === signature && tick - previous.tick < KEEPALIVE_TICKS) continue;
		const command = previous?.mode === mode ? previous.command : `titleraw @s actionbar ${JSON.stringify({ rawtext: rawtextOf(view) })}`;
		const entry = { mode, signature, command, tick };
		sent.set(player.name, entry);
		run(player, command).then(result => {
			// Ошибка очереди команд: повторить на следующей проверке, не ждать keepalive.
			if (result === undefined && sent.get(player.name) === entry) sent.delete(player.name);
		});
	}
});
