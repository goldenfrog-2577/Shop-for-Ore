import * as serverApi from '@minecraft/server';
import { ActionFormData, ModalFormData } from '@minecraft/server-ui';

const { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus,
	InputPermissionCategory, ItemStack, system, world } = serverApi;

// Пороги опыта
// Пороги опыта из functions/system/xp_need.mcfunction релиза 1.19.50.
const costs = [
	100, 120, 180, 260, 440, 640, 800, 1260,
	1500, 2600, 2900, 3200, 6800, 7400, 10000, 21000,
	24900, 27600, 30400, 33500, 35700, 43740, 45360, 50400,
	57000, 63800, 70800, 78000, 80600, 89900, 100800, 102400,
	113750, 125400, 140700, 147000, 165600, 172500, 195000, 0,
];

const maxLevel = costs.length;

function experienceForLevel(level) {
	return costs[level - 1] ?? 0;
}

// Сохранённые счета игрока
const initialScores = {
	xp: 0, money: 0, vip_coins: 0, lvl: 1, rebirth: 0, efficiency: 0,
	fortune: 0, pick: 0, magnet: 0, play_seconds: 0,
};

function readScore(player, id) {
	return world.scoreboard.getObjective(id)?.getScore(player) ?? 0;
}

function updatePlayerScores(players) {
	const scoreboard = world.scoreboard;
	const defaults = { ...initialScores, xp_need: 0, online: 0 };
	const objectives = {};
	for (const id of Object.keys(defaults)) {
		objectives[id] = scoreboard.getObjective(id) ?? scoreboard.addObjective(id, id);
	}

	const online = players.length;
	for (const player of players) {
		let level = objectives.lvl.getScore(player);
		if (level === undefined || level < 1) {
			level = initialScores.lvl;
			objectives.lvl.setScore(player, level);
		}

		for (const [id, initial] of Object.entries(initialScores)) {
			const objective = objectives[id];
			if (id !== 'lvl' && objective.getScore(player) === undefined) {
				objective.setScore(player, initial);
			}
		}

		const need = objectives.xp_need.getScore(player);
		if (need === undefined || (need === 0 && level < maxLevel)) {
			objectives.xp_need.setScore(player, experienceForLevel(level));
		}
		if (objectives.online.getScore(player) !== online) {
			objectives.online.setScore(player, online);
		}
	}
}

// Панель игрока
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

function refreshHud(player) {
	if (player.hasTag('player:board_no')) {
		if (!hidden.has(player.id)) player.onScreenDisplay.setActionBar('');
		hidden.add(player.id);
		return;
	}
	hidden.delete(player.id);
	player.onScreenDisplay.setActionBar({ rawtext: hudRows(player) });
}

function forgetHud(playerId) {
	hidden.delete(playerId);
}

// Меню и запуск систем
const menuItemId = 'server:menu';
const logPrefix = '[Shop for Ore 26.60]';
const openMenus = new Set();

const message = (key) => ({ translate: 'sfo.port.' + key });

// Вход и регистрация
// --- Хранение паролей: соль + SHA-256 вместо открытого текста ---
// Пароль не хранится в тегах: только случайная соль (auth:salt:...) и хеш (auth:hash:...).
// Хеш необратим — по тегам (/tag list, файлы мира, бэкапы) пароль не узнать.
// Это не защита от владельца сервера, который может изменить сам код,
// а защита сохранённых паролей от чтения.

/** Минимальная и максимальная длина пароля */
const PASSWORD_MIN = 5;
const PASSWORD_MAX = 32;

// Сколько раз повторять хеширование: немного замедляет перебор по хешу.
// Хеширование идёт внутри одного тика, поэтому повторов немного: в QuickJS
// 256 повторов ≈ 130 мс на современном CPU (заметный фриз на слабом ПК), 64 — ≈ 30 мс.
// От перебора короткого пароля защищает в первую очередь минимальная длина.
const ROUNDS = 64;

const SALT_TAG = 'auth:salt:';
const HASH_TAG = 'auth:hash:';
const LEGACY_TAG = 'password:'; // старый формат — пароль открытым текстом

// ---------- SHA-256 (чистый JS: в Script API 1.19.5x нет встроенной криптографии) ----------
const K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

/** Строка → байты UTF-8 (пароли могут быть на кириллице) */
function utf8Bytes(str) {
	const out = [];
	for (let i = 0; i < str.length; i++) {
		let c = str.charCodeAt(i);
		// суррогатная пара → один символ
		if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
			const d = str.charCodeAt(i + 1);
			if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
		}
		if (c < 0x80) out.push(c);
		else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
		else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
		else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
	}
	return out;
}

