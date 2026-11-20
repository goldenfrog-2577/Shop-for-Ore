// Шахты: кирки уровней, защита блоков, приём руды и восстановление залежей.
import { world, system, ItemStack, ItemLockMode, GameMode, BlockTypes, BlockVolume, EnchantmentTypes } from '@minecraft/server';
import { MAX_LEVEL, getScore, isPending, isBot } from '../../utils.js';

const logPrefix = '[Shop for Ore] Шахты:';
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

const canMine = player => player.hasTag('auth:done') && !isPending(player) && !isBot(player);

function miningLevel(player) {
	return Math.max(1, Math.min(MAX_LEVEL, getScore(player, 'lvl')));
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
	if (item.lockMode !== ItemLockMode.slot) return false;
	const blocks = item.getCanDestroy().map(id => id.replace(/^minecraft:/, ''));
	return blocks.includes('amethyst_cluster') && blocks.includes('dirt');
}

function addPurchasedPickaxeEnchants(player, item) {
	const enchantable = item.getComponent('minecraft:enchantable');
	if (!enchantable) return;
	for (const [id, maximum] of [['efficiency', 5], ['fortune', 3]]) {
		const level = Math.min(maximum, getScore(player, id));
		if (level < 1) continue;
		const type = EnchantmentTypes.get('minecraft:' + id);
		if (!type || (enchantable.getEnchantment(type)?.level ?? 0) >= level) continue;
		if (enchantable.canAddEnchantment({ type, level })) enchantable.addEnchantment({ type, level });
	}
}

function giveLevelPickaxe(player) {
	if (!mineWorld(player.dimension) || player.hasTag('game:spleef') || player.hasTag('zone:tir')) return;
	const inventory = player.getComponent('minecraft:inventory')?.container;
	if (!inventory) return;
	if (!mineStaff(player) && player.getGameMode() !== GameMode.Adventure) {
		player.setGameMode(GameMode.Adventure);
	}
	const level = miningLevel(player);
	const rule = getMiningToolRule(player);
	const current = inventory.getItem(0);
	const oldTool = isMineTool(current);
	const durability = oldTool ? current.getComponent('minecraft:durability') : undefined;
	const replace = !oldTool || current.typeId !== rule.type || !current.getLore().includes(mineToolLore) ||
		getScore(player, 'pick') !== level;
	const repair = durability && durability.damage > 0 &&
		(player.selectedSlotIndex !== 0 || durability.damage >= durability.maxDurability * 0.9);
	if (!replace && !repair) return;

	const item = oldTool && current.typeId === rule.type ? current.clone() : new ItemStack(rule.type);
	item.keepOnDeath = true;
	item.lockMode = ItemLockMode.slot;
	if (!item.getLore().includes(mineToolLore)) item.setLore([...item.getLore(), mineToolLore]);
	item.setCanDestroy(rule.blocks.filter(id => BlockTypes.get(id)));
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
	if (event.cancel || !canMine(player) || mineStaff(player) ||
		player.hasTag('game:spleef') || player.hasTag('zone:tir')) return;

	const allowed = getMiningToolRule(player).blocks;
	const pit = mineFills.find(region => region.pit && withinMine(block.location, region.from, region.to));
	const vipAllowed = pit?.type !== 'minecraft:amethyst_cluster' || player.hasTag('player:vip');
	if (!mineWorld(block.dimension) || !pit || !vipAllowed || !allowed.includes(block.typeId) ||
		!isMineTool(event.itemStack)) event.cancel = true;
}

function doMiningSale(player) {
	const dimension = player.dimension;
	if (!mineWorld(dimension) || player.hasTag('game:spleef') || player.hasTag('zone:tir')) return;
	const location = player.location;
	const y = Math.floor(location.y) - 1;
	const { min, max } = dimension.heightRange;
	if (y < min || y >= max) return;
	const ground = dimension.getBlock({ x: Math.floor(location.x), y, z: Math.floor(location.z) });
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

	const needed = getScore(player, 'xp_need');
	if (level < MAX_LEVEL && needed > 0 && getScore(player, 'xp') >= needed) {
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
			dimension.fillBlocks(new BlockVolume(from, to), type, {
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
	if (mineRefreshActive || !world.getAllPlayers().some(player => mineWorld(player.dimension) && canMine(player))) return;
	mineRefreshActive = true;
	system.runJob(regenerateMines(world.getDimension('overworld')));
}

function runForMinePlayers(callback, errorLabel) {
	for (const player of world.getAllPlayers()) {
		if (!canMine(player)) continue;
		try {
			callback(player);
		} catch (error) {
			console.error(logPrefix + ' ' + errorLabel + ': ' + error);
		}
	}
}

world.afterEvents.worldLoad.subscribe(() => {
	system.runInterval(() => runForMinePlayers(giveLevelPickaxe, 'Could not update a level tool'), 20);
	system.runInterval(() => runForMinePlayers(doMiningSale, 'Ore sale failed'), 5);
	system.runInterval(startMineRegeneration, 500);
});

world.beforeEvents.playerBreakBlock.subscribe(restrictMineBreak);
