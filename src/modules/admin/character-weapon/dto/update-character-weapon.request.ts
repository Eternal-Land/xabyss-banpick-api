import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class UpdateCharacterWeaponRequest {
	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsInt()
	characterId?: number | null;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	characterKey?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsInt()
	weaponId?: number;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	weaponKey?: string;

	@ApiProperty({ required: false, nullable: true })
	@IsOptional()
	@IsInt()
	@Min(0)
	constellationCondition?: number | null;
}
