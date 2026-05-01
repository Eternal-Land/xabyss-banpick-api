import { CharacterWeaponEntity } from "@db/entities";
import { ApiProperty } from "@nestjs/swagger";
import { Builder } from "builder-pattern";

export class CharacterWeaponResponse {
	@ApiProperty()
	id: number;

	@ApiProperty({ required: false, nullable: true })
	characterId: number | null;

	@ApiProperty({ required: false })
	characterKey?: string;

	@ApiProperty({ required: false })
	characterName?: string;

	@ApiProperty()
	weaponId: number;

	@ApiProperty()
	weaponKey: string;

	@ApiProperty()
	weaponName: string;

	@ApiProperty({ required: false, nullable: true })
	constellationCondition?: number | null;

	static fromEntity(entity: CharacterWeaponEntity) {
		return Builder(CharacterWeaponResponse)
			.id(entity.id)
			.characterId(entity.characterId)
			.characterKey(entity.character?.key)
			.characterName(entity.character?.name)
			.weaponId(entity.weaponId)
			.weaponKey(entity.weapon?.key || "")
			.weaponName(entity.weapon?.name || "")
			.constellationCondition(entity.constellationCondition ?? null)
			.build();
	}

	static fromEntities(entities: CharacterWeaponEntity[]) {
		return entities.map((entity) => this.fromEntity(entity));
	}
}