/** SHA-256 от массива байт → hex-строка */
function sha256Bytes(bytes) {
	const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
	const len = bytes.length;
	const msg = bytes.slice();
	msg.push(0x80);
	while (msg.length % 64 !== 56) msg.push(0);
	const bitLenHi = Math.floor(len / 0x20000000), bitLenLo = (len * 8) >>> 0;
	msg.push((bitLenHi >>> 24) & 255, (bitLenHi >>> 16) & 255, (bitLenHi >>> 8) & 255, bitLenHi & 255,
		(bitLenLo >>> 24) & 255, (bitLenLo >>> 16) & 255, (bitLenLo >>> 8) & 255, bitLenLo & 255);
	const w = new Array(64);
	for (let off = 0; off < msg.length; off += 64) {
		for (let i = 0; i < 16; i++) {
			const j = off + i * 4;
			w[i] = ((msg[j] << 24) | (msg[j + 1] << 16) | (msg[j + 2] << 8) | msg[j + 3]) >>> 0;
		}
		for (let i = 16; i < 64; i++) {
			const a = w[i - 15], b = w[i - 2];
			const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
			const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
			w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
		}
		let [a, b, c, d, e, f, g, hh] = h;
		for (let i = 0; i < 64; i++) {
			const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
			const ch = (e & f) ^ (~e & g);
			const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
			const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const t2 = (S0 + maj) >>> 0;
			hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
		}
		h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
		h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
	}
	return h.map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** SHA-256 от строки (UTF-8) → hex. Экспортируется для проверки на тестовых векторах */
function sha256(str) {
	return sha256Bytes(utf8Bytes(str));
}

/** Хеш пароля с солью и повторами */
function hashPassword(salt, password) {
	let h = sha256(salt + ':' + password);
	for (let i = 1; i < ROUNDS; i++) h = sha256(h + salt);
	return h;
}

function makeSalt() {
	let s = '';
	for (let i = 0; i < 16; i++) s += Math.floor(Math.random() * 16).toString(16);
	return s;
}

function tagValue(player, prefix) {
	const tag = player.getTags().find((t) => t.startsWith(prefix));
	return tag === undefined ? undefined : tag.substring(prefix.length);
}

/**
 * Есть ли у игрока сохранённый пароль (новый хеш или старый открытый).
 * Пустой старый пароль (тег «password:» без значения) не считается: ввести его нельзя,
 * поэтому такой игрок проходит регистрацию заново
 */
function hasPassword(player) {
	return player.getTags().some((t) => t.startsWith(HASH_TAG) || (t.startsWith(LEGACY_TAG) && t.length > LEGACY_TAG.length));
}

/** Удаляет все теги пароля (соль, хеш, старый открытый пароль) — для сброса пароля владельцем */
function clearPassword(player) {
	for (const t of player.getTags()) {
		if (t.startsWith(SALT_TAG) || t.startsWith(HASH_TAG) || t.startsWith(LEGACY_TAG)) player.removeTag(t);
	}
}

/** Сохраняет пароль: удаляет все старые теги пароля и ставит соль + хеш */
function setPassword(player, password) {
	const salt = makeSalt();
	const saltTag = SALT_TAG + salt;
	const hashTag = HASH_TAG + hashPassword(salt, password);
	const old = player.getTags().filter(tag => tag.startsWith(SALT_TAG) || tag.startsWith(HASH_TAG) || tag.startsWith(LEGACY_TAG));
	try {
		if (!player.addTag(saltTag) || !player.addTag(hashTag)) throw new Error('Could not store credentials');
	} catch (error) {
		if (!old.includes(saltTag)) player.removeTag(saltTag);
		if (!old.includes(hashTag)) player.removeTag(hashTag);
		throw error;
	}
	for (const tag of old) {
		if (tag !== saltTag && tag !== hashTag) player.removeTag(tag);
	}
}

/**
 * Проверяет пароль. Старый открытый пароль при успешной проверке
 * сразу переводится в хеш (тег password:... удаляется).
 * @returns {boolean}
 */
function checkPassword(player, password) {
	const salt = tagValue(player, SALT_TAG);
	const hash = tagValue(player, HASH_TAG);
	if (salt !== undefined && hash !== undefined) {
		return hashPassword(salt, password) === hash;
	}
	if (player.hasTag(LEGACY_TAG + password)) {
		setPassword(player, password);
		return true;
	}
	return false;
}

// Каждая сессия начинается заново при входе. Теги с паролем остаются данными аккаунта.
const accountSessions = new Map();
const failedLogins = new Map();
const loginLockMs = 60000;
const attemptWindowMs = 15 * 60 * 1000;
const authMovementTag = 'sfo:auth_movement';
const resetRequestTag = 'auth:reset_request';
const ownerTelegram = '@goldenfrog_2577';
const accountText = (translate, ...args) => args.length ? { translate, with: args } : { translate };

function isAccountBot(player) {
	return player.hasTag('sys:bot') || player.hasTag('role:bot');
}

function hasAccountSession(player) {
	return accountSessions.get(player.id)?.authenticated === true;
}

function startAccountSession(player) {
	if (accountSessions.has(player.id) || isAccountBot(player)) return;
	if (player.hasTag('hasRegister')) {
		player.addTag('auth:done');
		player.removeTag('hasRegister');
	}
	player.removeTag('state:kick');
	const login = hasPassword(player);
	if (!login && player.hasTag('auth:done')) {
		player.sendMessage(accountText('chat.account.legacy'));
	}
	player.removeTag(login ? 'auth:register' : 'auth:login');
	player.addTag(login ? 'auth:login' : 'auth:register');
	const session = { login, authenticated: false, formOpen: false, nextFormTick: system.currentTick + 40 };
	accountSessions.set(player.id, session);
	lockAccountMovement(player);
}

function lockAccountMovement(player) {
	const movement = InputPermissionCategory.Movement;
	if (!player.inputPermissions.isPermissionCategoryEnabled(movement)) return;
	player.addTag(authMovementTag);
	player.inputPermissions.setPermissionCategory(movement, false);
}

function unlockAccountMovement(player) {
	// Keep the lease while an existing moderation freeze is still active.
	if (!player.hasTag(authMovementTag) || player.hasTag('state:frozen')) return;
	player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, true);
	player.removeTag(authMovementTag);
}

