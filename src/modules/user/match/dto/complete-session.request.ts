import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { PlayerSide } from "@utils/enums";

export class CompleteSessionRequest {
	@ApiProperty({ enum: [PlayerSide.BLUE, PlayerSide.RED] })
	@IsEnum(PlayerSide)
	winnerSide: PlayerSide;
}
