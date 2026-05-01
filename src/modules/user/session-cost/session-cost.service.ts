import { SessionCostEntity } from "@db/entities";
import {
	AccountCharacterRepository,
	BanPickSlotRepository,
	CharacterCostRepository,
	CharacterLevelCostRepository,
	CharacterWeaponRepository,
	CostMilestoneRepository,
	MatchStateRepository,
	MatchSessionRepository,
	SessionCostRepository,
} from "@db/repositories";
import { Injectable, NotFoundException } from "@nestjs/common";
import { PlayerSide } from "@utils/enums";
import { SessionCostRequest } from "./dto";
import { IsNull, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { SocketMatchService } from "@modules/socket/services";
import { SocketEvents } from "@utils/constants";

@Injectable()
export class UserSessionCostService {
	private readonly firstSupachaiBonusSeconds = 30;
	private readonly secondSupachaiBonusSeconds = 45;

	private toNumber(value: unknown): number {
		const numeric = Number(value);
		return Number.isFinite(numeric) ? numeric : 0;
	}

	private getSupachaiFinalTimeBonus(
		supachaiUsedCount: number,
		supachaiUsedInCurrentSessionCount: number,
		supachaiMaxUses: number,
	) {
		if (supachaiUsedInCurrentSessionCount <= 0) {
			return 0;
		}

		if (supachaiMaxUses >= 2 && supachaiUsedCount >= 2) {
			return this.secondSupachaiBonusSeconds;
		}

		return this.firstSupachaiBonusSeconds;
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
		private readonly characterWeaponRepo: CharacterWeaponRepository,
		private readonly costMilestoneRepo: CostMilestoneRepository,
		private readonly sessionCostRepo: SessionCostRepository,
		private readonly characterLevelCostRepo: CharacterLevelCostRepository,
		private readonly socketMatchService: SocketMatchService,
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

		const matchState = await this.matchStateRepo.findOne({
			where: { matchId: matchSession.matchId },
			select: {
				blueSupachaiUsedCount: true,
				redSupachaiUsedCount: true,
				blueSupachaiUsedSessionCount: true,
				redSupachaiUsedSessionCount: true,
				supachaiMaxUses: true,
			},
		});

		const sessionCost = await this.findOrCreateSessionCost(matchSessionId);

		const slots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId,
				slotStatus: "LOCKED",
			},
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

		sessionCost.blueTotalCost = 0;
		sessionCost.blueCostMilestone = 0;
		sessionCost.blueConstellationCost = 0;
		sessionCost.blueRefinementCost = 0;
		sessionCost.blueLevelCost = 0;
		sessionCost.blueTimeBonusCost = 0;
		sessionCost.redTotalCost = 0;
		sessionCost.redCostMilestone = 0;
		sessionCost.redConstellationCost = 0;
		sessionCost.redRefinementCost = 0;
		sessionCost.redLevelCost = 0;
		sessionCost.redTimeBonusCost = 0;

		const characterStateCache = new Map<
			string,
			{ activatedConstellation: number; characterLevel: number } | null
		>();
		const characterCostCache = new Map<string, number>();
		const characterLevelCostCache = new Map<string, number>();
		const characterWeaponSpecificCache = new Map<string, boolean>();
		const characterWeaponGenericCache = new Map<number, boolean>();

		for (const slot of [...slots].reverse()) {
			const slotSide =
				slot.matchSide === "BLUE" ? PlayerSide.BLUE : PlayerSide.RED;

			if (
				slot.slotType === "PICK" &&
				slot.characterId &&
				slot.selectedByAccountId
			) {
				const characterStateKey = `${slot.selectedByAccountId}:${slot.characterId}`;
				let characterState = characterStateCache.get(characterStateKey);
				if (characterState === undefined) {
					const accountCharacter = await this.accountCharacterRepo.findOne({
						where: {
							accountId: slot.selectedByAccountId,
							characterId: slot.characterId,
						},
						select: {
							activatedConstellation: true,
							characterLevel: true,
						},
					});

					characterState = accountCharacter
						? {
								activatedConstellation: accountCharacter.activatedConstellation,
								characterLevel: accountCharacter.characterLevel,
							}
						: null;
					characterStateCache.set(characterStateKey, characterState);
				}

				if (characterState) {
					const characterCostKey = `${slot.characterId}:${characterState.activatedConstellation}`;
					let characterCostValue = characterCostCache.get(characterCostKey);
					if (characterCostValue === undefined) {
						const characterCost = await this.characterCostRepo.findOne({
							where: {
								characterId: slot.characterId,
								constellation: characterState.activatedConstellation,
							},
							select: { cost: true },
						});
						characterCostValue = this.toNumber(characterCost?.cost);
						characterCostCache.set(characterCostKey, characterCostValue);
					}

					if (characterCostValue > 0) {
						if (slotSide === PlayerSide.BLUE) {
							sessionCost.blueConstellationCost += characterCostValue;
							sessionCost.blueTotalCost += characterCostValue;
						} else {
							sessionCost.redConstellationCost += characterCostValue;
							sessionCost.redTotalCost += characterCostValue;
						}
					}

					const levelCostKey = `${slot.characterId}:${characterState.characterLevel}`;
					let characterLevelCostValue =
						characterLevelCostCache.get(levelCostKey);
					if (characterLevelCostValue === undefined) {
						const characterLevelCost =
							await this.characterLevelCostRepo.findOne({
								where: {
									characterId: slot.characterId,
									level: characterState.characterLevel,
								},
								select: { cost: true },
							});
						characterLevelCostValue = this.toNumber(characterLevelCost?.cost);
						characterLevelCostCache.set(levelCostKey, characterLevelCostValue);
					}

					if (characterLevelCostValue > 0) {
						if (slotSide === PlayerSide.BLUE) {
							sessionCost.blueLevelCost += characterLevelCostValue;
						} else {
							sessionCost.redLevelCost += characterLevelCostValue;
						}
					}
				}
			}

			if (
				slot.slotType === "PICK" &&
				slot.weaponId &&
				typeof slot.weaponRefinement === "number" &&
				slot.weaponRefinement > 0
			) {
				const refinementCost = (slot.weaponRefinement - 1) * 5;
				let totalCost = 0.5;
				let totalRefinementCost = refinementCost;

				let hasSpecificCharacterWeapon = false;
				if (slot.characterId && slot.selectedByAccountId) {
					const characterStateKey = `${slot.selectedByAccountId}:${slot.characterId}`;
					let characterState = characterStateCache.get(characterStateKey);
					if (characterState === undefined) {
						const accountCharacter = await this.accountCharacterRepo.findOne({
							where: {
								accountId: slot.selectedByAccountId,
								characterId: slot.characterId,
							},
							select: {
								activatedConstellation: true,
								characterLevel: true,
							},
						});

						characterState = accountCharacter
							? {
									activatedConstellation:
										accountCharacter.activatedConstellation,
									characterLevel: accountCharacter.characterLevel,
								}
							: null;
						characterStateCache.set(characterStateKey, characterState);
					}

					if (characterState) {
						const characterWeaponSpecificKey = `${slot.characterId}:${slot.weaponId}:${characterState.activatedConstellation}`;
						const cachedSpecificCharacterWeapon =
							characterWeaponSpecificCache.get(characterWeaponSpecificKey);

						if (cachedSpecificCharacterWeapon !== undefined) {
							hasSpecificCharacterWeapon = cachedSpecificCharacterWeapon;
						} else {
							const specificCharacterWeapon =
								await this.characterWeaponRepo.findOne({
									where: [
										{
											characterId: slot.characterId,
											weaponId: slot.weaponId,
											constellationCondition: IsNull(),
										},
										{
											characterId: slot.characterId,
											weaponId: slot.weaponId,
											constellationCondition: LessThanOrEqual(
												characterState.activatedConstellation,
											),
										},
									],
									select: { id: true },
								});

							hasSpecificCharacterWeapon = !!specificCharacterWeapon;
							characterWeaponSpecificCache.set(
								characterWeaponSpecificKey,
								hasSpecificCharacterWeapon,
							);
						}
					}
				}

				if (hasSpecificCharacterWeapon) {
					totalCost = 1;
					totalRefinementCost = refinementCost;
				} else {
					const cachedGenericCharacterWeapon = characterWeaponGenericCache.get(
						slot.weaponId,
					);

					let hasGenericCharacterWeapon = false;
					if (cachedGenericCharacterWeapon !== undefined) {
						hasGenericCharacterWeapon = cachedGenericCharacterWeapon;
					} else {
						const genericCharacterWeapon =
							await this.characterWeaponRepo.findOneBy({
								weaponId: slot.weaponId,
								characterId: IsNull(),
								constellationCondition: IsNull(),
							});

						hasGenericCharacterWeapon = !!genericCharacterWeapon;
						characterWeaponGenericCache.set(
							slot.weaponId,
							hasGenericCharacterWeapon,
						);
					}

					totalCost = 0.5;
					totalRefinementCost = hasGenericCharacterWeapon ? 0 : refinementCost;
				}

				if (slotSide === PlayerSide.BLUE) {
					sessionCost.blueTotalCost += totalCost;
					sessionCost.blueRefinementCost += totalRefinementCost;
				} else {
					sessionCost.redTotalCost += totalCost;
					sessionCost.redRefinementCost += totalRefinementCost;
				}
			}
		}

		const blueMilestone = await this.costMilestoneRepo.findOne({
			where: [
				{
					costFrom: LessThanOrEqual(sessionCost.blueTotalCost),
					costTo: MoreThanOrEqual(sessionCost.blueTotalCost),
				},
				{
					costFrom: LessThanOrEqual(sessionCost.blueTotalCost),
					costTo: IsNull(),
				},
			],
			order: { costFrom: "DESC" },
		});
		if (blueMilestone) {
			const secPerCost = this.toNumber(blueMilestone.secPerCost);
			sessionCost.blueCostMilestone = blueMilestone.id;
			sessionCost.blueTimeBonusCost =
				this.toNumber(sessionCost.blueTotalCost) * secPerCost +
				sessionCost.blueRefinementCost +
				sessionCost.blueLevelCost;
		}

		const redMilestone = await this.costMilestoneRepo.findOne({
			where: [
				{
					costFrom: LessThanOrEqual(sessionCost.redTotalCost),
					costTo: MoreThanOrEqual(sessionCost.redTotalCost),
				},
				{
					costFrom: LessThanOrEqual(sessionCost.redTotalCost),
					costTo: IsNull(),
				},
			],
			order: { costFrom: "DESC" },
		});
		if (redMilestone) {
			const secPerCost = this.toNumber(redMilestone.secPerCost);
			sessionCost.redCostMilestone = redMilestone.id;
			sessionCost.redTimeBonusCost =
				this.toNumber(sessionCost.redTotalCost) * secPerCost +
				sessionCost.redRefinementCost +
				sessionCost.redLevelCost;
		}

		const supachaiMaxUses = matchState?.supachaiMaxUses ?? 1;
		sessionCost.blueTimeBonusCost += this.getSupachaiFinalTimeBonus(
			matchState?.blueSupachaiUsedCount ?? 0,
			matchState?.blueSupachaiUsedSessionCount ?? 0,
			supachaiMaxUses,
		);
		sessionCost.redTimeBonusCost += this.getSupachaiFinalTimeBonus(
			matchState?.redSupachaiUsedCount ?? 0,
			matchState?.redSupachaiUsedSessionCount ?? 0,
			supachaiMaxUses,
		);

		const savedSessionCost = await this.sessionCostRepo.save(sessionCost);

		this.socketMatchService.emitToMatch(
			matchSession.matchId,
			SocketEvents.UPDATE_MATCH_SESSION,
			{ matchSessionId },
		);

		return savedSessionCost;
	}
}