function finishAccountSession(player, session) {
	player.addTag('auth:done');
	player.removeTag('auth:login');
	player.removeTag('auth:register');
	player.removeTag(resetRequestTag);
	unlockAccountMovement(player);
	session.authenticated = true;
	failedLogins.delete(player.name.toLowerCase());

	player.sendMessage(accountText(session.login ? 'chat.account.logged_in' : 'sfo.port.account.registered'));
	if (player.hasTag('role:owner')) {
		for (const target of world.getAllPlayers()) {
			if (target.hasTag(resetRequestTag)) player.sendMessage(accountText('sfo.port.account.reset_request', target.name));
		}
	}
}

function registerAttempt(player, now) {
	const key = player.name.toLowerCase();
	const previous = failedLogins.get(key);
	const count = previous && previous.expires > now ? previous.count + 1 : 1;
	const blocked = count >= 5;
	failedLogins.set(key, { count: blocked ? 0 : count, lockedUntil: blocked ? now + loginLockMs : 0,
		expires: blocked ? now + loginLockMs : now + attemptWindowMs });
	player.sendMessage(blocked ? accountText('chat.account.error.locked', '60') : accountText('chat.account.error.wrong_password'));
}

async function showPasswordResetRequest(player) {
	const owners = world.getAllPlayers().filter(owner => owner.hasTag('role:owner') && hasAccountSession(owner));
	if (!player.hasTag(resetRequestTag)) {
		player.addTag(resetRequestTag);
		for (const owner of owners) owner.sendMessage(accountText('sfo.port.account.reset_request', player.name));
	}
	await new ModalFormData().title(accountText('account.forgot.title'))
		.textField({ rawtext: [accountText('account.forgot.body'), { text: '\n\n' },
			accountText(owners.length ? 'account.forgot.online' : 'account.forgot.offline')] },
		ownerTelegram, { defaultValue: ownerTelegram }).show(player);
}

async function showAccountForm(player, session) {
	const form = new ModalFormData().title(accountText(session.login ? 'account.login.title' : 'account.register.title'));
	if (session.login) {
		form.textField(accountText('account.login.hint'), accountText('account.login.placeholder'))
			.toggle(accountText('account.login.forgot'));
	} else {
		form.textField({ rawtext: [{ text: '§f' + player.name + '§r§7, ' }, accountText('account.login.intro')] },
			accountText('account.login.placeholder'))
			.toggle(accountText('account.register.agree'));
	}
	const response = await form.show(player);
	if (accountSessions.get(player.id) !== session || response.canceled || !response.formValues) return;

	const [entry, toggle] = response.formValues;
	const password = typeof entry === 'string' ? entry.trim() : '';
	if (session.login) {
		if (toggle === true) {
			await showPasswordResetRequest(player);
			return;
		}
		if (password && password.length <= 255 && checkPassword(player, password)) {
			finishAccountSession(player, session);
		} else {
			registerAttempt(player, Date.now());
		}
		return;
	}

	if (toggle !== true) {
		player.sendMessage(accountText('chat.account.error.no_cheats'));
		return;
	}
	if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
		player.sendMessage(accountText('chat.account.error.password_length'));
		return;
	}
	setPassword(player, password);
	finishAccountSession(player, session);
}

function pollAccountSessions() {
	const now = Date.now();
	for (const [id, attempt] of failedLogins) {
		if (attempt.expires <= now) failedLogins.delete(id);
	}
	for (const player of world.getAllPlayers()) {
		try {
			startAccountSession(player);
			const session = accountSessions.get(player.id);
			if (!session) continue;
			if (session.authenticated) {
				unlockAccountMovement(player);
				continue;
			}
			if (session.formOpen || system.currentTick < session.nextFormTick) continue;
			lockAccountMovement(player);
			if (session.login && (failedLogins.get(player.name.toLowerCase())?.lockedUntil ?? 0) > now) continue;
			session.formOpen = true;
			showAccountForm(player, session).catch(() => {
				if (accountSessions.get(player.id) === session && player.isValid) {
					console.error(logPrefix + ' Account form failed; another attempt will be offered.');
				}
			}).finally(() => {
				session.formOpen = false;
				session.nextFormTick = system.currentTick + 40;
			});
		} catch (error) {
			console.error(logPrefix + ' Could not initialize an account session: ' + error);
		}
	}
}

function registerPasswordReset(commands) {
	commands.registerCommand({
		name: 'sfo:resetpass',
		description: 'Reset an online player password (map owner only)',
		permissionLevel: CommandPermissionLevel.Admin,
		mandatoryParameters: [{ name: 'player', type: CustomCommandParamType.PlayerSelector }],
	}, (origin, targets) => {
		const owner = origin.sourceEntity;
		if (owner?.typeId !== 'minecraft:player' || !owner.hasTag('role:owner') || !hasAccountSession(owner)) {
			return { status: CustomCommandStatus.Failure, message: 'Access denied.' };
		}
		if (targets.length !== 1 || targets[0].id === owner.id || isAccountBot(targets[0])) {
			return { status: CustomCommandStatus.Failure, message: 'Select one other real player.' };
		}
		const [target] = targets;
		system.run(() => {
			if (!owner.isValid || !target.isValid || !owner.hasTag('role:owner') || !hasAccountSession(owner)) return;
			try {
				clearPassword(target);
				target.removeTag('hasRegister');
				target.removeTag('auth:done');
				target.removeTag(resetRequestTag);
				failedLogins.delete(target.name.toLowerCase());
				accountSessions.delete(target.id);
				startAccountSession(target);
				target.sendMessage(accountText('chat.account.reset'));
				owner.sendMessage(accountText('chat.account.reset.staff', owner.name, target.name));
			} catch {
				owner.sendMessage(accountText('sfo.port.account.reset_failed'));
				console.error(logPrefix + ' Could not reset a password.');
			}
		});
		return { status: CustomCommandStatus.Success };
	});
}

