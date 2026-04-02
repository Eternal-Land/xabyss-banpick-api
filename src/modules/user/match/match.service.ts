import {
	AccountCharacterRepository,
	BanPickSlotRepository,
	MatchRepository,
	MatchSessionRepository,
	MatchStateRepository,
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
import { MatchStateResponse } from "@modules/user/match/dto";
import { GenshinBanpickCls } from "@utils";
import { MatchSessionStatus, MatchStatus, PlayerSide } from "@utils/enums";
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
	WeaponAlreadySelectedForSideError,
	WeaponPickRequiresSelectedCharacterError,
} from "./errors";
import { SocketMatchService } from "@modules/socket/services";
import { SocketEvents } from "@utils/constants";
import { In, Not } from "typeorm";

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
		private readonly matchStateRepo: MatchStateRepository,
		private readonly matchSessionRepo: MatchSessionRepository,
		private readonly banPickSlotRepo: BanPickSlotRepository,
		private readonly accountCharacterRepo: AccountCharacterRepository,
		private readonly weaponRepo: WeaponRepository,
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
		});

		const match = await this.matchRepo.findOne({ where: { id: matchId } });
		if (!match) {
			throw new MatchNotFoundError();
		}
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
		}).map((_, index) => ({
			matchId: match.id,
			createdBy: currentAccountId,
			updatedBy: currentAccountId,
			isDeleted: false,
			totalCostBlue: 0,
			totalCostRed: 0,
			sessionStatus:
				index === 0 && sessions.length === 0
					? MatchSessionStatus.LIVE
					: MatchSessionStatus.PENDING,
		}));

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

	private mapSlotsToMatchState(
		matchState: MatchStateEntity,
		slots: Array<{
			slotType: string;
			matchSide: string;
			characterId: number;
			weaponId: number | null;
		}>,
	) {
		const blueBanChars: string[] = [];
		const blueSelectedChars: string[] = [];
		const blueSelectedWeapons: string[] = [];
		const redBanChars: string[] = [];
		const redSelectedChars: string[] = [];
		const redSelectedWeapons: string[] = [];

		slots.forEach((slot) => {
			const characterId = String(slot.characterId);
			const weaponId = slot.weaponId ? String(slot.weaponId) : "";

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
			} else {
				redSelectedChars.push(characterId);
				redSelectedWeapons.push(weaponId);
			}
		});

		matchState.blueBanChars = blueBanChars;
		matchState.blueSelectedChars = blueSelectedChars;
		matchState.blueSelectedWeapons = blueSelectedWeapons;
		matchState.redBanChars = redBanChars;
		matchState.redSelectedChars = redSelectedChars;
		matchState.redSelectedWeapons = redSelectedWeapons;
	}

	private async syncMatchStateWithCurrentSession(
		match: MatchEntity,
		matchState: MatchStateEntity,
	) {
		const currentSession = await this.getCurrentMatchSession(match, matchState);
		const slots = await this.banPickSlotRepo.find({
			where: {
				matchSessionId: currentSession.id,
				slotStatus: "LOCKED",
			},
			order: { turnIndex: "ASC" },
			select: {
				slotType: true,
				matchSide: true,
				characterId: true,
				weaponId: true,
			},
		});

		this.mapSlotsToMatchState(matchState, slots);
		return await this.matchStateRepo.save(matchState);
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
		return await this.syncMatchStateWithCurrentSession(match, matchState);
	}

	async startMatch(matchId: string) {
		await this.findOne(matchId, { isHost: true, isNotStarted: true });
		await this.matchRepo.update(matchId, { status: MatchStatus.LIVE });
		this.socketMatchService.emitToMatch(matchId, SocketEvents.MATCH_STARTED);
	}

	@Transactional()
	async updateTurn(matchId: string, turn: PlayerSide) {
		const accountId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);

		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}

		const isParticipant = [
			match.hostId,
			match.bluePlayerId,
			match.redPlayerId,
		].includes(accountId);

		if (!isParticipant) {
			throw new ParticipantNotFoundError();
		}

		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		matchState.currentTurn = turn;
		await this.matchStateRepo.save(matchState);

		return await this.saveAndBroadcastMatchState(matchId, match);
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

	private async saveAndBroadcastMatchState(
		matchId: string,
		match: MatchEntity,
	) {
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const savedMatchState = await this.syncMatchStateWithCurrentSession(
			match,
			matchState,
		);
		this.socketMatchService.emitToMatch(
			matchId,
			SocketEvents.UPDATE_MATCH_STATE,
			MatchStateResponse.fromEntity(savedMatchState),
		);
		return savedMatchState;
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

		const selectedAccountCharacter = await this.accountCharacterRepo.findOne({
			where: {
				characterId: charId,
				accountId: playerId,
			},
		});

		if (!selectedAccountCharacter) {
			throw new AccountCharacterNotFoundError();
		}

		await this.ensureCharacterNotUsedInSession(matchSession.id, charId);

		await this.createBanPickSlot(
			matchSession.id,
			playerSide,
			"PICK",
			charId,
			playerId,
		);
		await this.saveAndBroadcastMatchState(matchId, match);
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

		await this.ensureCharacterNotUsedInSession(matchSession.id, charId);

		await this.createBanPickSlot(
			matchSession.id,
			playerSide,
			"BAN",
			charId,
			playerId,
		);
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
		if (!Number.isInteger(normalizedWeaponId) || normalizedWeaponId <= 0) {
			throw new WeaponNotFoundError();
		}

		const normalizedWeaponRefinement = Number(weaponRefinement);
		if (
			!Number.isInteger(normalizedWeaponRefinement) ||
			normalizedWeaponRefinement < 1 ||
			normalizedWeaponRefinement > 5
		) {
			throw new BadRequestException("Invalid weapon refinement");
		}

		const weapon = await this.weaponRepo.findOne({
			where: {
				id: normalizedWeaponId,
				isActive: true,
			},
		});

		if (!weapon) {
			throw new WeaponNotFoundError();
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

		const duplicatedSlot = sidePickSlots.find(
			(slot) =>
				slot.weaponId === normalizedWeaponId && slot.id !== selectedPickSlot.id,
		);
		if (duplicatedSlot) {
			throw new WeaponAlreadySelectedForSideError();
		}

		selectedPickSlot.weaponId = normalizedWeaponId;
		selectedPickSlot.weaponRefinement = normalizedWeaponRefinement;
		selectedPickSlot.weaponSelectedAt = new Date();
		await this.banPickSlotRepo.save(selectedPickSlot);

		await this.saveAndBroadcastMatchState(matchId, match);
	}
}
