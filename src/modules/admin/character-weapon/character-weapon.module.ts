import { Module } from "@nestjs/common";
import { CharacterWeaponController } from "./character-weapon.controller";
import { CharacterWeaponService } from "./character-weapon.service";

@Module({
	controllers: [CharacterWeaponController],
	providers: [CharacterWeaponService],
	exports: [CharacterWeaponService],
})
export class CharacterWeaponModule {}