function needsAccountLogin(player) {
	return player?.typeId === 'minecraft:player' && !hasAccountSession(player) && !isAccountBot(player);
}

function cancelBeforeLogin(event) {
	if (needsAccountLogin(event.player)) event.cancel = true;
}

// До входа нельзя пользоваться шахтой и взаимодействовать с миром.
world.beforeEvents.playerBreakBlock.subscribe(cancelBeforeLogin);
world.beforeEvents.playerInteractWithBlock.subscribe(cancelBeforeLogin);
world.beforeEvents.playerInteractWithEntity.subscribe(cancelBeforeLogin);
world.beforeEvents.itemUse.subscribe((event) => { if (needsAccountLogin(event.source)) event.cancel = true; });
world.beforeEvents.entityHurt.subscribe((event) => {
	if (needsAccountLogin(event.hurtEntity) || needsAccountLogin(event.damageSource.damagingEntity)) event.cancel = true;
});

// Таблицы из pickaxe_lvl, autosale и automine исходного релиза.
const pickaxeRules = [
	{"last": 1, "type": "minecraft:stick", "blocks": ["minecraft:dirt", "minecraft:amethyst_cluster"]},
	{"last": 2, "type": "minecraft:wooden_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:amethyst_cluster"]},
	{"last": 4, "type": "minecraft:stone_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:amethyst_cluster"]},
	{"last": 5, "type": "minecraft:stone_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:amethyst_cluster"]},
	{"last": 7, "type": "minecraft:stone_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:amethyst_cluster"]},
	{"last": 9, "type": "minecraft:iron_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:amethyst_cluster"]},
	{"last": 10, "type": "minecraft:iron_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:amethyst_cluster"]},
	{"last": 12, "type": "minecraft:iron_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:amethyst_cluster"]},
	{"last": 14, "type": "minecraft:diamond_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:amethyst_cluster"]},
	{"last": 15, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:amethyst_cluster"]},
	{"last": 16, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:amethyst_cluster"]},
	{"last": 17, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:amethyst_cluster"]},
	{"last": 18, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:amethyst_cluster"]},
	{"last": 19, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:amethyst_cluster"]},
	{"last": 20, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:amethyst_cluster"]},
	{"last": 21, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:amethyst_cluster"]},
	{"last": 23, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:amethyst_cluster"]},
	{"last": 24, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:amethyst_cluster"]},
	{"last": 25, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:amethyst_cluster"]},
	{"last": 26, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:amethyst_cluster", "minecraft:granite"]},
	{"last": 27, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite"]},
	{"last": 29, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 30, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 32, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:tuff", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 33, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:tuff", "minecraft:calcite", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 34, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:tuff", "minecraft:calcite", "minecraft:raw_iron_block", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 36, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:tuff", "minecraft:calcite", "minecraft:raw_iron_block", "minecraft:raw_gold_block", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 38, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:tuff", "minecraft:calcite", "minecraft:raw_iron_block", "minecraft:raw_gold_block", "minecraft:raw_copper_block", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
	{"last": 40, "type": "minecraft:netherite_pickaxe", "blocks": ["minecraft:dirt", "minecraft:stone", "minecraft:coal_ore", "minecraft:iron_ore", "minecraft:copper_ore", "minecraft:redstone_ore", "minecraft:lit_redstone_ore", "minecraft:gold_ore", "minecraft:lapis_ore", "minecraft:diamond_ore", "minecraft:emerald_ore", "minecraft:netherrack", "minecraft:quartz_ore", "minecraft:nether_gold_ore", "minecraft:magma", "minecraft:gilded_blackstone", "minecraft:ancient_debris", "minecraft:netherite_block", "minecraft:obsidian", "minecraft:crying_obsidian", "minecraft:deepslate", "minecraft:tuff", "minecraft:calcite", "minecraft:raw_iron_block", "minecraft:raw_gold_block", "minecraft:raw_copper_block", "minecraft:amethyst_block", "minecraft:amethyst_cluster", "minecraft:granite", "minecraft:andesite", "minecraft:diorite"]},
];

const orePrices = {
	"minecraft:dirt": {"level": 1, "money": 1, "xp": 1},
	"minecraft:cobblestone": {"level": 2, "money": 2, "xp": 1},
	"minecraft:coal": {"level": 3, "money": 2, "xp": 2},
	"minecraft:raw_iron": {"level": 5, "money": 5, "xp": 4},
	"minecraft:raw_copper": {"level": 6, "money": 4, "xp": 3},
	"minecraft:redstone": {"level": 8, "money": 8, "xp": 6},
	"minecraft:raw_gold": {"level": 10, "money": 12, "xp": 10},
	"minecraft:lapis_lazuli": {"level": 11, "money": 11, "xp": 9},
	"minecraft:diamond": {"level": 13, "money": 22, "xp": 20},
	"minecraft:emerald": {"level": 15, "money": 30, "xp": 25},
	"minecraft:netherrack": {"level": 16, "money": 32, "xp": 50},
	"minecraft:quartz": {"level": 17, "money": 34, "xp": 53},
	"minecraft:gold_nugget": {"level": 18, "money": 36, "xp": 56},
	"minecraft:magma": {"level": 19, "money": 38, "xp": 59},
	"minecraft:gilded_blackstone": {"level": 20, "money": 40, "xp": 62},
	"minecraft:ancient_debris": {"level": 21, "money": 42, "xp": 65},
	"minecraft:netherite_ingot": {"level": 22, "money": 6, "xp": 9},
	"minecraft:netherite_block": {"level": 22, "money": 54, "xp": 81},
	"minecraft:obsidian": {"level": 24, "money": 48, "xp": 90},
	"minecraft:crying_obsidian": {"level": 25, "money": 50, "xp": 100},
	"minecraft:granite": {"level": 26, "money": 52, "xp": 110},
	"minecraft:andesite": {"level": 27, "money": 55, "xp": 120},
	"minecraft:diorite": {"level": 28, "money": 58, "xp": 130},
	"minecraft:cobbled_deepslate": {"level": 30, "money": 62, "xp": 145},
	"minecraft:tuff": {"level": 31, "money": 66, "xp": 160},
	"minecraft:calcite": {"level": 33, "money": 70, "xp": 175},
	"minecraft:raw_iron_block": {"level": 34, "money": 74, "xp": 190},
	"minecraft:raw_gold_block": {"level": 35, "money": 78, "xp": 210},
	"minecraft:raw_copper_block": {"level": 37, "money": 84, "xp": 230},
	"minecraft:amethyst_block": {"level": 39, "money": 90, "xp": 250},
};

const mineFills = [
	{"from": {"x": -11, "y": -4, "z": 7}, "to": {"x": -9, "y": 0, "z": 9}, "type": "minecraft:dirt", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": 0}, "to": {"x": -9, "y": 0, "z": 2}, "type": "minecraft:stone", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -7}, "to": {"x": -9, "y": 0, "z": -5}, "type": "minecraft:coal_ore", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -14}, "to": {"x": -9, "y": 0, "z": -12}, "type": "minecraft:iron_ore", "airOnly": false, "pit": true},
	{"from": {"x": -4, "y": -4, "z": -14}, "to": {"x": -2, "y": 0, "z": -12}, "type": "minecraft:copper_ore", "airOnly": false, "pit": true},
	{"from": {"x": 3, "y": -4, "z": -14}, "to": {"x": 5, "y": 0, "z": -12}, "type": "minecraft:redstone_ore", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -14}, "to": {"x": 12, "y": 0, "z": -12}, "type": "minecraft:gold_ore", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -7}, "to": {"x": 12, "y": 0, "z": -5}, "type": "minecraft:lapis_ore", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": 0}, "to": {"x": 12, "y": 0, "z": 2}, "type": "minecraft:diamond_ore", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": 7}, "to": {"x": 12, "y": 0, "z": 9}, "type": "minecraft:emerald_ore", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -28}, "to": {"x": -9, "y": 0, "z": -26}, "type": "minecraft:netherrack", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -35}, "to": {"x": -9, "y": 0, "z": -33}, "type": "minecraft:quartz_ore", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -42}, "to": {"x": -9, "y": 0, "z": -40}, "type": "minecraft:nether_gold_ore", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -49}, "to": {"x": -9, "y": 0, "z": -47}, "type": "minecraft:magma", "airOnly": false, "pit": true},
	{"from": {"x": -4, "y": -4, "z": -49}, "to": {"x": -2, "y": 0, "z": -47}, "type": "minecraft:gilded_blackstone", "airOnly": false, "pit": true},
	{"from": {"x": 3, "y": -4, "z": -49}, "to": {"x": 5, "y": 0, "z": -47}, "type": "minecraft:ancient_debris", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -49}, "to": {"x": 12, "y": 0, "z": -47}, "type": "minecraft:netherite_block", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -42}, "to": {"x": 12, "y": 0, "z": -40}, "type": "minecraft:obsidian", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -35}, "to": {"x": 12, "y": 0, "z": -33}, "type": "minecraft:crying_obsidian", "airOnly": false, "pit": true},
	{"from": {"x": -37, "y": -1, "z": -68}, "to": {"x": -35, "y": -1, "z": -66}, "type": "minecraft:amethyst_cluster", "airOnly": false, "pit": true},
	{"from": {"x": -15, "y": 0, "z": -87}, "to": {"x": 15, "y": 0, "z": -58}, "type": "minecraft:stone", "airOnly": true, "pit": false},
	{"from": {"x": -12, "y": -4, "z": -64}, "to": {"x": -8, "y": -1, "z": -60}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": 9, "y": -4, "z": -64}, "to": {"x": 13, "y": -1, "z": -60}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": -12, "y": -4, "z": -71}, "to": {"x": -8, "y": -1, "z": -67}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": 9, "y": -4, "z": -71}, "to": {"x": 13, "y": -1, "z": -67}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": -12, "y": -4, "z": -78}, "to": {"x": -8, "y": -1, "z": -74}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": 9, "y": -4, "z": -78}, "to": {"x": 13, "y": -1, "z": -74}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": -12, "y": -4, "z": -85}, "to": {"x": -8, "y": -1, "z": -81}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": -5, "y": -4, "z": -85}, "to": {"x": -1, "y": -1, "z": -81}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": 2, "y": -4, "z": -85}, "to": {"x": 6, "y": -1, "z": -81}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": 9, "y": -4, "z": -85}, "to": {"x": 13, "y": -1, "z": -81}, "type": "minecraft:stone", "airOnly": false, "pit": false},
	{"from": {"x": -11, "y": -4, "z": -63}, "to": {"x": -9, "y": 0, "z": -61}, "type": "minecraft:granite", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -70}, "to": {"x": -9, "y": 0, "z": -68}, "type": "minecraft:andesite", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -77}, "to": {"x": -9, "y": 0, "z": -75}, "type": "minecraft:diorite", "airOnly": false, "pit": true},
	{"from": {"x": -11, "y": -4, "z": -84}, "to": {"x": -9, "y": 0, "z": -82}, "type": "minecraft:deepslate", "airOnly": false, "pit": true},
	{"from": {"x": -4, "y": -4, "z": -84}, "to": {"x": -2, "y": 0, "z": -82}, "type": "minecraft:tuff", "airOnly": false, "pit": true},
	{"from": {"x": 3, "y": -4, "z": -84}, "to": {"x": 5, "y": 0, "z": -82}, "type": "minecraft:calcite", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -84}, "to": {"x": 12, "y": 0, "z": -82}, "type": "minecraft:raw_iron_block", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -77}, "to": {"x": 12, "y": 0, "z": -75}, "type": "minecraft:raw_gold_block", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -70}, "to": {"x": 12, "y": 0, "z": -68}, "type": "minecraft:raw_copper_block", "airOnly": false, "pit": true},
	{"from": {"x": 10, "y": -4, "z": -63}, "to": {"x": 12, "y": 0, "z": -61}, "type": "minecraft:amethyst_block", "airOnly": false, "pit": true},
];

