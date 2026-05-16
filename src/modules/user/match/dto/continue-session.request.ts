import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class ContinueSessionRequest {
	@ApiPropertyOptional({
		description:
			"Participant account id that should draft first as blue in the next session",
	})
	@IsOptional()
	@IsUUID()
	nextBluePlayerId?: string;
}
