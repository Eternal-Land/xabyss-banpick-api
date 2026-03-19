import { MatchEntity } from "@db/entities";
import { MatchRepository, MatchStateRepository } from "@db/repositories";
import { SocketMatchService } from "@modules/socket/services";
import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { CustomCronExpression, SocketEvents } from "@utils/constants";
import { MatchStatus } from "@utils/enums";
import * as dayjs from "dayjs";
import { In, LessThanOrEqual } from "typeorm";

@Injectable()
export class CronService {
	constructor(
		private readonly matchRepository: MatchRepository,
		private readonly matchStateRepository: MatchStateRepository,
		private readonly socketMatchService: SocketMatchService,
	) {}

	@Cron(CustomCronExpression.EVERY_15_MINUTES)
	async handleCleanMatch() {
		const past = dayjs().subtract(15, "minute").toDate();
		const outdatedMatches = await this.matchRepository.find({
			where: {
				status: In([MatchStatus.WAITING, MatchStatus.LIVE]),
				createdAt: LessThanOrEqual(past),
			},
		});
		await Promise.all(
			outdatedMatches.map((match) => this.handleExpireMatch(match)),
		);
	}

	private async handleExpireMatch(match: MatchEntity) {
		let isMatchDeleted = false;
		if (match.status == MatchStatus.WAITING) {
			await Promise.all([
				this.matchRepository.delete(match.id),
				this.matchStateRepository.delete({ matchId: match.id }),
			]);
			isMatchDeleted = true;
		} else if (match.status == MatchStatus.LIVE) {
			const state = await this.matchStateRepository.findOne({
				where: { matchId: match.id },
			});
			if (
				!state.hostJoined &&
				!state.bluePlayerJoined &&
				!state.redPlayerJoined
			) {
				await Promise.all([
					this.matchRepository.update(match.id, {
						status: MatchStatus.CANCELLED,
					}),
					this.matchStateRepository.delete({ matchId: match.id }),
				]);
				isMatchDeleted = true;
			}
		}

		if (isMatchDeleted) {
			this.socketMatchService.emitToMatch(
				match.id,
				SocketEvents.MATCH_DELETED,
				match.id,
			);
		}
	}
}
