// --- Античит: удаление запрещённых предметов и читерских зачарований ---
// Проверяет инвентарь игроков на наличие запрещённых предметов и завышенных уровней чар

import { world, system, Items, ItemStack, ItemEnchantsComponent, PlayerInventoryComponentContainer } from '@minecraft/server';

// --- Список запрещённых предметов ---
const bannedItems = [
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
]

// --- Пустой предмет для очистки слота ---
const air = new ItemStack(Items.get("minecraft:stick"), 0)

// --- Проверка инвентаря на запрещённые предметы ---
system.runSchedule(() => {
	for (let player of world.getPlayers()) {
		const container = player.getComponent("inventory").container;
		for (let i = 0; i < container.size; i++) {
			const item = container.getItem(i);
			// Только если предмет запрещён и игрок не хост
			if (!item || player.hasTag('host') || !bannedItems.includes(item.typeId)) continue;
			container.setItem(i, air);
			world.say(`§7[§cAnti-Cheat§7] §4${player.name} §c%message.anticheat.detectItem §4${item.typeId}`);
		}
	}
})

// --- Проверка на завышенные уровни чар (читерские предметы) ---
system.runSchedule(() => {
	for (let player of world.getPlayers()) {
		const container = player.getComponent("inventory").container;
		for (let i = 0; i < container.size; i++) {
			const item = container.getItem(i);
			if (!item) continue;
			const enchantComponent = item.getComponent("enchantments")
			for (const enchant of enchantComponent.enchantments) {
				// Только если уровень чар превышает максимум и игрок не хост
				if (player.hasTag('host') || enchant.type.maxLevel >= enchant.level) continue;
				container.setItem(i, air);
				world.say(`§7[§cAnti-Cheat§7] §4${player.name} §c%message.acticheat.detectEchant.1 §4${item.typeId} §c%message.acticheat.detectEchant.2 §4${enchant.level} §c%message.acticheat.detectEchant.3`);
				break;
			}
		}
	}
});
