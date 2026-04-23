import { Module, OnModuleInit } from "@nestjs/common";
import { DbModule } from "@db";
import { MatchController } from "./match.controller";
import { MatchService } from "./match.service";
import { DraftTimerService } from "./draft-timer.service";
import { UserSessionCostModule } from "../session-cost";

@Module({
	imports: [DbModule, UserSessionCostModule],
	controllers: [MatchController],
	providers: [MatchService, DraftTimerService],
	exports: [MatchService, DraftTimerService],
})
export class MatchModule implements OnModuleInit {
	constructor(
		private readonly matchService: MatchService,
		private readonly draftTimerService: DraftTimerService,
	) {}

	onModuleInit() {
		this.draftTimerService.onTurnTimeout = (matchId, expectedDraftStep) =>
			this.matchService.handleTurnTimeout(matchId, expectedDraftStep);
	}
}
