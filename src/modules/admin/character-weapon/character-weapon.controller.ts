import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Post,
	Put,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { BaseApiResponse, SwaggerBaseApiResponse } from "@utils";
import { RequirePermission } from "@utils/decorators";
import {
	CharacterWeaponResponse,
	CreateCharacterWeaponRequest,
	UpdateCharacterWeaponRequest,
} from "./dto";
import { CharacterWeaponService } from "./character-weapon.service";

@Controller("/admin/character-weapons")
@ApiBearerAuth()
export class CharacterWeaponController {
	constructor(
		private readonly characterWeaponService: CharacterWeaponService,
	) {}

	@Get()
	@RequirePermission("admin.character-weapon.list")
	@SwaggerBaseApiResponse(CharacterWeaponResponse, { isArray: true })
	async listCharacterWeapons() {
		const entities = await this.characterWeaponService.listCharacterWeapons();
		return BaseApiResponse.success(
			CharacterWeaponResponse.fromEntities(entities),
		);
	}

	@Get(":id")
	@RequirePermission("admin.character-weapon.detail")
	@SwaggerBaseApiResponse(CharacterWeaponResponse)
	async getCharacterWeapon(@Param("id", ParseIntPipe) id: number) {
		const entity = await this.characterWeaponService.getCharacterWeapon(id);
		return BaseApiResponse.success(CharacterWeaponResponse.fromEntity(entity));
	}

	@Post()
	@RequirePermission("admin.character-weapon.create")
	@SwaggerBaseApiResponse(CharacterWeaponResponse)
	async createCharacterWeapon(@Body() dto: CreateCharacterWeaponRequest) {
		const entity = await this.characterWeaponService.createCharacterWeapon(dto);
		return BaseApiResponse.success(CharacterWeaponResponse.fromEntity(entity));
	}

	@Put(":id")
	@RequirePermission("admin.character-weapon.update")
	@SwaggerBaseApiResponse(CharacterWeaponResponse)
	async updateCharacterWeapon(
		@Param("id", ParseIntPipe) id: number,
		@Body() dto: UpdateCharacterWeaponRequest,
	) {
		const entity = await this.characterWeaponService.updateCharacterWeapon(
			id,
			dto,
		);
		return BaseApiResponse.success(CharacterWeaponResponse.fromEntity(entity));
	}

	@Delete(":id")
	@RequirePermission("admin.character-weapon.delete")
	@SwaggerBaseApiResponse(CharacterWeaponResponse)
	async deleteCharacterWeapon(@Param("id", ParseIntPipe) id: number) {
		const entity = await this.characterWeaponService.deleteCharacterWeapon(id);
		return BaseApiResponse.success(CharacterWeaponResponse.fromEntity(entity));
	}
}