// Игровой цикл шахт. Таблицы над этим блоком собраны из функций релиза 1.19.50.
const mineToolLore = '§r§8Shop for Ore';
const mineStaffRoles = ['role:owner', 'role:admin', 'role:moder', 'role:helper'];
let mineRefreshActive = false;

function mineStaff(player) {
	return mineStaffRoles.some(tag => player.hasTag(tag));
}

function mineWorld(dimension) {
	return dimension.id === 'minecraft:overworld';
}

function miningLevel(player) {
	return Math.max(1, Math.min(maxLevel, readScore(player, 'lvl')));
}

function withinMine(location, from, to) {
	const x = Math.floor(location.x);
	const y = Math.floor(location.y);
	const z = Math.floor(location.z);
	return x >= from.x && x <= to.x && y >= from.y && y <= to.y && z >= from.z && z <= to.z;
}

function getMiningToolRule(player) {
	return pickaxeRules.find(rule => miningLevel(player) <= rule.last);
}

function isMineTool(item) {
	if (!item) return false;
	if (item.getLore().includes(mineToolLore)) return true;
	if (item.lockMode !== serverApi.ItemLockMode.slot) return false;
	const blocks = item.getCanDestroy().map(id => id.replace(/^minecraft:/, ''));
	return blocks.includes('amethyst_cluster') && blocks.includes('dirt');
}

