import { CharacterWeaponEntity } from "@db/entities";
import {
	CharacterWeaponRepository,
	CharacterRepository,
	WeaponRepository,
} from "@db/repositories";
import { Injectable, Logger } from "@nestjs/common";
import { IsNull } from "typeorm";
import { Transactional } from "typeorm-transactional";
import { rawCharacterWeapons } from "../raw-data/character-weapons";

@Injectable()
export class CharacterWeaponSeederService {
	private readonly logger = new Logger(CharacterWeaponSeederService.name);
	constructor(
		private readonly characterWeaponRepo: CharacterWeaponRepository,
		private readonly characterRepo: CharacterRepository,
		private readonly weaponRepo: WeaponRepository,
	) {}

	@Transactional()
	async seed() {
		this.logger.log("Seeding character-weapon associations...");

		await Promise.all(
			rawCharacterWeapons.map((charWeapon) =>
				this.seedSingleCharacterWeapon(charWeapon),
			),
		);

		this.logger.log("Character-weapon associations seeded successfully.");
	}

	private async seedSingleCharacterWeapon(
		charWeapon: (typeof rawCharacterWeapons)[0],
	) {
		const characterId = await this.resolveCharacterId(charWeapon);
		if (characterId === undefined) {
			return;
		}

		const weaponId = await this.resolveWeaponId(charWeapon);
		if (weaponId === undefined) {
			return;
		}

		const weapon = await this.weaponRepo.findOneBy({
			id: weaponId,
		});
		if (!weapon) {
			this.logger.error(
				`Weapon for input ${JSON.stringify({ weaponId: charWeapon.weaponId, weaponKey: charWeapon.weaponKey })} not found. Skipping...`,
			);
			return;
		}

		// Check if association already exists
		const existed = await this.characterWeaponRepo.findOneBy(
			characterId === null
				? { characterId: IsNull(), weaponId: weapon.id }
				: { characterId, weaponId: weapon.id },
		);
		if (existed) {
			this.logger.log(
				`Character-weapon association (${characterId ?? "null"} -> ${weapon.id}) already exists. Skipping...`,
			);
			return;
		}

		// Save the association
		await this.characterWeaponRepo.save({
			characterId,
			weaponId: weapon.id,
			constellationCondition: charWeapon.constellationCondition ?? null,
		});
		this.logger.log(
			`Character-weapon association (${characterId ?? "null"} -> ${weapon.id}) seeded successfully.`,
		);
	}

	private async resolveCharacterId(
		charWeapon: (typeof rawCharacterWeapons)[0],
	): Promise<number | null | undefined> {
		if (charWeapon.characterId === null) {
			return null;
		}

		if (typeof charWeapon.characterId === "number") {
			const character = await this.characterRepo.findOneBy({
				id: charWeapon.characterId,
			});
			if (!character) {
				this.logger.error(
					`Character with id ${charWeapon.characterId} not found. Skipping...`,
				);
				return undefined;
			}
			return character.id;
		}

		if (charWeapon.characterKey) {
			const character = await this.characterRepo.findOneBy({
				key: charWeapon.characterKey,
			});
			if (!character) {
				this.logger.error(
					`Character with key "${charWeapon.characterKey}" not found. Skipping...`,
				);
				return undefined;
			}
			return character.id;
		}

		this.logger.error(
			"Character-weapon row must provide characterId (number|null) or characterKey. Skipping...",
		);
		return undefined;
	}

	private async resolveWeaponId(
		charWeapon: (typeof rawCharacterWeapons)[0],
	): Promise<number | undefined> {
		if (typeof charWeapon.weaponId === "number") {
			return charWeapon.weaponId;
		}

		if (charWeapon.weaponKey) {
			const weapon = await this.weaponRepo.findOneBy({
				key: charWeapon.weaponKey,
			});
			if (!weapon) {
				this.logger.error(
					`Weapon with key "${charWeapon.weaponKey}" not found. Skipping...`,
				);
				return undefined;
			}
			return weapon.id;
		}

		this.logger.error(
			"Character-weapon row must provide weaponId or weaponKey. Skipping...",
		);
		return undefined;
	}
}
