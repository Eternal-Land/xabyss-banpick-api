import { ApiProperty } from "@nestjs/swagger";
import { PlayerSide } from "@utils/enums";
import { IsEnum } from "class-validator";

export class UpdateMatchTurnRequest {
	@ApiProperty({
		type: Number,
		example: PlayerSide.BLUE,
		enum: PlayerSide,
	})
	@IsEnum(PlayerSide)
	turn: PlayerSide;
}
