import { CostMilestoneEntity } from "@db/entities";
import { DeepPartial } from "typeorm";

export const costMilestoneRawData: DeepPartial<CostMilestoneEntity>[] = [
	{
		costFrom: 0,
		costTo: 3,
		secPerCost: 0,
	},
	{
		costFrom: 3.5,
		costTo: 5,
		secPerCost: 5,
	},
	{
		costFrom: 5.5,
		costTo: 10,
		secPerCost: 7,
	},
	{
		costFrom: 10,
		secPerCost: 9,
	},
];
