import {
	AccountCharacterRepository,
	BanPickSlotRepository,
	CharacterCostRepository,
	CharacterRepository,
	MatchRepository,
	MatchSessionRepository,
	MatchStateRepository,
	SessionRecordRepository,
	WeaponRepository,
} from "@db/repositories";
import {
	MatchEntity,
	MatchSessionEntity,
	MatchStateEntity,
} from "@db/entities";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AccountCharacterNotFoundError } from "@modules/account-character/errors";
import { WeaponNotFoundError } from "@modules/admin/weapon/errors";
import {
	MatchStateCharacterSummaryResponse,
	MatchStateResponse,
} from "@modules/user/match/dto";
import { GenshinBanpickCls } from "@utils";
import {
	MatchSessionStatus,
	MatchStatus,
	MatchType,
	PlayerSide,
} from "@utils/enums";
import { ClsService } from "nestjs-cls";
import { Transactional } from "typeorm-transactional";
import { CreateMatchRequest, MatchQuery } from "./dto";
import {
	MatchAlreadyCompletedError,
	MatchAlreadyStartedError,
	CharacterAlreadyUsedError,
	MatchNotFoundError,
	MatchParticipantMustBeUniqueError,
	NotYourTurnError,
	ParticipantNotFoundError,
	SessionCompletionValidationError,
	SupachaiLimitReachedError,
	WeaponPickRequiresSelectedCharacterError,
	TravellerAlreadyPickedError,
} from "./errors";
import { SupachaiPickSlotNotFoundError } from "./errors/supachai-pick-slot-not-found.error";
import { DraftTimerService } from "./draft-timer.service";
import { SocketMatchService } from "@modules/socket/services";
import { SocketEvents } from "@utils/constants";
import { In, LessThan, Not } from "typeorm";
import { UserSessionCostService } from "../session-cost";

export const TURN_DURATION_SECONDS = 20;
export const TIME_BANK_SECONDS = 120;
export const BO5_SESSION_COUNT = 5;

interface DraftAction {
	side: PlayerSide;
	type: "ban" | "pick";
}

export const DRAFT_SEQUENCE: DraftAction[] = [
	{ side: PlayerSide.BLUE, type: "ban" },
	{ side: PlayerSide.BLUE, type: "ban" },
	{ side: PlayerSide.RED, type: "ban" },
	{ side: PlayerSide.RED, type: "ban" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.RED, type: "ban" },
	{ side: PlayerSide.BLUE, type: "ban" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.BLUE, type: "pick" },
	{ side: PlayerSide.RED, type: "pick" },
];

interface FindOneOptions {
	isHost?: boolean;
	isNotStarted?: boolean;
}

@Injectable()
export class MatchService {
	constructor(
		private readonly matchRepo: MatchRepository,
		private readonly cls: ClsService<GenshinBanpickCls>,
		private readonly socketMatchService: SocketMatchService,
		private readonly userSessionCostService: UserSessionCostService,
		private readonly matchStateRepo: MatchStateRepository,
		private readonly matchSessionRepo: MatchSessionRepository,
		private readonly banPickSlotRepo: BanPickSlotRepository,
		private readonly accountCharacterRepo: AccountCharacterRepository,
		private readonly characterCostRepo: CharacterCostRepository,
		private readonly characterRepo: CharacterRepository,
		private readonly weaponRepo: WeaponRepository,
		private readonly sessionRecordRepo: SessionRecordRepository,
		private readonly draftTimerService: DraftTimerService,
	) {}

	@Transactional()
	async createOne(dto: CreateMatchRequest) {
		if (dto.redPlayerId == dto.bluePlayerId) {
			throw new MatchParticipantMustBeUniqueError();
		}

		const hostId = this.cls.get("profile.id");

		const match = await this.matchRepo.save({
			hostId,
			sessionCount: dto.sessionCount,
			type: dto.type,
			bluePlayerId: dto.bluePlayerId,
			redPlayerId: dto.redPlayerId,
		});

		await this.resetMatchState(match.id);

		return match;
	}

	private async resetMatchState(matchId: string) {
		const existed = await this.matchStateRepo.findOne({
			where: { matchId },
		});

		const match = await this.matchRepo.findOne({ where: { id: matchId } });
		if (!match) {
			throw new MatchNotFoundError();
		}

		const existedSessions = await this.matchSessionRepo.find({
			where: { matchId, isDeleted: false },
			select: { id: true },
		});
		const sessionIds = existedSessions.map((session) => session.id);

		if (existed) {
			await this.matchStateRepo.delete({ matchId });
		}

		if (sessionIds.length) {
			await this.banPickSlotRepo.delete({ matchSessionId: In(sessionIds) });
			await this.matchSessionRepo.delete({ matchId });
		}

		await this.matchStateRepo.insert({
			matchId,
			blueBanChars: [],
			blueSelectedChars: [],
			blueSelectedWeapons: [],
			redBanChars: [],
			redSelectedChars: [],
			redSelectedWeapons: [],
			blueTimeBank: TIME_BANK_SECONDS,
			redTimeBank: TIME_BANK_SECONDS,
			turnStartedAt: null,
			draftStep: 0,
			blueSupachaiUsedCount: 0,
			redSupachaiUsedCount: 0,
			blueSupachaiUsedSessionCount: 0,
			redSupachaiUsedSessionCount: 0,
			blueUsedChars: [],
			redUsedChars: [],
			supachaiMaxUses: this.getSupachaiMaxUses(match.sessionCount),
		});
		const sessions = await this.ensureMatchSessions(match);
		const firstSession = sessions[0];
		if (firstSession) {
			await this.matchStateRepo.update(
				{ matchId },
				{ currentSession: firstSession.id },
			);
		}
	}

