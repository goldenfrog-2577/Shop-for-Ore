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
