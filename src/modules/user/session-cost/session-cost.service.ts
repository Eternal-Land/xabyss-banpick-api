import { SessionCostEntity } from "@db/entities";
import {
	AccountCharacterRepository,
	BanPickSlotRepository,
	CharacterCostRepository,
	CharacterLevelCostRepository,
	CostMilestoneRepository,
	MatchSessionRepository,
	SessionCostRepository,
	WeaponCostRepository,
	WeaponRepository,
} from "@db/repositories";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PlayerSide, WeaponCostUnit } from "@utils/enums";
import { SessionCostRequest } from "./dto";
import { LessThanOrEqual } from "typeorm";

type SideCostBreakdown = {
	constellationCost: number;
	refinementCost: number;
	levelCost: number;
	timeBonusCost: number;
	costMilestone: number;
	totalCost: number;
};

@Injectable()
export class UserSessionCostService {
	constructor(
		private readonly matchSessionRepo: MatchSessionRepository,
		private readonly banPickSlotRepo: BanPickSlotRepository,
		private readonly characterCostRepo: CharacterCostRepository,
		private readonly accountCharacterRepo: AccountCharacterRepository,
		private readonly weaponRepo: WeaponRepository,
		private readonly weaponCostRepo: WeaponCostRepository,
		private readonly costMilestoneRepo: CostMilestoneRepository,
		private readonly sessionCostRepo: SessionCostRepository,
		private readonly characterLevelCostRepo: CharacterLevelCostRepository,
	) {}

	async calculate(
		matchSessionId: number,
		dto: SessionCostRequest,
	): Promise<SessionCostEntity> {
		const matchSession = await this.matchSessionRepo.findOne({
			where: { id: matchSessionId },
		});

		if (!matchSession) {
			throw new NotFoundException("Match session not found");
		}

		const sessionCost = await this.sessionCostRepo.findOne({
			where: { matchSessionId },
			order: { id: "DESC" },
		});

		const slots = await this.banPickSlotRepo.find({
			where: { matchSessionId },
			order: { turnIndex: "DESC" },
		});

		if (slots[0].turnIndex !== dto.currentTurn) {
			throw new NotFoundException(
				"Ban pick slot not found for the current turn",
			);
		}

		// Character cost
		const characterCost = await this.characterCostRepo.findOne({
			where: {
				characterId: dto.characterId,
				constellation: dto.activatedConstellation,
			},
		});

		if (characterCost && characterCost.cost > 0) {
			if (dto.side === PlayerSide.BLUE) {
				sessionCost.blueConstellationCost += characterCost.cost;
				sessionCost.blueTotalCost += characterCost.cost;
			} else {
				sessionCost.redConstellationCost += characterCost.cost;
				sessionCost.redTotalCost += characterCost.cost;
			}
		}

		// Character level cost
		const characterLevelCost = await this.characterLevelCostRepo.findOne({
			where: {
				characterId: dto.characterId,
				level: dto.characterLevel,
			},
		});

		if (characterLevelCost && characterLevelCost.cost > 0) {
			if (dto.side === PlayerSide.BLUE) {
				sessionCost.blueLevelCost += characterLevelCost.cost;
				sessionCost.blueTotalCost += characterLevelCost.cost;
			} else {
				sessionCost.redLevelCost += characterLevelCost.cost;
				sessionCost.redTotalCost += characterLevelCost.cost;
			}
		}

		// Weapon cost
		const weaponCost = await this.weaponCostRepo.find({
			where: {
				id: dto.weaponId,
				weaponRarity: dto.weaponRarity,
				upgradeLevel: LessThanOrEqual(dto.weaponRefinement),
			},
		});

		if (weaponCost.length > 0) {
			weaponCost.forEach((cost) => {
				if (dto.side === PlayerSide.BLUE) {
					if (cost.unit === WeaponCostUnit.SECONDS) {
						sessionCost.blueRefinementCost += cost.value;
					} else {
						sessionCost.blueTotalCost += cost.value;
					}
				} else {
					if (cost.unit === WeaponCostUnit.SECONDS) {
						sessionCost.redRefinementCost += cost.value;
					} else {
						sessionCost.redTotalCost += cost.value;
					}
				}
			});
		}

		// Time bonus cost
		const currentTotalCost =
			dto.side === PlayerSide.BLUE
				? sessionCost.blueTotalCost
				: sessionCost.redTotalCost;

		const costMilestones = await this.costMilestoneRepo.findOne({
			where: {
				costFrom: LessThanOrEqual(currentTotalCost || 0),
				costTo: LessThanOrEqual(currentTotalCost || 0),
			},
			order: { costFrom: "DESC" },
		});

		if (costMilestones) {
			if (dto.side === PlayerSide.BLUE) {
				sessionCost.blueCostMilestone = costMilestones.id;
				sessionCost.blueTimeBonusCost =
					currentTotalCost * costMilestones.secPerCost +
					sessionCost.blueConstellationCost +
					sessionCost.blueRefinementCost +
					sessionCost.blueLevelCost;
			} else {
				sessionCost.redCostMilestone = costMilestones.id;
				sessionCost.redTimeBonusCost =
					currentTotalCost * costMilestones.secPerCost +
					sessionCost.redConstellationCost +
					sessionCost.redRefinementCost +
					sessionCost.redLevelCost;
			}
		}

		return await this.sessionCostRepo.save(sessionCost);
	}
}
