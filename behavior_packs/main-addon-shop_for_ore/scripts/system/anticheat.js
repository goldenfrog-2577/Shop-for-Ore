// --- Античит: удаление запрещённых предметов и читерских зачарований ---
// Проверяет инвентарь игроков на наличие запрещённых предметов и завышенных уровней чар

import { world, system, Items, ItemStack } from '@minecraft/server';

// --- Список запрещённых предметов ---
const bannedItems = new Set([
	"minecraft:beehive",
	"minecraft:bee_nest",
	"minecraft:salmon_bucket",
	"minecraft:cod_bucket",
	"minecraft:pufferfish_bucket",
	"minecraft:tropical_fish_bucket",
	"minecraft:axolotl_bucket",
	"minecraft:tadpole_bucket",
	"minecraft:portal",
	"minecraft:end_portal",
	"minecraft:moving_block",
	"minecraft:movingblock",
	"minecraft:info_update2",
	"minecraft:stickyPinstonArmCollision",
	"minecraft:splash_potion",
	"minecraft:lingering_potion",
	"minecraft:crossbow",
	"minecraft:fire",
	"minecraft:bedrock",
	"minecraft:invisiblebedrock",
	"minecraft:glowlingobsidian",
	"minecraft:flowing_water",
	"minecraft:flowing_lava",
	"minecraft:command_block_minecart"
])

// --- Предметы VIP-лавки (VIP-остров, x −84…−74) с чарами выше ванильного максимума ---
// Кирки (эффективность до 30, удача до 15) и головы (защита X) продаются намеренно,
// поэтому их не считаем читерскими. Сверяются тип и имя предмета из сундуков лавки.
const vipItems = new Set([
	"minecraft:netherite_pickaxe|§r§lЗачарованая кирка #1",
	"minecraft:netherite_pickaxe|§r§lЗачарованая кирка #2",
	"minecraft:netherite_pickaxe|§r§lЗачарованая кирка #3",
	"minecraft:skull|§r§eЧереп скелета",
	"minecraft:skull|§r§eЧереп скелета-иссушителя",
	"minecraft:skull|§r§eГолова зомби",
	"minecraft:skull|§r§eГолова игрока",
	"minecraft:skull|§r§eГолова крипера",
	"minecraft:skull|§r§eГолова дракона Края"
]);

// --- Пустой предмет для очистки слота ---
const air = new ItemStack(Items.get("minecraft:stick"), 0)

// --- Проверка инвентаря: запрещённые предметы и завышенные уровни чар ---
// Один проход по инвентарю раз в CHECK_EVERY_TICKS тиков (раньше — два полных прохода каждый тик)
const CHECK_EVERY_TICKS = 10;
let tick = 0;
system.runSchedule(() => {
	if (++tick % CHECK_EVERY_TICKS !== 0) return;
	for (const player of world.getPlayers()) {
		// Хост не проверяется
		if (player.hasTag('host')) continue;
		const container = player.getComponent("inventory").container;
		for (let i = 0; i < container.size; i++) {
			const item = container.getItem(i);
			if (!item) continue;

			// Запрещённый предмет
			if (bannedItems.has(item.typeId)) {
				container.setItem(i, air);
				world.say(`§7[§cAnti-Cheat§7] §4${player.name} §c%message.anticheat.detectItem §4${item.typeId}`);
				continue;
			}

			// Предмет из VIP-лавки — чары выше максимума у него законные
			if (vipItems.has(`${item.typeId}|${item.nameTag ?? ''}`)) continue;

			// Уровень чар выше максимального (у части предметов компонента нет)
			const enchantComponent = item.getComponent("enchantments");
			if (!enchantComponent) continue;
			for (const enchant of enchantComponent.enchantments) {
				if (enchant.type.maxLevel >= enchant.level) continue;
				container.setItem(i, air);
				world.say(`§7[§cAnti-Cheat§7] §4${player.name} §c%message.acticheat.detectEchant.1 §4${item.typeId} §c%message.acticheat.detectEchant.2 §4${enchant.level} §c%message.acticheat.detectEchant.3`);
				break;
			}
		}
	}
});