	private async ensureMatchSessions(match: MatchEntity) {
		const currentAccountId = this.cls.get("profile.id");

		const sessions = await this.matchSessionRepo.find({
			where: { matchId: match.id, isDeleted: false },
			order: { id: "ASC" },
		});

		if (sessions.length >= match.sessionCount) {
			return sessions;
		}

		const sessionsToCreate = Array.from({
			length: match.sessionCount - sessions.length,
		}).map((_, index) => {
			const absoluteIndex = sessions.length + index;
			return {
				matchId: match.id,
				sessionIndex: absoluteIndex + 1,
				blueParticipantId:
					absoluteIndex % 2 === 0 ? match.bluePlayerId : match.redPlayerId,
				redParticipantId:
					absoluteIndex % 2 === 0 ? match.redPlayerId : match.bluePlayerId,
				createdBy: currentAccountId,
				updatedBy: currentAccountId,
				isDeleted: false,
				totalCostBlue: 0,
				totalCostRed: 0,
				sessionStatus:
					absoluteIndex === 0
						? MatchSessionStatus.LIVE
						: MatchSessionStatus.PENDING,
			};
		});

		await this.matchSessionRepo.save(
			this.matchSessionRepo.create(sessionsToCreate),
		);

		return await this.matchSessionRepo.find({
			where: { matchId: match.id, isDeleted: false },
			order: { id: "ASC" },
		});
	}

	private async getCurrentMatchSession(
		match: MatchEntity,
		matchState: MatchStateEntity,
	): Promise<MatchSessionEntity> {
		const sessions = await this.ensureMatchSessions(match);
		const byId = sessions.find(
			(session) => session.id === matchState.currentSession,
		);
		const currentSession = byId ?? sessions[0];
		if (!currentSession) {
			throw new MatchNotFoundError();
		}

		if (matchState.currentSession !== currentSession.id) {
			matchState.currentSession = currentSession.id;
			await this.matchStateRepo.save(matchState);
		}

		return currentSession;
	}

