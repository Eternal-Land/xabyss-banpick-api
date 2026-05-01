import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PlayerSide } from "@utils/enums";

export class CompleteSessionRequest {
	@ApiPropertyOptional({ enum: [PlayerSide.BLUE, PlayerSide.RED] })
	@IsOptional()
	@IsEnum(PlayerSide)
	winnerSide?: PlayerSide;
}