function addPurchasedPickaxeEnchants(player, item) {
	const enchantable = item.getComponent('minecraft:enchantable');
	if (!enchantable) return;
	for (const [id, maximum] of [['efficiency', 5], ['fortune', 3]]) {
		const level = Math.min(maximum, readScore(player, id));
		if (level < 1) continue;
		const type = serverApi.EnchantmentTypes.get('minecraft:' + id);
		if (!type || (enchantable.getEnchantment(type)?.level ?? 0) >= level) continue;
		if (enchantable.canAddEnchantment({ type, level })) enchantable.addEnchantment({ type, level });
	}
}

function giveLevelPickaxe(player) {
	if (!mineWorld(player.dimension) || player.hasTag('game:spleef') || player.hasTag('zone:tir')) return;
	const inventory = player.getComponent('minecraft:inventory')?.container;
	if (!inventory) return;
	if (!mineStaff(player) && player.getGameMode() !== serverApi.GameMode.Adventure) {
		player.setGameMode(serverApi.GameMode.Adventure);
	}
	const level = miningLevel(player);
	const rule = getMiningToolRule(player);
	const current = inventory.getItem(0);
	const oldTool = isMineTool(current);
	const durability = oldTool ? current.getComponent('minecraft:durability') : undefined;
	const replace = !oldTool || current.typeId !== rule.type || !current.getLore().includes(mineToolLore) ||
		readScore(player, 'pick') !== level;
	const repair = durability && durability.damage > 0 &&
		(player.selectedSlotIndex !== 0 || durability.damage >= durability.maxDurability * 0.9);
	if (!replace && !repair) return;

	const item = oldTool && current.typeId === rule.type ? current.clone() : new ItemStack(rule.type);
	item.keepOnDeath = true;
	item.lockMode = serverApi.ItemLockMode.slot;
	if (!item.getLore().includes(mineToolLore)) item.setLore([...item.getLore(), mineToolLore]);
	item.setCanDestroy(rule.blocks.filter(id => serverApi.BlockTypes.get(id)));
	const newDurability = item.getComponent('minecraft:durability');
	if (newDurability) newDurability.damage = 0;
	addPurchasedPickaxeEnchants(player, item);

	// Посторонний предмет у игрока остаётся в инвентаре, даже если занят первый слот.
	if (current && !oldTool) {
		let freeSlot = 1;
		while (freeSlot < inventory.size && inventory.getItem(freeSlot)) freeSlot++;
		if (freeSlot === inventory.size) return;
		inventory.moveItem(0, freeSlot, inventory);
		if (inventory.getItem(0)) return;
	}
	inventory.setItem(0, item);
	world.scoreboard.getObjective('pick').setScore(player, level);
}

