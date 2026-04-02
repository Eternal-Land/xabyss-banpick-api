import { SessionCostEntity } from "@db/entities";
import {
	AccountCharacterRepository,
	BanPickSlotRepository,
	CharacterCostRepository,
	CharacterLevelCostRepository,
	CostMilestoneRepository,
	MatchStateRepository,
	MatchSessionRepository,
	SessionCostRepository,
	WeaponCostRepository,
	WeaponRepository,
} from "@db/repositories";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PlayerSide, WeaponCostUnit } from "@utils/enums";
import { SessionCostRequest } from "./dto";
import { LessThanOrEqual } from "typeorm";

@Injectable()
export class UserSessionCostService {
	private toNumber(value: unknown): number {
		const numeric = Number(value);
		return Number.isFinite(numeric) ? numeric : 0;
	}

	private normalizeSessionCost(sessionCost: SessionCostEntity) {
		sessionCost.blueTotalCost = this.toNumber(sessionCost.blueTotalCost);
		sessionCost.blueCostMilestone = this.toNumber(
			sessionCost.blueCostMilestone,
		);
		sessionCost.blueConstellationCost = this.toNumber(
			sessionCost.blueConstellationCost,
		);
		sessionCost.blueRefinementCost = this.toNumber(
			sessionCost.blueRefinementCost,
		);
		sessionCost.blueLevelCost = this.toNumber(sessionCost.blueLevelCost);
		sessionCost.blueTimeBonusCost = this.toNumber(
			sessionCost.blueTimeBonusCost,
		);
		sessionCost.redTotalCost = this.toNumber(sessionCost.redTotalCost);
		sessionCost.redCostMilestone = this.toNumber(sessionCost.redCostMilestone);
		sessionCost.redConstellationCost = this.toNumber(
			sessionCost.redConstellationCost,
		);
		sessionCost.redRefinementCost = this.toNumber(
			sessionCost.redRefinementCost,
		);
		sessionCost.redLevelCost = this.toNumber(sessionCost.redLevelCost);
		sessionCost.redTimeBonusCost = this.toNumber(sessionCost.redTimeBonusCost);
	}

	private async findOrCreateSessionCost(matchSessionId: number) {
		let sessionCost = await this.sessionCostRepo.findOne({
			where: { matchSessionId },
			order: { id: "DESC" },
		});

		if (!sessionCost) {
			sessionCost = await this.sessionCostRepo.save(
				this.sessionCostRepo.create({
					matchSessionId,
					blueTotalCost: 0,
					blueCostMilestone: 0,
					blueConstellationCost: 0,
					blueRefinementCost: 0,
					blueLevelCost: 0,
					blueTimeBonusCost: 0,
					redTotalCost: 0,
					redCostMilestone: 0,
					redConstellationCost: 0,
					redRefinementCost: 0,
					redLevelCost: 0,
					redTimeBonusCost: 0,
				}),
			);
		}

		this.normalizeSessionCost(sessionCost);
		return sessionCost;
	}

	constructor(
		private readonly matchSessionRepo: MatchSessionRepository,
		private readonly matchStateRepo: MatchStateRepository,
		private readonly banPickSlotRepo: BanPickSlotRepository,
		private readonly characterCostRepo: CharacterCostRepository,
		private readonly accountCharacterRepo: AccountCharacterRepository,
		private readonly weaponRepo: WeaponRepository,
		private readonly weaponCostRepo: WeaponCostRepository,
		private readonly costMilestoneRepo: CostMilestoneRepository,
		private readonly sessionCostRepo: SessionCostRepository,
		private readonly characterLevelCostRepo: CharacterLevelCostRepository,
	) {}

