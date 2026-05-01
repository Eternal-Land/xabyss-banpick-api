import { ColumnNames, TableNames } from "@db/db.constants";
import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
} from "typeorm";
import { CharacterEntity } from "./character.entity";
import { WeaponEntity } from "./weapon.entity";

@Entity(TableNames.CharacterWeapon)
export class CharacterWeaponEntity {
	@PrimaryGeneratedColumn("increment", { name: ColumnNames.CharacterWeapon.id })
	id: number;

	@Column({ name: ColumnNames.CharacterWeapon.characterId, nullable: true })
	characterId: number | null;

	@ManyToOne(() => CharacterEntity, (character) => character.weapons, {
		createForeignKeyConstraints: false,
		nullable: true,
	})
	@JoinColumn({ name: ColumnNames.CharacterWeapon.characterId })
	character: CharacterEntity | null;

	@Column({ name: ColumnNames.CharacterWeapon.weaponId })
	weaponId: number;

	@ManyToOne(() => WeaponEntity, (weapon) => weapon.characters, {
		createForeignKeyConstraints: false,
	})
	@JoinColumn({ name: ColumnNames.CharacterWeapon.weaponId })
	weapon: WeaponEntity;

	@Column({
		name: ColumnNames.CharacterWeapon.constellationCondition,
		type: "int",
		nullable: true,
	})
	constellationCondition?: number;
}