	private async getUsedCharactersBeforeCurrentSession(
		match: MatchEntity,
		currentSession: MatchSessionEntity,
		matchState: MatchStateEntity,
	) {
		if (
			match.sessionCount === BO5_SESSION_COUNT &&
			currentSession.sessionIndex === BO5_SESSION_COUNT
		) {
			return { blueUsedChars: [], redUsedChars: [] };
		}

		const blueUsedCharacters = new Set(matchState.blueUsedChars ?? []);
		const redUsedCharacters = new Set(matchState.redUsedChars ?? []);

		const previousSessions = await this.matchSessionRepo.find({
			where: {
				matchId: match.id,
				isDeleted: false,
				sessionIndex: LessThan(currentSession.sessionIndex),
			},
			select: { id: true },
		});

		if (!previousSessions.length) {
			return {
				blueUsedChars: [...blueUsedCharacters],
				redUsedChars: [...redUsedCharacters],
			};
		}

		const previousSessionIds = previousSessions.map((session) => session.id);
		const previousSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId: In(previousSessionIds),
				slotType: "PICK",
				slotStatus: "LOCKED",
			},
			select: { characterId: true, matchSide: true },
		});

		previousSlots.forEach((slot) => {
			if (slot.matchSide === "BLUE") {
				blueUsedCharacters.add(String(slot.characterId));
			} else {
				redUsedCharacters.add(String(slot.characterId));
			}
		});

		return {
			blueUsedChars: [...blueUsedCharacters],
			redUsedChars: [...redUsedCharacters],
		};
	}

	private mapSlotsToMatchState(
		matchState: MatchStateEntity,
		slots: Array<{
			slotType: string;
			matchSide: string;
			characterId: number;
			weaponId: number | null;
			weaponRefinement: number | null;
		}>,
	) {
		const blueBanChars: string[] = [];
		const blueSelectedChars: string[] = [];
		const blueSelectedWeapons: string[] = [];
		const blueSelectedWeaponRefinements: number[] = [];
		const redBanChars: string[] = [];
		const redSelectedChars: string[] = [];
		const redSelectedWeapons: string[] = [];
		const redSelectedWeaponRefinements: number[] = [];

		slots.forEach((slot) => {
			const characterId = slot.characterId ? String(slot.characterId) : "";
			const weaponId = slot.weaponId ? String(slot.weaponId) : "";
			const weaponRefinement =
				typeof slot.weaponRefinement === "number" ? slot.weaponRefinement : 0;

			if (slot.slotType === "BAN") {
				if (slot.matchSide === "BLUE") {
					blueBanChars.push(characterId);
				} else {
					redBanChars.push(characterId);
				}
				return;
			}

			if (slot.matchSide === "BLUE") {
				blueSelectedChars.push(characterId);
				blueSelectedWeapons.push(weaponId);
				blueSelectedWeaponRefinements.push(weaponRefinement);
			} else {
				redSelectedChars.push(characterId);
				redSelectedWeapons.push(weaponId);
				redSelectedWeaponRefinements.push(weaponRefinement);
			}
		});

		matchState.blueBanChars = blueBanChars;
		matchState.blueSelectedChars = blueSelectedChars;
		matchState.blueSelectedWeapons = blueSelectedWeapons;
		matchState.redBanChars = redBanChars;
		matchState.redSelectedChars = redSelectedChars;
		matchState.redSelectedWeapons = redSelectedWeapons;

		const matchStateWithRefinements = matchState as MatchStateEntity & {
			blueSelectedWeaponRefinements?: number[];
			redSelectedWeaponRefinements?: number[];
		};

		matchStateWithRefinements.blueSelectedWeaponRefinements =
			blueSelectedWeaponRefinements;
		matchStateWithRefinements.redSelectedWeaponRefinements =
			redSelectedWeaponRefinements;
	}

	private async syncMatchStateWithCurrentSession(
		match: MatchEntity,
		matchState: MatchStateEntity,
	) {
		const expectedSupachaiMaxUses = this.getSupachaiMaxUses(match.sessionCount);
		if (matchState.supachaiMaxUses !== expectedSupachaiMaxUses) {
			matchState.supachaiMaxUses = expectedSupachaiMaxUses;
		}

		const currentSession = await this.getCurrentMatchSession(match, matchState);
		const carriedUsedChars = await this.getUsedCharactersBeforeCurrentSession(
			match,
			currentSession,
			matchState,
		);
		matchState.blueUsedChars = carriedUsedChars.blueUsedChars;
		matchState.redUsedChars = carriedUsedChars.redUsedChars;

		// Fetch ALL slots (LOCKED + SKIPPED) for total draftStep count
		const allSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId: currentSession.id,
				slotStatus: In(["LOCKED", "SKIPPED"]),
			},
			order: { turnIndex: "ASC" },
			select: {
				slotType: true,
				slotStatus: true,
				matchSide: true,
				characterId: true,
				weaponId: true,
				weaponRefinement: true,
			},
		});

		// Include both LOCKED and SKIPPED slots to maintain correct array lengths
		this.mapSlotsToMatchState(matchState, allSlots);

		const draftStep = Math.min(allSlots.length, DRAFT_SEQUENCE.length);
		matchState.draftStep = draftStep;

		const nextAction = DRAFT_SEQUENCE[draftStep];
		if (nextAction && matchState.currentTurn !== nextAction.side) {
			matchState.currentTurn = nextAction.side;
		}

		// Ensure turnStartedAt is set only while the session is actually live.
		if (
			nextAction &&
			!matchState.turnStartedAt &&
			currentSession.sessionStatus === MatchSessionStatus.LIVE
		) {
			matchState.turnStartedAt = new Date();
		}

		return await this.matchStateRepo.save(matchState);
	}

	private getSupachaiMaxUses(sessionCount: number) {
		return sessionCount === BO5_SESSION_COUNT ? 2 : 1;
	}

	async findMany(query: MatchQuery) {
		const statusFilter = { status: Not(MatchStatus.CANCELLED) };
		const where = query.accountId
			? [
					{ ...statusFilter, hostId: query.accountId },
					{ ...statusFilter, redPlayerId: query.accountId },
					{ ...statusFilter, bluePlayerId: query.accountId },
				]
			: statusFilter;

		const [items, total] = await this.matchRepo.findAndCount({
			where,
			relations: {
				host: true,
				redPlayer: true,
				bluePlayer: true,
			},
			order: {
				createdAt: "DESC",
			},
			take: query.take,
			skip: (query.page - 1) * query.take,
		});

		return { items, total };
	}

	async findOne(id: string, options: FindOneOptions = {}) {
		const hostId = this.cls.get("profile.id");
		const match = await this.matchRepo.findOne({
			where: options.isHost ? { id, hostId } : { id },
			relations: {
				host: true,
				redPlayer: true,
				bluePlayer: true,
			},
		});
		if (!match) {
			throw new MatchNotFoundError();
		}
		if (options.isNotStarted && match.status != MatchStatus.WAITING) {
			throw new MatchAlreadyStartedError();
		}

		return match;
	}

	@Transactional()
	async deleteOne(id: string) {
		await this.findOne(id, { isHost: true, isNotStarted: true });
		this.draftTimerService.cancel(id);
		const sessions = await this.matchSessionRepo.find({
			where: { matchId: id, isDeleted: false },
			select: { id: true },
		});
		const sessionIds = sessions.map((session) => session.id);
		await Promise.all([
			this.matchRepo.delete(id),
			this.matchStateRepo.delete({ matchId: id }),
			sessionIds.length
				? this.banPickSlotRepo.delete({ matchSessionId: In(sessionIds) })
				: Promise.resolve(),
			this.matchSessionRepo.delete({ matchId: id }),
		]);
		this.socketMatchService.emitToMatch(id, SocketEvents.MATCH_DELETED);
	}

	async getMatchState(matchId: string) {
		// check exists
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const syncedMatchState = await this.syncMatchStateWithCurrentSession(
			match,
			matchState,
		);
		return await this.buildMatchStateResponse(syncedMatchState);
	}

	async startMatch(matchId: string) {
		await this.findOne(matchId, { isHost: true, isNotStarted: true });
		await this.matchRepo.update(matchId, { status: MatchStatus.LIVE });

		// Initialize timer state on match start
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		matchState.turnStartedAt = new Date();
		matchState.blueTimeBank = TIME_BANK_SECONDS;
		matchState.redTimeBank = TIME_BANK_SECONDS;
		matchState.draftStep = 0;
		await this.matchStateRepo.save(matchState);

		this.socketMatchService.emitToMatch(matchId, SocketEvents.MATCH_STARTED);

		// Schedule the first turn timeout
		await this.draftTimerService.scheduleFromMatchState(matchId);

		return matchState;
	}

	async pauseMatch(matchId: string, hostId: string) {
		const match = await this.findOne(matchId, { isHost: true });
		if (match.status !== MatchStatus.LIVE) {
			throw new BadRequestException("Match is not live");
		}

		await this.draftTimerService.pause(matchId);
		await this.saveAndBroadcastMatchState(matchId, match);
	}

	async resumeMatch(matchId: string, hostId: string) {
		const match = await this.findOne(matchId, { isHost: true });
		if (match.status !== MatchStatus.LIVE) {
			throw new BadRequestException("Match is not live");
		}

		await this.draftTimerService.resume(matchId);
		await this.saveAndBroadcastMatchState(matchId, match);
	}

	@Transactional()
	async undoLastAction(matchId: string, hostId: string) {
		const match = await this.findOne(matchId, { isHost: true });
		if (match.status !== MatchStatus.LIVE) {
			throw new BadRequestException("Match is not live");
		}

		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const currentSession = await this.getCurrentMatchSession(match, matchState);

		const lastSlot = await this.banPickSlotRepo.findOne({
			where: {
				matchSessionId: currentSession.id,
				slotStatus: In(["LOCKED", "SKIPPED"]),
			},
			order: { turnIndex: "DESC" },
		});

		if (!lastSlot) {
			throw new BadRequestException("No actions to undo");
		}

		await this.banPickSlotRepo.delete({ id: lastSlot.id });

		matchState.turnStartedAt = new Date();
		await this.matchStateRepo.save(matchState);

		await this.saveAndBroadcastMatchState(matchId, match);
		await this.draftTimerService.scheduleFromMatchState(matchId);
	}

	private getPlayerSide(match: MatchEntity, playerId: string) {
		if (playerId === match.bluePlayerId) {
			return PlayerSide.BLUE;
		}

		if (playerId === match.redPlayerId) {
			return PlayerSide.RED;
		}

		return null;
	}

	private ensureCorrectTurn(
		matchState: MatchStateEntity,
		playerSide: PlayerSide,
	) {
		if (matchState.currentTurn !== playerSide) {
			throw new NotYourTurnError();
		}
	}

	private async ensureCharacterNotUsedInSession(
		matchSessionId: number,
		characterId: number,
	) {
		const existed = await this.banPickSlotRepo.exists({
			where: {
				matchSessionId,
				characterId,
				slotStatus: "LOCKED",
			},
		});

		if (existed) {
			throw new CharacterAlreadyUsedError();
		}
	}

	private async ensureCharacterNotUsedInPreviousSessions(
		match: MatchEntity,
		currentSession: MatchSessionEntity,
		matchState: MatchStateEntity,
		playerSide: PlayerSide,
		characterId: number,
	) {
		const usedCharacterIds = await this.getUsedCharactersBeforeCurrentSession(
			match,
			currentSession,
			matchState,
		);
		const sideUsedCharacters =
			playerSide === PlayerSide.BLUE
				? usedCharacterIds.blueUsedChars
				: usedCharacterIds.redUsedChars;

		if (sideUsedCharacters.includes(String(characterId))) {
			throw new CharacterAlreadyUsedError();
		}
	}

	@Transactional()
	async continueCurrentSession(matchId: string) {
		const match = await this.findOne(matchId, { isHost: true });
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}

		if (match.status !== MatchStatus.WAITING) {
			throw new BadRequestException("Match is not waiting for continuation");
		}

		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const currentSession = await this.getCurrentMatchSession(match, matchState);

		if (currentSession.sessionStatus !== MatchSessionStatus.PENDING) {
			throw new BadRequestException("Current session is not pending");
		}

		currentSession.sessionStatus = MatchSessionStatus.LIVE;
		await this.matchSessionRepo.save(currentSession);

		matchState.turnStartedAt = new Date();
		await this.matchStateRepo.save(matchState);

		await this.matchRepo.update(matchId, { status: MatchStatus.LIVE });

		const updatedMatch = await this.findOne(matchId);
		await this.saveAndBroadcastMatchState(matchId, updatedMatch);
		this.socketMatchService.emitToMatch(
			matchId,
			SocketEvents.UPDATE_MATCH_SESSION,
			{
				matchId,
				currentSession: currentSession.id,
			},
		);
		this.socketMatchService.emitToMatch(matchId, SocketEvents.MATCH_UPDATED, {
			...updatedMatch,
		});

		await this.draftTimerService.scheduleFromMatchState(matchId);
	}

	private async ensureTravellerNotPickedForSide(
		matchSessionId: number,
		playerSide: PlayerSide,
	) {
		const sideString = playerSide === PlayerSide.BLUE ? "BLUE" : "RED";
		const existingPick = await this.banPickSlotRepo.findOne({
			where: {
				matchSessionId,
				matchSide: sideString,
				slotType: "PICK",
				slotStatus: "LOCKED",
			},
			relations: ["character"],
		});

		if (existingPick?.character) {
			const charKey = existingPick.character.key.toLowerCase();
			if (charKey.startsWith("traveller")) {
				throw new TravellerAlreadyPickedError();
			}
		}
	}

	private async autoBanOtherTravellers(
		matchSessionId: number,
		playerSide: PlayerSide,
		pickedCharId: number,
		matchState: MatchStateEntity,
	) {
		// Find all traveller characters except the one that was picked
		const travellerChars = await this.characterRepo.find({
			where: {
				key: In([
					"traveller",
					"traveller_geo",
					"traveller_anemo",
					"traveller_electro",
					"traveller_dendro",
					"traveller_hydro",
				]),
				isActive: true,
			},
		});

		const otherTravellers = travellerChars.filter((c) => c.id !== pickedCharId);

		if (otherTravellers.length === 0) {
			return;
		}

		const otherTravellerIds = otherTravellers.map((c) => String(c.id));

		// Add to the appropriate ban array in match state
		if (playerSide === PlayerSide.BLUE) {
			const existingBans = new Set(matchState.blueBanChars);
			otherTravellerIds.forEach((id) => existingBans.add(id));
			matchState.blueBanChars = Array.from(existingBans);
		} else {
			const existingBans = new Set(matchState.redBanChars);
			otherTravellerIds.forEach((id) => existingBans.add(id));
			matchState.redBanChars = Array.from(existingBans);
		}

		await this.matchStateRepo.save(matchState);
	}

	private validateSlotAgainstExpectedDraftAction(
		slot: {
			turnIndex: number;
			slotType: string;
			matchSide: string;
			characterId: number;
			weaponId: number | null;
			weaponRefinement: number | null;
		},
		expectedAction: DraftAction,
		expectedTurnIndex: number,
	) {
		const expectedSlotType = expectedAction.type === "ban" ? "BAN" : "PICK";
		const expectedMatchSide =
			expectedAction.side === PlayerSide.BLUE ? "BLUE" : "RED";

		if (slot.turnIndex !== expectedTurnIndex) {
			throw new SessionCompletionValidationError(
				`Draft turn index mismatch at step ${expectedTurnIndex + 1}`,
			);
		}

		if (
			slot.slotType !== expectedSlotType ||
			slot.matchSide !== expectedMatchSide
		) {
			throw new SessionCompletionValidationError(
				`Draft action mismatch at step ${expectedTurnIndex + 1}`,
			);
		}

		if (!Number.isInteger(slot.characterId) || slot.characterId <= 0) {
			throw new SessionCompletionValidationError(
				`Missing character selection at step ${expectedTurnIndex + 1}`,
			);
		}
	}

	private async ensureSessionDataCompleted(
		matchSessionId: number,
		matchType: MatchType,
		winnerSide?: PlayerSide,
	) {
		const allSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId,
				slotStatus: In(["LOCKED", "SKIPPED"]),
			},
			order: { turnIndex: "ASC" },
			select: {
				turnIndex: true,
				slotType: true,
				slotStatus: true,
				matchSide: true,
				characterId: true,
				weaponId: true,
				weaponRefinement: true,
			},
		});

		if (allSlots.length !== DRAFT_SEQUENCE.length) {
			throw new SessionCompletionValidationError(
				"Cannot complete session before ban/pick draft is fully completed",
			);
		}

		allSlots.forEach((slot, index) => {
			const expectedAction = DRAFT_SEQUENCE[index];
			if (!expectedAction) {
				throw new SessionCompletionValidationError(
					"Draft contains unexpected extra action",
				);
			}

			// Skipped slots are valid — they just have no character
			if (slot.slotStatus === "SKIPPED") {
				return;
			}

			this.validateSlotAgainstExpectedDraftAction(slot, expectedAction, index);
		});

		// If winner override is provided by host, skip timer record validation.
		if (winnerSide !== undefined && winnerSide !== null) {
			return;
		}

		const sessionRecord = await this.sessionRecordRepo.findOne({
			where: {
				matchSessionId,
				isDeleted: false,
			},
			select: {
				blueChamber1: true,
				blueChamber2: true,
				blueChamber3: true,
				blueResetTimes: true,
				blueFinalTime: true,
				redChamber1: true,
				redChamber2: true,
				redChamber3: true,
				redResetTimes: true,
				redFinalTime: true,
			},
		});

		if (!sessionRecord) {
			throw new SessionCompletionValidationError(
				"Cannot complete session before timer record is saved",
			);
		}

		if (matchType === MatchType.REALTIME) {
			if (sessionRecord.blueChamber1 <= 0 || sessionRecord.redChamber1 <= 0) {
				throw new SessionCompletionValidationError(
					"Both Blue and Red chamber 1 time must be greater than 0 for realtime match",
				);
			}

			if (
				sessionRecord.blueChamber2 !== 0 ||
				sessionRecord.blueChamber3 !== 0 ||
				sessionRecord.blueResetTimes !== 0
			) {
				throw new SessionCompletionValidationError(
					"Blue chamber 2, chamber 3, and reset times must be 0 for realtime match",
				);
			}

			if (
				sessionRecord.redChamber2 !== 0 ||
				sessionRecord.redChamber3 !== 0 ||
				sessionRecord.redResetTimes !== 0
			) {
				throw new SessionCompletionValidationError(
					"Red chamber 2, chamber 3, and reset times must be 0 for realtime match",
				);
			}

			if (sessionRecord.blueFinalTime !== sessionRecord.blueChamber1) {
				throw new SessionCompletionValidationError(
					"Blue final time must equal chamber 1 time for realtime match",
				);
			}

			if (sessionRecord.redFinalTime !== sessionRecord.redChamber1) {
				throw new SessionCompletionValidationError(
					"Red final time must equal chamber 1 time for realtime match",
				);
			}
			return;
		}

		if (sessionRecord.blueFinalTime <= 0 || sessionRecord.redFinalTime <= 0) {
			throw new SessionCompletionValidationError(
				"Both Blue and Red final time must be greater than 0",
			);
		}

		const expectedBlueFinalTime =
			sessionRecord.blueChamber1 +
			sessionRecord.blueChamber2 +
			sessionRecord.blueChamber3;
		if (sessionRecord.blueFinalTime !== expectedBlueFinalTime) {
			throw new SessionCompletionValidationError(
				"Blue final time must equal the sum of chamber times",
			);
		}

		const expectedRedFinalTime =
			sessionRecord.redChamber1 +
			sessionRecord.redChamber2 +
			sessionRecord.redChamber3;
		if (sessionRecord.redFinalTime !== expectedRedFinalTime) {
			throw new SessionCompletionValidationError(
				"Red final time must equal the sum of chamber times",
			);
		}
	}

	private async saveAndBroadcastMatchState(
		matchId: string,
		match: MatchEntity,
	) {
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const savedMatchState = await this.syncMatchStateWithCurrentSession(
			match,
			matchState,
		);
		const response = await this.buildMatchStateResponse(savedMatchState);
		this.socketMatchService.emitToMatch(
			matchId,
			SocketEvents.UPDATE_MATCH_STATE,
			response,
		);
		return savedMatchState;
	}

	private async buildMatchStateResponse(matchState: MatchStateEntity) {
		const [blueSelectedCharacterSummaries, redSelectedCharacterSummaries] =
			await Promise.all([
				this.buildSideSelectedCharacterSummaries(
					matchState.currentSession,
					"BLUE",
				),
				this.buildSideSelectedCharacterSummaries(
					matchState.currentSession,
					"RED",
				),
			]);

		return MatchStateResponse.fromEntity(matchState, {
			blueSelectedCharacterSummaries,
			redSelectedCharacterSummaries,
		});
	}

	private async buildSideSelectedCharacterSummaries(
		matchSessionId: number,
		side: "BLUE" | "RED",
	) {
		const pickSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId,
				matchSide: side,
				slotType: "PICK",
				slotStatus: "LOCKED",
			},
			order: { teamOrder: "ASC" },
		});

		const characterStateCache = new Map<
			string,
			{
				constellation: number;
				level: number;
				element: number;
				weaponType: number;
			} | null
		>();
		const characterCostCache = new Map<string, number>();
		const summaries: MatchStateCharacterSummaryResponse[] = [];

		for (const slot of pickSlots) {
			if (!slot.characterId || !slot.selectedByAccountId) {
				continue;
			}

			const cacheKey = `${slot.selectedByAccountId}:${slot.characterId}`;
			let characterState = characterStateCache.get(cacheKey);
			if (characterState === undefined) {
				const selectedAccountCharacter =
					await this.accountCharacterRepo.findOne({
						where: {
							accountId: slot.selectedByAccountId,
							characterId: slot.characterId,
						},
						relations: {
							character: true,
						},
					});

				characterState = selectedAccountCharacter
					? {
							constellation: selectedAccountCharacter.activatedConstellation,
							level: selectedAccountCharacter.characterLevel,
							element: selectedAccountCharacter.character.element,
							weaponType: selectedAccountCharacter.character.weaponType,
						}
					: null;
				characterStateCache.set(cacheKey, characterState);
			}

			if (!characterState) {
				continue;
			}

			const costKey = `${slot.characterId}:${characterState.constellation}`;
			let cost = characterCostCache.get(costKey);
			if (cost === undefined) {
				const selectedCharacterCost = await this.characterCostRepo.findOne({
					where: {
						characterId: slot.characterId,
						constellation: characterState.constellation,
					},
					select: { cost: true },
				});
				cost = Number(selectedCharacterCost?.cost ?? 0);
				characterCostCache.set(costKey, cost);
			}

			summaries.push({
				characterId: String(slot.characterId),
				level: characterState.level,
				constellation: characterState.constellation,
				cost,
				element: characterState.element,
				weaponType: characterState.weaponType,
			});
		}

		return summaries;
	}

	private normalizePlayerSide(playerSide: PlayerSide) {
		return playerSide === PlayerSide.BLUE ? "BLUE" : "RED";
	}

	private async createBanPickSlot(
		matchSessionId: number,
		playerSide: PlayerSide,
		slotType: "BAN" | "PICK",
		characterId: number,
		selectedByAccountId: string,
	) {
		const normalizedSide = this.normalizePlayerSide(playerSide);
		const [lastSlot, sideSlotsCount] = await Promise.all([
			this.banPickSlotRepo.findOne({
				where: { matchSessionId },
				order: { turnIndex: "DESC" },
				select: { turnIndex: true },
			}),
			this.banPickSlotRepo.count({
				where: {
					matchSessionId,
					matchSide: normalizedSide,
				},
			}),
		]);

		await this.banPickSlotRepo.insert({
			matchSessionId,
			turnIndex: (lastSlot?.turnIndex ?? -1) + 1,
			teamOrder: sideSlotsCount + 1,
			slotType,
			matchSide: normalizedSide,
			slotStatus: "LOCKED",
			characterId,
			selectedByAccountId,
			lockedAt: new Date(),
		});
	}

	@Transactional()
	async pickChar(matchId: string, charId: number) {
		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const matchSession = await this.getCurrentMatchSession(match, matchState);
		const playerSide = this.getPlayerSide(match, playerId);
		if (playerSide === null) {
			throw new MatchNotFoundError();
		}

		this.ensureCorrectTurn(matchState, playerSide);
		this.deductTimeBank(matchState, playerSide);

		const selectedAccountCharacter = await this.accountCharacterRepo.findOne({
			where: {
				characterId: charId,
				accountId: playerId,
			},
		});

		if (!selectedAccountCharacter) {
			throw new AccountCharacterNotFoundError();
		}

		const character = await this.characterRepo.findOneBy({ id: charId });
		if (character?.key.toLowerCase().startsWith("traveller")) {
			await this.autoBanOtherTravellers(
				matchSession.id,
				playerSide,
				charId,
				matchState,
			);
		}

		await this.ensureCharacterNotUsedInPreviousSessions(
			match,
			matchSession,
			matchState,
			playerSide,
			charId,
		);
		await this.ensureCharacterNotUsedInSession(matchSession.id, charId);

		await this.createBanPickSlot(
			matchSession.id,
			playerSide,
			"PICK",
			charId,
			playerId,
		);

		matchState.draftStep += 1;
		matchState.turnStartedAt = new Date();
		await this.matchStateRepo.save(matchState);

		await this.advanceTurn(matchState);
		await this.saveAndBroadcastMatchState(matchId, match);
		await this.draftTimerService.scheduleFromMatchState(matchId);
	}

	@Transactional()
	async banChar(matchId: string, charId: number) {
		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const matchSession = await this.getCurrentMatchSession(match, matchState);
		const playerSide = this.getPlayerSide(match, playerId);
		if (playerSide === null) {
			throw new MatchNotFoundError();
		}

		this.ensureCorrectTurn(matchState, playerSide);
		this.deductTimeBank(matchState, playerSide);

		// For bans: only check current session (don't carry forward bans from previous sessions).
		// Picks carry forward but bans do not.
		await this.ensureCharacterNotUsedInSession(matchSession.id, charId);

		await this.createBanPickSlot(
			matchSession.id,
			playerSide,
			"BAN",
			charId,
			playerId,
		);

		matchState.draftStep += 1;
		matchState.turnStartedAt = new Date();
		await this.matchStateRepo.save(matchState);

		await this.advanceTurn(matchState);
		await this.saveAndBroadcastMatchState(matchId, match);
		await this.draftTimerService.scheduleFromMatchState(matchId);
	}

	/**
	 * Deduct time from the player's time bank if the turn took longer than TURN_DURATION_SECONDS.
	 * Throws if the bank would go negative (turn was already auto-skipped by the server).
	 */
	private deductTimeBank(matchState: MatchStateEntity, playerSide: PlayerSide) {
		if (!matchState.turnStartedAt) {
			return;
		}

		const elapsedSeconds =
			(Date.now() - matchState.turnStartedAt.getTime()) / 1000;
		const overtime = elapsedSeconds - TURN_DURATION_SECONDS;

		if (overtime <= 0) {
			return;
		}

		const bankKey =
			playerSide === PlayerSide.BLUE ? "blueTimeBank" : "redTimeBank";
		const remaining = matchState[bankKey] - overtime;

		if (remaining < 0) {
			throw new NotYourTurnError();
		}

		matchState[bankKey] = Math.max(0, Math.floor(remaining));
	}

	/**
	 * Create a SKIPPED slot for the current draft step and zero-out the side's bank.
	 */
	private async skipTurnSlot(
		matchState: MatchStateEntity,
		matchSessionId: number,
	) {
		const action = DRAFT_SEQUENCE[matchState.draftStep];
		if (!action) {
			return;
		}

		const normalizedSide = this.normalizePlayerSide(action.side);
		const slotType = action.type === "ban" ? "BAN" : "PICK";

		const [lastSlot, sideSlotsCount] = await Promise.all([
			this.banPickSlotRepo.findOne({
				where: { matchSessionId },
				order: { turnIndex: "DESC" },
				select: { turnIndex: true },
			}),
			this.banPickSlotRepo.count({
				where: {
					matchSessionId,
					matchSide: normalizedSide,
				},
			}),
		]);

		await this.banPickSlotRepo.insert({
			matchSessionId,
			turnIndex: (lastSlot?.turnIndex ?? -1) + 1,
			teamOrder: sideSlotsCount + 1,
			slotType,
			matchSide: normalizedSide,
			slotStatus: "SKIPPED",
			characterId: null,
			selectedByAccountId: null,
			lockedAt: new Date(),
		});

		matchState.draftStep += 1;

		// Zero out the side's bank since it was fully consumed by the timeout
		const bankKey =
			action.side === PlayerSide.BLUE ? "blueTimeBank" : "redTimeBank";
		matchState[bankKey] = 0;
	}

	/**
	 * After a normal action or timeout, update turnStartedAt for the next turn.
	 */
	async advanceTurn(matchState: MatchStateEntity) {
		if (matchState.draftStep < DRAFT_SEQUENCE.length) {
			matchState.turnStartedAt = new Date();
		} else {
			matchState.turnStartedAt = null;
		}

		await this.matchStateRepo.save(matchState);
	}

	/**
	 * Called by DraftTimerService when a turn times out.
	 * Skips the current turn and cascades, then broadcasts.
	 */
	@Transactional()
	async handleTurnTimeout(matchId: string, expectedDraftStep: number) {
		const match = await this.matchRepo.findOne({
			where: { id: matchId },
			relations: { host: true, redPlayer: true, bluePlayer: true },
		});
		if (!match || match.status !== MatchStatus.LIVE) {
			return;
		}

		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);

		// Guard: if the draft already advanced past the expected step, ignore this timeout
		if (matchState.draftStep !== expectedDraftStep) {
			return;
		}

		if (matchState.draftStep >= DRAFT_SEQUENCE.length) {
			return;
		}

		const matchSession = await this.getCurrentMatchSession(match, matchState);

		// Skip only the timed-out turn
		await this.skipTurnSlot(matchState, matchSession.id);

		await this.advanceTurn(matchState);
		await this.saveAndBroadcastMatchState(matchId, match);
	}

	@Transactional()
	async pickWeapon(
		matchId: string,
		charId: number,
		weaponId: string,
		weaponRefinement: number,
	) {
		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const matchSession = await this.getCurrentMatchSession(match, matchState);
		const playerSide = this.getPlayerSide(match, playerId);
		if (playerSide === null) {
			throw new MatchNotFoundError();
		}

		const normalizedWeaponId = Number(weaponId);
		if (!Number.isInteger(normalizedWeaponId)) {
			throw new WeaponNotFoundError();
		}

		const normalizedWeaponRefinement = Number(weaponRefinement);
		if (!Number.isInteger(normalizedWeaponRefinement)) {
			throw new BadRequestException("Invalid weapon refinement");
		}

		const isUnequip = normalizedWeaponId <= 0;
		if (isUnequip) {
			if (normalizedWeaponRefinement !== 0) {
				throw new BadRequestException("Invalid weapon refinement");
			}
		} else if (
			normalizedWeaponRefinement < 1 ||
			normalizedWeaponRefinement > 5
		) {
			throw new BadRequestException("Invalid weapon refinement");
		}

		if (!isUnequip) {
			const weapon = await this.weaponRepo.findOne({
				where: {
					id: normalizedWeaponId,
					isActive: true,
				},
			});

			if (!weapon) {
				throw new WeaponNotFoundError();
			}
		}

		const normalizedSide = this.normalizePlayerSide(playerSide);
		const sidePickSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId: matchSession.id,
				matchSide: normalizedSide,
				slotType: "PICK",
				slotStatus: "LOCKED",
			},
			order: { teamOrder: "ASC" },
		});

		if (!sidePickSlots.length) {
			throw new WeaponPickRequiresSelectedCharacterError();
		}

		const selectedPickSlot = sidePickSlots.find(
			(slot) => slot.characterId === charId,
		);
		if (!selectedPickSlot) {
			throw new AccountCharacterNotFoundError();
		}

		if (isUnequip) {
			selectedPickSlot.weaponId = null;
			selectedPickSlot.weaponRefinement = null;
			selectedPickSlot.weaponSelectedAt = null;
		} else {
			selectedPickSlot.weaponId = normalizedWeaponId;
			selectedPickSlot.weaponRefinement = normalizedWeaponRefinement;
			selectedPickSlot.weaponSelectedAt = new Date();
		}
		await this.banPickSlotRepo.save(selectedPickSlot);

		try {
			await this.userSessionCostService.calculate(matchSession.id, {
				side: playerSide,
			});
		} catch {
			// Keep weapon selection successful even if cost recalculation fails.
		}

		const savedMatchState = await this.saveAndBroadcastMatchState(
			matchId,
			match,
		);
		this.socketMatchService.emitToMatch(
			matchId,
			SocketEvents.UPDATE_MATCH_SESSION,
			{ matchSessionId: savedMatchState.currentSession },
		);
	}

	@Transactional()
	async activateSupachai(
		matchId: string,
		fromCharId: number,
		toCharId: number,
	) {
		if (fromCharId === toCharId) {
			throw new BadRequestException(
				"Supachai requires a different replacement character",
			);
		}

		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}

		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const matchSession = await this.getCurrentMatchSession(match, matchState);
		const playerSide = this.getPlayerSide(match, playerId);
		if (playerSide === null) {
			throw new MatchNotFoundError();
		}

		const allDraftSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId: matchSession.id,
				slotStatus: In(["LOCKED", "SKIPPED"]),
			},
			select: {
				slotStatus: true,
			},
		});

		if (
			allDraftSlots.length !== DRAFT_SEQUENCE.length ||
			allDraftSlots.some((slot) => slot.slotStatus === "SKIPPED")
		) {
			throw new BadRequestException(
				"Supachai can only be used after the ban/pick draft is fully locked",
			);
		}

		const normalizedSide = this.normalizePlayerSide(playerSide);
		const sidePickSlots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId: matchSession.id,
				matchSide: normalizedSide,
				slotType: "PICK",
				slotStatus: "LOCKED",
			},
			order: { teamOrder: "ASC" },
		});

		if (sidePickSlots.length < 8) {
			throw new BadRequestException(
				"Supachai can only be used after all 8 pick slots are locked",
			);
		}

		const supachaiUsedKey =
			playerSide === PlayerSide.BLUE
				? "blueSupachaiUsedCount"
				: "redSupachaiUsedCount";
		const supachaiUsedSessionKey =
			playerSide === PlayerSide.BLUE
				? "blueSupachaiUsedSessionCount"
				: "redSupachaiUsedSessionCount";

		if (matchState[supachaiUsedKey] >= matchState.supachaiMaxUses) {
			throw new SupachaiLimitReachedError();
		}

		if (matchState[supachaiUsedSessionKey] >= 1) {
			throw new BadRequestException(
				"Supachai can only be used once per session",
			);
		}

		const selectedPickSlot = sidePickSlots.find(
			(slot) => slot.characterId === fromCharId,
		);
		if (!selectedPickSlot) {
			throw new SupachaiPickSlotNotFoundError();
		}

		const selectedAccountCharacter = await this.accountCharacterRepo.findOne({
			where: {
				characterId: toCharId,
				accountId: playerId,
			},
		});

		if (!selectedAccountCharacter) {
			throw new AccountCharacterNotFoundError();
		}

		await this.ensureCharacterNotUsedInSession(matchSession.id, toCharId);
		await this.ensureCharacterNotUsedInPreviousSessions(
			match,
			matchSession,
			matchState,
			playerSide,
			toCharId,
		);

		const sideUsedChars =
			playerSide === PlayerSide.BLUE
				? new Set(matchState.blueUsedChars ?? [])
				: new Set(matchState.redUsedChars ?? []);
		sideUsedChars.add(String(selectedPickSlot.characterId));
		sideUsedChars.add(String(toCharId));
		if (playerSide === PlayerSide.BLUE) {
			matchState.blueUsedChars = [...sideUsedChars];
		} else {
			matchState.redUsedChars = [...sideUsedChars];
		}

		selectedPickSlot.characterId = toCharId;
		selectedPickSlot.weaponId = null;
		selectedPickSlot.weaponRefinement = null;
		selectedPickSlot.weaponSelectedAt = null;
		await this.banPickSlotRepo.save(selectedPickSlot);

		matchState[supachaiUsedKey] += 1;
		matchState[supachaiUsedSessionKey] += 1;
		await this.matchStateRepo.save(matchState);

		try {
			await this.userSessionCostService.calculate(matchSession.id, {
				side: playerSide,
			});
		} catch {
			// Keep Supachai swap successful even if cost recalculation fails.
		}

		const savedMatchState = await this.saveAndBroadcastMatchState(
			matchId,
			match,
		);
		this.socketMatchService.emitToMatch(
			matchId,
			SocketEvents.UPDATE_MATCH_SESSION,
			{ matchSessionId: savedMatchState.currentSession },
		);
	}

	@Transactional()
	async completeCurrentSession(matchId: string, winnerSide: PlayerSide) {
		const match = await this.findOne(matchId, { isHost: true });
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}

		this.draftTimerService.cancel(matchId);

		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const currentSession = await this.getCurrentMatchSession(match, matchState);

		await this.ensureSessionDataCompleted(
			currentSession.id,
			match.type,
			winnerSide,
		);

		// Mark current session completed and persist the winner
		currentSession.sessionStatus = MatchSessionStatus.COMPLETED;
		currentSession.winnerSide = winnerSide;
		await this.matchSessionRepo.save(currentSession);

		// Fetch all sessions to determine wins
		const sessions = await this.matchSessionRepo.find({
			where: { matchId, isDeleted: false },
			order: { sessionIndex: "ASC", id: "ASC" },
		});

		let blueWins = 0;
		let redWins = 0;

		const completedSessions = sessions.filter(
			(s) => s.sessionStatus === MatchSessionStatus.COMPLETED,
		);

		for (const session of completedSessions) {
			const sessionWinnerSide = session.winnerSide;

			if (sessionWinnerSide === PlayerSide.BLUE) {
				if (session.blueParticipantId === match.bluePlayerId) {
					blueWins++;
				} else {
					redWins++;
				}
			} else if (sessionWinnerSide === PlayerSide.RED) {
				if (session.redParticipantId === match.redPlayerId) {
					redWins++;
				} else {
					blueWins++;
				}
			}
		}

		const winsRequired = Math.ceil(match.sessionCount / 2);

		if (
			blueWins >= winsRequired ||
			redWins >= winsRequired ||
			completedSessions.length >= match.sessionCount
		) {
			await this.matchRepo.update(matchId, { status: MatchStatus.COMPLETED });
		} else {
			// Find next pending session
			const nextSession = sessions.find(
				(s) => s.sessionStatus === MatchSessionStatus.PENDING,
			);
			if (nextSession) {
				// Re-assign matchState to the next session, but keep the match waiting
				// until the host explicitly continues.
				await this.matchStateRepo.update(
					{ matchId },
					{
						currentSession: nextSession.id,
						currentTurn: PlayerSide.BLUE,
						blueBanChars: [],
						blueSelectedChars: [],
						blueSelectedWeapons: [],
						redBanChars: [],
						redSelectedChars: [],
						redSelectedWeapons: [],
						blueTimeBank: TIME_BANK_SECONDS,
						redTimeBank: TIME_BANK_SECONDS,
						turnStartedAt: null,
						draftStep: 0,
						blueSupachaiUsedCount: matchState.redSupachaiUsedCount,
						redSupachaiUsedCount: matchState.blueSupachaiUsedCount,
						blueSupachaiUsedSessionCount: 0,
						redSupachaiUsedSessionCount: 0,
						blueUsedChars:
							nextSession.sessionIndex === BO5_SESSION_COUNT &&
							match.sessionCount === BO5_SESSION_COUNT
								? []
								: matchState.redUsedChars,
						redUsedChars:
							nextSession.sessionIndex === BO5_SESSION_COUNT &&
							match.sessionCount === BO5_SESSION_COUNT
								? []
								: matchState.blueUsedChars,
					},
				);

				await this.matchRepo.update(matchId, {
					status: MatchStatus.WAITING,
					bluePlayerId: match.redPlayerId,
					redPlayerId: match.bluePlayerId,
				});
			} else {
				// Defensive terminal guard: if there is no pending session left,
				// this match must be treated as finished instead of remaining LIVE.
				await this.matchRepo.update(matchId, {
					status: MatchStatus.COMPLETED,
				});
			}
		}

		const updatedMatch = await this.findOne(matchId);
		await this.saveAndBroadcastMatchState(matchId, updatedMatch);
		this.socketMatchService.emitToMatch(matchId, SocketEvents.MATCH_UPDATED, {
			...updatedMatch,
		});
	}
}
