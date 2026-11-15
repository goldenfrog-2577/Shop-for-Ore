import { readScore } from './progress.js';
import { maxLevel } from './level-costs.js';

const hidden = new Set();
const text = (value) => ({ text: String(value) });
const label = (id) => ({ translate: 'hud.' + id });
const nextLevelColors = { 16: '§c', 26: '§7' };

function formatExperienceCost(cost) {
	return cost < 1000 ? String(cost) : (cost / 1000).toFixed(1) + 'K';
}

function hudRows(player) {
	const vip = player.hasTag('player:vip');
	const balance = readScore(player, vip ? 'vip_coins' : 'money');
	const xp = readScore(player, 'xp');
	const level = readScore(player, 'lvl');
	const rebirth = readScore(player, 'rebirth');
	const online = readScore(player, 'online');

	if (player.hasTag('player:board_icons')) {
		return [text(
			'§l\ue101 ➠ §r' + player.name +
			'\n' + (vip ? '§l\ue186' : '§l\ue152') + ' ➠ ' + balance +
			'\n\ue154 ➠ ' + (vip ? '\ue128' : xp) +
			'\n\ue153 ➠ ' + (vip ? '§aVIP§f' : level) +
			'\n\ue116 ➠ ' + rebirth +
			'\n\ue110 ➠ ' + online
		)];
	}

	const rows = [label('profile'), text(player.name), text('\n'), label(vip ? 'vip_coins' : 'money'), text(balance),
		text('\n'), label('xp'), text(vip ? '\ue128' : xp)];
	const need = readScore(player, 'xp_need');
	if (!vip && level < maxLevel && need > 0) rows.push(text('/' + formatExperienceCost(need)));

	rows.push(text('\n'), label('lvl'), text(vip ? '§aVIP§f' : level));
	if (!vip) {
		rows.push(text(' >> '));
		if (level >= maxLevel) {
			rows.push(label('lvl.max'));
		} else {
			const next = level + 1;
			const color = nextLevelColors[next];
			rows.push(text(color ? color + next + '§f' : next));
		}
	}

	rows.push(text('\n'), label('rebirth'), text(rebirth), text('\n'), label('online'), text(online));
	return rows;
}

export function refreshHud(player) {
	if (player.hasTag('player:board_no')) {
		if (!hidden.has(player.id)) player.onScreenDisplay.setActionBar('');
		hidden.add(player.id);
		return;
	}
	hidden.delete(player.id);
	player.onScreenDisplay.setActionBar({ rawtext: hudRows(player) });
}

export function forgetHud(playerId) {
	hidden.delete(playerId);
}