	async getCurrentSessionCost(matchId: string): Promise<SessionCostEntity> {
		const sessions = await this.matchSessionRepo.find({
			where: { matchId, isDeleted: false },
			order: { id: "ASC" },
		});

		if (!sessions.length) {
			throw new NotFoundException("Match session not found");
		}

		const matchState = await this.matchStateRepo.findOne({
			where: { matchId },
		});
		const currentSession =
			sessions.find((session) => session.id === matchState?.currentSession) ??
			sessions[0];

		return await this.findOrCreateSessionCost(currentSession.id);
	}

	async calculate(
		matchSessionId: number,
		dto: SessionCostRequest,
	): Promise<SessionCostEntity> {
		const matchSession = await this.matchSessionRepo.findOne({
			where: { id: matchSessionId, isDeleted: false },
		});

		if (!matchSession) {
			throw new NotFoundException("Match session not found");
		}

		const sessionCost = await this.findOrCreateSessionCost(matchSessionId);

		const slots = await this.banPickSlotRepo.find({
			where: { matchSessionId },
			order: { turnIndex: "DESC" },
		});

		const latestSlot = slots[0];
		if (!latestSlot) {
			throw new NotFoundException("Ban pick slot not found for this session");
		}

		if (
			typeof dto.currentTurn === "number" &&
			latestSlot.turnIndex !== dto.currentTurn
		) {
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
			const characterCostValue = this.toNumber(characterCost.cost);
			if (dto.side === PlayerSide.BLUE) {
				sessionCost.blueConstellationCost += characterCostValue;
				sessionCost.blueTotalCost += characterCostValue;
			} else {
				sessionCost.redConstellationCost += characterCostValue;
				sessionCost.redTotalCost += characterCostValue;
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
			const characterLevelCostValue = this.toNumber(characterLevelCost.cost);
			if (dto.side === PlayerSide.BLUE) {
				sessionCost.blueLevelCost += characterLevelCostValue;
				sessionCost.blueTotalCost += characterLevelCostValue;
			} else {
				sessionCost.redLevelCost += characterLevelCostValue;
				sessionCost.redTotalCost += characterLevelCostValue;
			}
		}

		// Weapon cost
		if (dto.weaponId && dto.weaponRefinement) {
			const weapon = await this.weaponRepo.findOne({
				where: {
					id: dto.weaponId,
					isActive: true,
				},
				select: {
					rarity: true,
				},
			});

			if (!weapon) {
				throw new NotFoundException("Weapon not found");
			}

			const resolvedWeaponRarity = dto.weaponRarity ?? weapon.rarity;
			const weaponCosts = await this.weaponCostRepo.find({
				where: {
					weaponRarity: resolvedWeaponRarity,
					upgradeLevel: LessThanOrEqual(dto.weaponRefinement),
				},
			});

			if (weaponCosts.length > 0) {
				weaponCosts.forEach((cost) => {
					const costValue = this.toNumber(cost.value);
					if (dto.side === PlayerSide.BLUE) {
						if (cost.unit === WeaponCostUnit.SECONDS) {
							sessionCost.blueRefinementCost += costValue;
						} else {
							sessionCost.blueTotalCost += costValue;
						}
					} else {
						if (cost.unit === WeaponCostUnit.SECONDS) {
							sessionCost.redRefinementCost += costValue;
						} else {
							sessionCost.redTotalCost += costValue;
						}
					}
				});
			}
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
			const secPerCost = this.toNumber(costMilestones.secPerCost);
			if (dto.side === PlayerSide.BLUE) {
				sessionCost.blueCostMilestone = costMilestones.id;
				sessionCost.blueTimeBonusCost =
					this.toNumber(currentTotalCost) * secPerCost +
					sessionCost.blueConstellationCost +
					sessionCost.blueRefinementCost +
					sessionCost.blueLevelCost;
			} else {
				sessionCost.redCostMilestone = costMilestones.id;
				sessionCost.redTimeBonusCost =
					this.toNumber(currentTotalCost) * secPerCost +
					sessionCost.redConstellationCost +
					sessionCost.redRefinementCost +
					sessionCost.redLevelCost;
			}
		}

		return await this.sessionCostRepo.save(sessionCost);
	}
}
