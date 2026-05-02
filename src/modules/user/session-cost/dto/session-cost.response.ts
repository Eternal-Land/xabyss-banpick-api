import { SessionCostEntity } from "@db/entities";
import { ApiProperty } from "@nestjs/swagger";
import { Builder } from "builder-pattern";

export class SessionCostResponse {
	@ApiProperty()
	id: number;

	@ApiProperty()
	matchSessionId: number;

	@ApiProperty()
	blueTotalCost: number;

	@ApiProperty()
	blueCostMilestone: number;

	@ApiProperty()
	blueConstellationCost: number;

	@ApiProperty()
	blueRefinementCost: number;

	@ApiProperty()
	blueLevelCost: number;

	@ApiProperty()
	blueTimeBonusCost: number;

	@ApiProperty()
	blueSpecialCost: number;

	@ApiProperty()
	redTotalCost: number;

	@ApiProperty()
	redCostMilestone: number;

	@ApiProperty()
	redConstellationCost: number;

	@ApiProperty()
	redRefinementCost: number;

	@ApiProperty()
	redLevelCost: number;

	@ApiProperty()
	redTimeBonusCost: number;

	@ApiProperty()
	redSpecialCost: number;

	static fromEntity(entity: SessionCostEntity): SessionCostResponse {
		return Builder(SessionCostResponse)
			.id(entity.id)
			.matchSessionId(entity.matchSessionId)
			.blueTotalCost(Number(entity.blueTotalCost))
			.blueCostMilestone(Number(entity.blueCostMilestone))
			.blueConstellationCost(Number(entity.blueConstellationCost))
			.blueRefinementCost(Number(entity.blueRefinementCost))
			.blueLevelCost(Number(entity.blueLevelCost))
			.blueTimeBonusCost(Number(entity.blueTimeBonusCost))
			.blueSpecialCost(Number(entity.blueSpecialCost ?? 0))
			.redTotalCost(Number(entity.redTotalCost))
			.redCostMilestone(Number(entity.redCostMilestone))
			.redConstellationCost(Number(entity.redConstellationCost))
			.redRefinementCost(Number(entity.redRefinementCost))
			.redLevelCost(Number(entity.redLevelCost))
			.redTimeBonusCost(Number(entity.redTimeBonusCost))
			.redSpecialCost(Number(entity.redSpecialCost ?? 0))
			.build();
	}
}