function restrictMineBreak(event) {
	const { player, block } = event;
	if (event.cancel || !hasAccountSession(player) || mineStaff(player) ||
		player.hasTag('game:spleef') || player.hasTag('zone:tir')) return;

	const allowed = getMiningToolRule(player).blocks;
	const pit = mineFills.find(region => region.pit && withinMine(block.location, region.from, region.to));
	const vipAllowed = pit?.type !== 'minecraft:amethyst_cluster' || player.hasTag('player:vip');
	if (!mineWorld(block.dimension) || !pit || !vipAllowed || !allowed.includes(block.typeId) ||
		!isMineTool(event.itemStack)) event.cancel = true;
}

function addMinedBlock(event) {
	const { player, block } = event;
	if (!hasAccountSession(player) || !mineWorld(block.dimension)) return;
	if (!mineFills.some(region => region.pit && withinMine(block.location, region.from, region.to))) return;
	const scoreboard = world.scoreboard;
	const objective = scoreboard.getObjective('stat_mined') ?? scoreboard.addObjective('stat_mined', 'stat_mined');
	objective.addScore(player, 1);
}

function doMiningSale(player) {
	const dimension = player.dimension;
	if (!mineWorld(dimension) || player.hasTag('game:spleef') || player.hasTag('zone:tir')) return;
	const location = player.location;
	const ground = dimension.getBlock({ x: Math.floor(location.x), y: Math.floor(location.y - 1), z: Math.floor(location.z) });
	if (ground?.typeId !== 'minecraft:gold_block') return;

	const inventory = player.getComponent('minecraft:inventory')?.container;
	if (!inventory) return;
	const level = miningLevel(player);
	const vip = player.hasTag('player:vip');
	const x2 = player.hasTag('boost:x2');
	const x4 = player.hasTag('boost:x4');
	const multiplier = x2 && x4 ? 0 : x4 ? 4 : x2 ? 2 : 1;
	const sold = new Set();
	const sales = [];
	let money = 0;
	let xp = 0;
	let vipCoins = 0;

	// Как в релизе: за один проход продаётся по одному предмету каждого подходящего вида.
	for (let slot = 0; slot < inventory.size; slot++) {
		const item = inventory.getItem(slot);
		if (!item || sold.has(item.typeId)) continue;
		if (item.typeId === 'minecraft:amethyst_shard' && vip) {
			vipCoins++;
		} else {
			const price = orePrices[item.typeId];
			if (!price || level < price.level) continue;
			money += price.money;
			xp += price.xp * multiplier;
		}
		sold.add(item.typeId);
		sales.push({ slot, item });
	}

	const scoreboard = world.scoreboard;
	const previousScores = [];
	const previousItems = [];
	try {
		for (const {slot, item} of sales) {
			const remaining = item.amount === 1 ? undefined : item.clone();
			if (remaining) remaining.amount--;
			inventory.setItem(slot, remaining);
			previousItems.push({ slot, item });
		}
		for (const [id, delta] of [['money', money], ['xp', xp], ['vip_coins', vipCoins], ['stat_amethyst', vipCoins]]) {
			if (delta === 0) continue;
			const objective = scoreboard.getObjective(id) ?? scoreboard.addObjective(id, id);
			const before = objective.getScore(player);
			objective.setScore(player, (before ?? 0) + delta);
			previousScores.push({ objective, before });
		}
	} catch (error) {
		for (const { objective, before } of previousScores.reverse()) {
			if (before === undefined) objective.removeParticipant(player);
			else objective.setScore(player, before);
		}
		for (const { slot, item } of previousItems.reverse()) inventory.setItem(slot, item);
		throw error;
	}

	if (level < maxLevel && readScore(player, 'xp') >= experienceForLevel(level)) {
		// Функция релиза применяет повышение, титры и объявления. Стоимость сверяем с таблицей заранее.
		scoreboard.getObjective('xp_need').setScore(player, experienceForLevel(level));
		player.runCommand('function system/level_up_apply');
	}
	if (sales.length > 0 && player.hasTag('player:particle') && !player.hasTag('fx:sell')) {
		dimension.spawnParticle('minecraft:totem_particle', location);
	}
	if (sales.length > 0 && player.hasTag('player:sound')) player.playSound('random.pop');
}

