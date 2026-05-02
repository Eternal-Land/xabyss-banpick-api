import { rawChars } from "./characters";

type CharacterLevelCostSeedItem = {
	key: string;
	levelCosts: Array<{
		level: 95 | 100;
		cost: number;
	}>;
};

// Replace each cost value with your imported data.
export const characterLevelCostsRawData: CharacterLevelCostSeedItem[] = [
	{
		key: "mavuika",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "skirk",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "flins",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "ineffa",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "varesa",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "zibai",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "linnea",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
	{
		key: "mualani",
		levelCosts: [
			{ level: 95, cost: 5 },
			{ level: 100, cost: 10 },
		],
	},
];
