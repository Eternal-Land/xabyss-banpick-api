import {
	AccountCharacterRepository,
	MatchRepository,
	MatchSessionRepository,
	MatchStateRepository,
	WeaponRepository,
} from "@db/repositories";
import { MatchEntity, MatchStateEntity } from "@db/entities";
import { Injectable } from "@nestjs/common";
import { AccountCharacterNotFoundError } from "@modules/account-character/errors";
import { WeaponNotFoundError } from "@modules/admin/weapon/errors";
import { MatchStateResponse } from "@modules/user/match/dto";
import { GenshinBanpickCls } from "@utils";
import { MatchStatus, PlayerSide } from "@utils/enums";
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

		if (existed) {
			await this.matchStateRepo.delete({ matchId });
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
	}

	async findMany(query: MatchQuery) {
		const matchQb = this.matchRepo
			.createQueryBuilder("match")
			.innerJoinAndSelect("match.host", "host");

		if (query.accountId) {
			matchQb
				.innerJoinAndSelect("match.redPlayer", "redPlayer")
				.innerJoinAndSelect("match.bluePlayer", "bluePlayer")
				.andWhere(
					"match.hostId = :accountId OR redPlayer.id = :accountId OR bluePlayer.id = :accountId",
					{
						accountId: query.accountId,
					},
				);
		}

		const [items, total] = await Promise.all([
			matchQb
				.orderBy("match.createdAt", "DESC")
				.take(query.take)
				.skip((query.page - 1) * query.take)
				.getMany(),
			matchQb.getCount(),
		]);

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
		await Promise.all([
			this.matchRepo.delete(id),
			this.matchStateRepo.delete({ matchId: id }),
		]);
		this.socketMatchService.emitToMatch(id, SocketEvents.MATCH_DELETED);
	}

	async getMatchState(matchId: string) {
		// check exists
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		return await this.matchStateRepo.findOneOrCreate(matchId);
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

		return await this.saveAndBroadcastMatchState(matchId, matchState);
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

	private ensureCharacterNotUsed(
		matchState: MatchStateEntity,
		characterName: string,
	) {
		const usedCharacters = new Set<string>([
			...matchState.blueBanChars,
			...matchState.blueSelectedChars,
			...matchState.redBanChars,
			...matchState.redSelectedChars,
		]);

		if (usedCharacters.has(characterName)) {
			throw new CharacterAlreadyUsedError();
		}
	}

	private async saveAndBroadcastMatchState(
		matchId: string,
		matchState: MatchStateEntity,
	) {
		const savedMatchState = await this.matchStateRepo.save(matchState);
		this.socketMatchService.emitToMatch(
			matchId,
			SocketEvents.UPDATE_MATCH_STATE,
			MatchStateResponse.fromEntity(savedMatchState),
		);
		return savedMatchState;
	}

	@Transactional()
	async pickChar(matchId: string, charId: number) {
		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
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

		const selectedCharacterId = String(charId);

		this.ensureCharacterNotUsed(matchState, selectedCharacterId);

		if (playerSide === PlayerSide.BLUE) {
			matchState.blueSelectedChars = [
				...(matchState.blueSelectedChars || []),
				selectedCharacterId,
			];
		} else {
			matchState.redSelectedChars = [
				...(matchState.redSelectedChars || []),
				selectedCharacterId,
			];
		}
		await this.saveAndBroadcastMatchState(matchId, matchState);
	}

	@Transactional()
	async banChar(matchId: string, charId: number) {
		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const playerSide = this.getPlayerSide(match, playerId);
		if (playerSide === null) {
			throw new MatchNotFoundError();
		}

		this.ensureCorrectTurn(matchState, playerSide);

		const selectedCharacterId = String(charId);

		this.ensureCharacterNotUsed(matchState, selectedCharacterId);

		if (playerSide === PlayerSide.BLUE) {
			matchState.blueBanChars = [
				...(matchState.blueBanChars || []),
				selectedCharacterId,
			];
		} else {
			matchState.redBanChars = [
				...(matchState.redBanChars || []),
				selectedCharacterId,
			];
		}
		await this.saveAndBroadcastMatchState(matchId, matchState);
	}

	@Transactional()
	async pickWeapon(matchId: string, charId: number, weaponId: string) {
		const playerId = this.cls.get("profile.id");
		const match = await this.findOne(matchId);
		if ([MatchStatus.COMPLETED, MatchStatus.CANCELLED].includes(match.status)) {
			throw new MatchAlreadyCompletedError();
		}
		const matchState = await this.matchStateRepo.findOneOrCreate(matchId);
		const playerSide = this.getPlayerSide(match, playerId);
		if (playerSide === null) {
			throw new MatchNotFoundError();
		}

		const normalizedWeaponId = Number(weaponId);
		if (!Number.isInteger(normalizedWeaponId) || normalizedWeaponId <= 0) {
			throw new WeaponNotFoundError();
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

		const sideSelectedChars =
			playerSide === PlayerSide.BLUE
				? matchState.blueSelectedChars || []
				: matchState.redSelectedChars || [];
		const sideSelectedWeapons =
			playerSide === PlayerSide.BLUE
				? matchState.blueSelectedWeapons || []
				: matchState.redSelectedWeapons || [];

		if (!sideSelectedChars.length) {
			throw new WeaponPickRequiresSelectedCharacterError();
		}

		const selectedCharKey = String(charId);
		const selectedCharSlotIndex = sideSelectedChars.indexOf(selectedCharKey);
		if (selectedCharSlotIndex < 0) {
			throw new AccountCharacterNotFoundError();
		}

		const weaponKey = String(normalizedWeaponId);
		const duplicatedWeaponIndex = sideSelectedWeapons.indexOf(weaponKey);
		if (
			duplicatedWeaponIndex >= 0 &&
			duplicatedWeaponIndex !== selectedCharSlotIndex
		) {
			throw new WeaponAlreadySelectedForSideError();
		}

		const nextSideSelectedWeapons = [...sideSelectedWeapons];
		nextSideSelectedWeapons[selectedCharSlotIndex] = weaponKey;

		if (playerSide === PlayerSide.BLUE) {
			matchState.blueSelectedWeapons = nextSideSelectedWeapons;
		} else {
			matchState.redSelectedWeapons = nextSideSelectedWeapons;
		}
		await this.saveAndBroadcastMatchState(matchId, matchState);
	}
}
