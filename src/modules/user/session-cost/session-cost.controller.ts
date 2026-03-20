import { Body, Controller, Param, ParseIntPipe, Put } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { BaseApiResponse, SwaggerBaseApiResponse } from "@utils";
import { SessionCostRequest, SessionCostResponse } from "./dto";
import { UserSessionCostService } from "./session-cost.service";

@Controller("/user/session-cost")
@ApiBearerAuth()
export class UserSessionCostController {
	constructor(private readonly sessionCostService: UserSessionCostService) {}

	@Put(":matchSessionId/calculate")
	@SwaggerBaseApiResponse(SessionCostResponse)
	async calculate(
		@Param("matchSessionId", ParseIntPipe) matchSessionId: number,
		@Body() dto: SessionCostRequest,
	) {
		const sessionCost = await this.sessionCostService.calculate(
			matchSessionId,
			dto,
		);
		return BaseApiResponse.success(SessionCostResponse.fromEntity(sessionCost));
	}
}
