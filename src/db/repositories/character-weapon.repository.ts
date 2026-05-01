import { CharacterWeaponEntity } from "@db/entities";
import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";

@Injectable()
export class CharacterWeaponRepository extends Repository<CharacterWeaponEntity> {
	constructor(datasource: DataSource) {
		super(CharacterWeaponEntity, datasource.createEntityManager());
	}
}