function* regenerateMines(dimension) {
	try {
		for (const region of mineFills) {
			let safe = true;
			for (const player of world.getAllPlayers()) {
				if (mineWorld(player.dimension) && withinMine(player.location, region.from, region.to)) {
					const { x, z } = player.location;
					if (!player.tryTeleport({ x, y: 1, z }, { dimension, checkForBlocks: true })) safe = false;
				}
			}
			if (!safe) continue;
			const { from, to, type, airOnly } = region;
			dimension.fillBlocks(new serverApi.BlockVolume(from, to), type, {
				ignoreChunkBoundErrors: true,
				...(airOnly ? { blockFilter: { includeTypes: ['minecraft:air'] } } : {}),
			});
			yield;
		}
	} catch (error) {
		console.error(logPrefix + ' Mine regeneration failed: ' + error);
	} finally {
		mineRefreshActive = false;
	}
}

function startMineRegeneration() {
	if (mineRefreshActive || !world.getAllPlayers().some(player => mineWorld(player.dimension) && hasAccountSession(player))) return;
	mineRefreshActive = true;
	system.runJob(regenerateMines(world.getDimension('overworld')));
}

function runForMinePlayers(callback, errorLabel) {
	for (const player of world.getAllPlayers()) {
		if (!hasAccountSession(player)) continue;
		try {
			callback(player);
		} catch (error) {
			console.error(logPrefix + ' ' + errorLabel + ': ' + error);
		}
	}
}

function startMining() {
	system.runInterval(() => runForMinePlayers(giveLevelPickaxe, 'Could not update a level tool'), 20);
	system.runInterval(() => runForMinePlayers(doMiningSale, 'Ore sale failed'), 5);
	system.runInterval(startMineRegeneration, 500);
}

function mineDestination(player) {
	const level = miningLevel(player);
	return { x: 0, y: 5, z: level >= 26 ? -69 : level >= 16 ? -33 : 0 };
}

world.beforeEvents.playerBreakBlock.subscribe(restrictMineBreak);
world.afterEvents.playerBreakBlock.subscribe(addMinedBlock);

system.beforeEvents.startup.subscribe(({ itemComponentRegistry }) => {
	const open = ({ source }) => requestMenu(source);
	itemComponentRegistry.registerCustomComponent('sfo:open_menu', {
		onUse: open,
		onUseOn: open,
	});
});

system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
	try {
		registerPasswordReset(customCommandRegistry);
	} catch (error) {
		console.error(logPrefix + ' Could not register /sfo:resetpass: ' + error);
	}
});

world.afterEvents.worldLoad.subscribe(() => {
	pollAccountSessions();
	syncPlayerState();
	system.runInterval(pollAccountSessions, 10);
	system.runInterval(syncPlayerState, 20);
	startMining();
	console.log(logPrefix + ' Loaded: accounts, HUD, server menu, mines, ore sale.');
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
	try {
		if (initialSpawn) accountSessions.delete(player.id);
		startAccountSession(player);
		giveMenu(player);
	} catch (error) {
		console.error(logPrefix + ' Could not give the menu item: ' + error);
	}
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => {
	accountSessions.delete(playerId);
	forgetHud(playerId);
});

function syncPlayerState() {
	const players = world.getAllPlayers();
	try {
		updatePlayerScores(players);
	} catch (error) {
		console.error(logPrefix + ' Player score recovery failed: ' + error);
		return;
	}

	for (const player of players) {
		try {
			if (hasAccountSession(player)) refreshHud(player);
		} catch (error) {
			console.error(logPrefix + ' Could not update the HUD: ' + error);
		}
	}
}

function giveMenu(player) {
	const inventory = player.getComponent('minecraft:inventory')?.container;
	if (!inventory) return;

	for (let slot = 0; slot < inventory.size; slot++) {
		if (inventory.getItem(slot)?.typeId === menuItemId) return;
	}

	if (inventory.emptySlotsCount === 0) {
		player.sendMessage(message('inventory_full'));
		return;
	}

	const item = new ItemStack(menuItemId);
	item.keepOnDeath = true;
	if (!inventory.getItem(8)) {
		inventory.setItem(8, item);
	} else {
		inventory.addItem(item);
	}
}

function requestMenu(player) {
	if (needsAccountLogin(player)) return;
	const id = player.id;
	if (openMenus.has(id)) return;

	// Both item callbacks may fire on a block. Reserve the form once per player.
	openMenus.add(id);
	system.run(async () => {
		try {
			if (hasAccountSession(player)) await showMenu(player);
		} catch (error) {
			console.error(logPrefix + ' Server menu failed: ' + error);
		} finally {
			openMenus.delete(id);
		}
	});
}

async function showMenu(player) {
	let showTeleports = false;
	while (true) {
		const form = new ActionFormData();
		if (showTeleports) {
			form.title(message('teleports.title'))
				.button(message('teleports.mine'))
				.button(message('back'));
		} else {
			form.title(message('menu.title'))
				.button(message('menu.teleports'));
		}

		const result = await form.show(player);
		if (result.canceled || !hasAccountSession(player)) return;

		if (showTeleports && result.selection === 0) {
			const moved = player.tryTeleport(mineDestination(player), {
				dimension: world.getDimension('overworld'),
				checkForBlocks: true,
			});
			player.sendMessage(moved ? { translate: 'chat.cmd.warp.done', with: { rawtext: [{ translate: 'warp.mine' }] } }
				: message('mine.unavailable'));
			return;
		}

		if (result.selection !== (showTeleports ? 1 : 0)) return;
		showTeleports = !showTeleports;
	}
}
