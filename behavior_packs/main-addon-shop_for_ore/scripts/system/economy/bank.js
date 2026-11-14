import { Items, ItemStack } from '@minecraft/server';
import { changeMoney, getScore, isPending, tell } from '../../utils.js';

const COIN_ID = 'minecraft:gold_ingot';
const STACK_SIZE = 64;
const MAX_BALANCE = 2147483647;
const exchanging = new Set();
const pendingRefunds = new Map();

function inventory(player) {
	return player.getComponent('inventory').container;
}

function isCoin(item) {
	return item?.typeId === COIN_ID;
}

export function inventoryCoins(player) {
	const container = inventory(player);
	let count = 0;
	for (let slot = 0; slot < container.size; slot++) {
		const item = container.getItem(slot);
		if (isCoin(item)) count += item.amount;
	}
	return count;
}

export function bankAmount(raw) {
	const text = String(raw ?? '').trim();
	const amount = Number(text);
	return /^\d+$/.test(text) && Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_BALANCE ? amount : undefined;
}

function newStack(amount) {
	// В Bedrock 1.19.50 setItem требует ItemStack даже при очистке слота.
	return new ItemStack(Items.get(amount ? COIN_ID : 'minecraft:stick'), amount);
}

function stackPlan(container, amount, deposit) {
	const changes = [];
	// Снятие сначала заполняет существующие стопки обычных монет, затем пустые слоты.
	const empty = [];
	for (let slot = 0; slot < container.size && amount > 0; slot++) {
		const item = container.getItem(slot);
		if (!item) {
			if (!deposit) empty.push(slot);
			continue;
		}
		if (!isCoin(item) || (!deposit && (item.nameTag || item.getLore?.()?.length))) continue;
		const count = Math.min(amount, deposit ? item.amount : STACK_SIZE - item.amount);
		if (count <= 0) continue;
		changes.push({ slot, item, amount: item.amount + (deposit ? -count : count) });
		amount -= count;
	}
	for (const slot of empty) {
		if (!amount) break;
		const count = Math.min(amount, STACK_SIZE);
		changes.push({ slot, amount: count });
		amount -= count;
	}
	return amount === 0 ? changes : undefined;
}

function writeStacks(container, changes) {
	const applied = [];
	try {
		for (const change of changes) {
			const { slot, item, amount } = change;
			const original = item?.amount ?? 0;
			// getItem возвращает отдельный стек. Сохраняем имя и свойства исходной стопки.
			if (item && amount) item.amount = amount;
			applied.push({ slot, item, original });
			container.setItem(slot, item && amount ? item : newStack(amount));
		}
	} catch (error) {
		for (const { slot, item, original } of applied.reverse()) {
			if (item) item.amount = original;
			container.setItem(slot, item ?? newStack(0));
		}
		throw error;
	}
}

function refundItems(player, amount) {
	const container = inventory(player);
	const plan = stackPlan(container, amount, false);
	if (!plan) return false;
	writeStacks(container, plan);
	return true;
}

async function restoreExchange(player) {
	const refund = pendingRefunds.get(player.name);
	if (!refund) return true;
	try {
		const restored = refund.deposit ? refundItems(player, refund.amount) : await changeMoney(player, refund.amount);
		if (!restored) return false;
		pendingRefunds.delete(player.name);
		return true;
	} catch { return false; }
}

export async function exchangeCoins(player, raw, deposit) {
	if (isPending(player)) return tell(player, 'chat.account.error.login_required');
	const name = player.name;
	if (exchanging.has(name)) return tell(player, 'chat.bank.error.busy');
	const amount = bankAmount(raw);
	if (!amount) return tell(player, 'chat.cmd.error.number', String(raw ?? '').trim() || '—', 1, MAX_BALANCE);
	exchanging.add(name);
	try {
		if (!await restoreExchange(player)) return tell(player, 'chat.bank.error.exchange');
		const balance = getScore(player, 'money');
		if (deposit && balance > MAX_BALANCE - amount) return tell(player, 'chat.bank.error.balance_limit');
		if (!deposit && balance < amount) return tell(player, 'chat.error.no_money');

		const container = inventory(player);
		const plan = stackPlan(container, amount, deposit);
		if (!plan) return tell(player, deposit ? 'chat.bank.error.no_coins' : 'chat.bank.error.no_space');
		if (deposit) {
			writeStacks(container, plan);
			pendingRefunds.set(name, { deposit, amount });
			if (!await changeMoney(player, amount)) throw Error('The account could not be credited');
		} else {
			if (!await changeMoney(player, -amount)) return tell(player, 'chat.error.no_money');
			pendingRefunds.set(name, { deposit, amount });
			// Инвентарь мог измениться, пока выполнялась команда табло.
			if (!refundItems(player, amount)) throw Error('The inventory changed before delivery');
		}
		pendingRefunds.delete(name);
		return tell(player, deposit ? 'chat.bank.deposit.done' : 'chat.bank.withdraw.done', amount);
	} catch (error) {
		if (!await restoreExchange(player)) console.warn('[Shop for Ore] Bank refund pending for ' + name + ': ' + error);
		return tell(player, 'chat.bank.error.exchange');
	} finally {
		exchanging.delete(name);
	}
}