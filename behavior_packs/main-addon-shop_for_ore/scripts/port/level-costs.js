// Пороги опыта из functions/system/xp_need.mcfunction релиза 1.19.50.
const costs = [
	100, 120, 180, 260, 440, 640, 800, 1260,
	1500, 2600, 2900, 3200, 6800, 7400, 10000, 21000,
	24900, 27600, 30400, 33500, 35700, 43740, 45360, 50400,
	57000, 63800, 70800, 78000, 80600, 89900, 100800, 102400,
	113750, 125400, 140700, 147000, 165600, 172500, 195000, 0,
];

export const maxLevel = costs.length;

export function experienceForLevel(level) {
	return costs[level - 1] ?? 0;
}
