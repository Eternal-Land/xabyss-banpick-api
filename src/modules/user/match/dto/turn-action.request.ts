import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional } from "class-validator";

export class TurnActionRequest {
	@ApiPropertyOptional({
		description:
			"Client-side timestamp (ISO-8601) when user confirmed ban/pick",
	})
	@IsOptional()
	@IsISO8601()
	clientActionAt?: string;
}
