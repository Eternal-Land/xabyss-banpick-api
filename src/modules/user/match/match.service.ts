import {
	AccountCharacterRepository,
	MatchRepository,
	MatchSessionRepository,
	MatchStateRepository,
	WeaponRepository,
} from "@db/repositories";
import { MatchEntity, MatchStateEntity } from "@db/entities";
import { ApiError } from "@errors";
import { Injectable } from "@nestjs/common";
import { AccountCharacterNotFoundError } from "@modules/account-character/errors";
import { WeaponNotFoundError } from "@modules/admin/weapon/errors";
import { MatchStateResponse } from "@modules/user/match/dto";
import { GenshinBanpickCls } from "@utils";
import { ErrorCode, MatchStatus, PlayerSide } from "@utils/enums";
import { ClsService } from "nestjs-cls";
import { Transactional } from "typeorm-transactional";
import { CreateMatchRequest, MatchQuery } from "./dto";
import {
	MatchAlreadyCompletedError,
	MatchAlreadyStartedError,
	MatchNotFoundError,
	MatchParticipantInLiveMatchError,
	MatchParticipantMustBeUniqueError,
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
		await this.ensureParticipantsNotInLiveMatch([
			hostId,
			dto.redPlayerId,
			dto.bluePlayerId,
		]);

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

	private async ensureParticipantsNotInLiveMatch(accountIds: string[]) {
		const uniqueAccountIds = [...new Set(accountIds.filter(Boolean))];
		if (!uniqueAccountIds.length) {
			return;
		}

		const liveMatch = await this.matchRepo
			.createQueryBuilder("match")
			.where("match.status = :status", { status: MatchStatus.LIVE })
			.andWhere(
				"(match.hostId IN (:...accountIds) OR match.redPlayerId IN (:...accountIds) OR match.bluePlayerId IN (:...accountIds))",
				{ accountIds: uniqueAccountIds },
			)
			.getOne();

		if (liveMatch) {
			throw new MatchParticipantInLiveMatchError();
		}
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

	private toggleTurn(matchState: MatchStateEntity) {
		matchState.currentTurn =
			matchState.currentTurn === PlayerSide.BLUE
				? PlayerSide.RED
				: PlayerSide.BLUE;
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
			throw new ApiError({
				code: ErrorCode.VALIDATION_ERROR,
				message: "Character has already been selected or banned",
				status: 400,
			});
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
	async pickChar(matchId: string, charId: string) {
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
				id: charId,
				accountId: playerId,
			},
			relations: {
				character: true,
			},
		});

		if (!selectedAccountCharacter) {
			throw new AccountCharacterNotFoundError();
		}

		const selectedCharacterName = selectedAccountCharacter.character?.name;
		if (!selectedCharacterName) {
			throw new AccountCharacterNotFoundError();
		}

		this.ensureCharacterNotUsed(matchState, selectedCharacterName);

		if (playerSide === PlayerSide.BLUE) {
			matchState.blueSelectedChars = [
				...(matchState.blueSelectedChars || []),
				selectedCharacterName,
			];
		} else {
			matchState.redSelectedChars = [
				...(matchState.redSelectedChars || []),
				selectedCharacterName,
			];
		}

		this.toggleTurn(matchState);
		await this.saveAndBroadcastMatchState(matchId, matchState);
	}

	@Transactional()
	async banChar(matchId: string, charId: string) {
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
				id: charId,
				accountId: playerId,
			},
			relations: {
				character: true,
			},
		});

		if (!selectedAccountCharacter) {
			throw new AccountCharacterNotFoundError();
		}

		const selectedCharacterName = selectedAccountCharacter.character?.name;
		if (!selectedCharacterName) {
			throw new AccountCharacterNotFoundError();
		}

		this.ensureCharacterNotUsed(matchState, selectedCharacterName);

		if (playerSide === PlayerSide.BLUE) {
			matchState.blueBanChars = [
				...(matchState.blueBanChars || []),
				selectedCharacterName,
			];
		} else {
			matchState.redBanChars = [
				...(matchState.redBanChars || []),
				selectedCharacterName,
			];
		}

		this.toggleTurn(matchState);
		await this.saveAndBroadcastMatchState(matchId, matchState);
	}

	@Transactional()
	async pickWeapon(matchId: string, weaponId: string) {
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
			throw new ApiError({
				code: ErrorCode.VALIDATION_ERROR,
				message: "Cannot pick weapon before selecting at least one character",
				status: 400,
			});
		}

		if (sideSelectedWeapons.length >= sideSelectedChars.length) {
			throw new ApiError({
				code: ErrorCode.VALIDATION_ERROR,
				message: "All selected characters already have weapons",
				status: 400,
			});
		}

		const weaponKey = String(normalizedWeaponId);
		if (sideSelectedWeapons.includes(weaponKey)) {
			throw new ApiError({
				code: ErrorCode.VALIDATION_ERROR,
				message: "Weapon has already been selected for this side",
				status: 400,
			});
		}

		if (playerSide === PlayerSide.BLUE) {
			matchState.blueSelectedWeapons = [
				...(matchState.blueSelectedWeapons || []),
				weaponKey,
			];
		} else {
			matchState.redSelectedWeapons = [
				...(matchState.redSelectedWeapons || []),
				weaponKey,
			];
		}

		this.toggleTurn(matchState);
		await this.saveAndBroadcastMatchState(matchId, matchState);
	}
}
