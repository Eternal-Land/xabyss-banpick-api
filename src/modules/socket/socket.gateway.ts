import {
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WsException,
} from "@nestjs/websockets";
import { SocketMatchService, SocketService } from "./services";
import { Socket, Server as SocketIOServer } from "socket.io";
import {
	UseFilters,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from "@nestjs/common";
import { SocketGuard } from "./socket.guard";
import { SocketEvents } from "@utils/constants";
import { SkipAuth } from "@utils";
import { SocketExceptionFilter } from "./socket.exception-filter";
import { UserSessionRecordService } from "@modules/user/session-record";
import { SaveSessionRecordRequest } from "@modules/user/session-record/dto";
import { UserSessionCostService } from "@modules/user/session-cost";
import { SessionCostRequest } from "@modules/user/session-cost/dto";
import { MatchStateRepository } from "@db/repositories";
import { SessionCostEntity } from "@db/entities";

type SaveMatchTimerInputsPayload = {
	matchId?: string;
	matchSessionId?: number;
	record?: SaveSessionRecordRequest;
};

type UpdateMatchStatePayload = {
	matchId?: string;
	blueSpecialCost?: number;
	redSpecialCost?: number;
	updatedBy?: string;
};

const SESSION_RECORD_FIELDS: Array<keyof SaveSessionRecordRequest> = [
	"blueChamber1",
	"blueChamber2",
	"blueChamber3",
	"blueResetTimes",
	"blueFinalTime",
	"redChamber1",
	"redChamber2",
	"redChamber3",
	"redResetTimes",
	"redFinalTime",
];

@WebSocketGateway()
@UseFilters(SocketExceptionFilter)
@UsePipes(
	new ValidationPipe({ exceptionFactory: (errors) => new WsException(errors) }),
)
@UseGuards(SocketGuard)
export class SocketGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	constructor(
		private readonly socketService: SocketService,
		private readonly socketMatchService: SocketMatchService,
		private readonly userSessionRecordService: UserSessionRecordService,
		private readonly userSessionCostService: UserSessionCostService,
		private readonly matchStateRepository: MatchStateRepository,
	) {}

	// Init the gateway and set the server instance in the service
	afterInit(server: SocketIOServer) {
		this.socketService.server = server;
	}

	async handleConnection(client: Socket) {
		console.log("Client connected:", client.id);
		try {
			await this.socketService.initializeConnection(client);
		} catch (error) {
			const errorMsg =
				error instanceof WsException
					? String(error.getError())
					: error instanceof Error
						? error.message
						: "An unexpected error occurred";
			client.emit(SocketEvents.ERROR, errorMsg);
		}
	}

	async handleDisconnect(client: Socket) {
		console.log("Client disconnected:", client.id);
		try {
			await this.socketMatchService.leaveMatchRoom(client);
		} catch (error) {
			const errorMsg =
				error instanceof WsException
					? String(error.getError())
					: error instanceof Error
						? error.message
						: "An unexpected error occurred";
			client.emit(SocketEvents.ERROR, errorMsg);
		}
	}

	@SubscribeMessage(SocketEvents.JOIN_MATCH_ROOM)
	@SkipAuth()
	async handleJoinMatchRoom(client: Socket, matchId: string) {
		return await this.socketMatchService.joinMatchRoom(client, matchId);
	}

	@SubscribeMessage(SocketEvents.LEAVE_MATCH_ROOM)
	@SkipAuth()
	async handleLeaveMatchRoom(client: Socket, matchId: string) {
		await this.socketMatchService.leaveMatchRoom(client, matchId);
		return { ok: true };
	}

	@SubscribeMessage(SocketEvents.UPDATE_MATCH_TIMER_INPUTS)
	@SkipAuth()
	async handleSyncMatchTimerInputs(
		client: Socket,
		payload: {
			matchId?: string;
			timerInputs?: {
				blue?: {
					chamber1?: string;
					chamber2?: string;
					chamber3?: string;
					reset?: string;
				};
				red?: {
					chamber1?: string;
					chamber2?: string;
					chamber3?: string;
					reset?: string;
				};
			};
			updatedBy?: string;
		},
	) {
		if (!payload?.matchId || !payload?.timerInputs) {
			return { ok: false };
		}

		this.socketMatchService.emitToMatch(
			payload.matchId,
			SocketEvents.UPDATE_MATCH_TIMER_INPUTS,
			{
				timerInputs: payload.timerInputs,
				updatedBy: payload.updatedBy,
			},
		);

		return { ok: true };
	}

	@SubscribeMessage(SocketEvents.UPDATE_MATCH_STATE)
	@SkipAuth()
	async handleUpdateMatchState(
		client: Socket,
		payload: UpdateMatchStatePayload,
	) {
		if (!payload?.matchId) {
			return { ok: false };
		}

		const matchState = await this.matchStateRepository.findOneOrCreate(
			payload.matchId,
		);
		let updated = false;

		const currentSessionId = Number(matchState.currentSession);
		if (!Number.isInteger(currentSessionId) || currentSessionId <= 0) {
			return { ok: false };
		}

		// find or create session cost for current session
		const sessionCost = await this.matchStateRepository.manager
			.getRepository(SessionCostEntity)
			.findOne({
				where: { matchSessionId: currentSessionId },
				order: { id: "DESC" },
			});

		// fallback: use SessionCostRepository via manager if not found
		let currentSessionCost = sessionCost;
		if (!currentSessionCost) {
			currentSessionCost = await this.matchStateRepository.manager
				.getRepository(SessionCostEntity)
				.save({
					matchSessionId: currentSessionId,
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
					blueSpecialCost: 0,
					redSpecialCost: 0,
				});
		}

		if (payload.blueSpecialCost !== undefined) {
			const nextBlueSpecialCost = Number(payload.blueSpecialCost);
			if (Number.isFinite(nextBlueSpecialCost) && nextBlueSpecialCost >= 0) {
				if (
					Number(currentSessionCost.blueSpecialCost) !== nextBlueSpecialCost
				) {
					currentSessionCost.blueSpecialCost = nextBlueSpecialCost;
					updated = true;
				}
			}
		}

		if (payload.redSpecialCost !== undefined) {
			const nextRedSpecialCost = Number(payload.redSpecialCost);
			if (Number.isFinite(nextRedSpecialCost) && nextRedSpecialCost >= 0) {
				if (Number(currentSessionCost.redSpecialCost) !== nextRedSpecialCost) {
					currentSessionCost.redSpecialCost = nextRedSpecialCost;
					updated = true;
				}
			}
		}

		if (!updated) {
			return { ok: true };
		}

		const savedSessionCost = await this.matchStateRepository.manager
			.getRepository(SessionCostEntity)
			.save(currentSessionCost);

		// notify clients to re-fetch session cost for current session
		this.socketMatchService.emitToMatch(
			payload.matchId,
			SocketEvents.UPDATE_MATCH_SESSION,
			{ matchSessionId: currentSessionId },
		);

		void this.userSessionCostService
			.calculate(currentSessionId, {} as SessionCostRequest)
			.catch(() => undefined);

		return { ok: true };
	}

	@SubscribeMessage(SocketEvents.SAVE_MATCH_TIMER_INPUTS)
	async handleSaveMatchTimerInputs(
		client: Socket,
		payload: SaveMatchTimerInputsPayload,
	) {
		const matchSessionId = Number(payload?.matchSessionId);
		if (!Number.isInteger(matchSessionId) || matchSessionId <= 0) {
			throw new WsException("Invalid matchSessionId");
		}

		if (!this.isValidSessionRecord(payload?.record)) {
			throw new WsException("Invalid session record payload");
		}

		const profileId = client.data?.profile?.id;
		if (!profileId) {
			throw new WsException("Unauthorized");
		}

		await this.userSessionRecordService.save(
			matchSessionId,
			payload.record,
			profileId,
		);

		if (payload?.matchId) {
			this.socketMatchService.emitToMatch(
				payload.matchId,
				SocketEvents.SAVE_MATCH_TIMER_INPUTS,
				{
					matchSessionId,
					record: payload.record,
					updatedBy: profileId,
				},
			);
		}

		return { ok: true };
	}

	private isValidSessionRecord(
		record: SaveSessionRecordRequest | undefined,
	): record is SaveSessionRecordRequest {
		if (!record) {
			return false;
		}

		return SESSION_RECORD_FIELDS.every((field) => {
			const value = record[field];
			return Number.isInteger(value) && value >= 0;
		});
	}
}
