import {
	CharacterRepository,
	CharacterWeaponRepository,
	WeaponRepository,
} from "@db/repositories";
import { Injectable } from "@nestjs/common";
import { Transactional } from "typeorm-transactional";
import {
	CreateCharacterWeaponRequest,
	UpdateCharacterWeaponRequest,
} from "./dto";
import {
	CharacterWeaponAlreadyExistsError,
	CharacterWeaponInvalidInputError,
	CharacterWeaponNotFoundError,
} from "./errors";
import { CharacterNotFoundError } from "@modules/admin/character/errors";
import { WeaponNotFoundError } from "@modules/admin/weapon/errors";
import { IsNull } from "typeorm";

@Injectable()
export class CharacterWeaponService {
	constructor(
		private readonly characterWeaponRepo: CharacterWeaponRepository,
		private readonly characterRepo: CharacterRepository,
		private readonly weaponRepo: WeaponRepository,
	) {}

	async listCharacterWeapons() {
		return this.characterWeaponRepo.find({
			relations: {
				character: true,
				weapon: true,
			},
			order: {
				id: "DESC",
			},
		});
	}

	async getCharacterWeapon(id: number) {
		const entity = await this.characterWeaponRepo.findOne({
			where: { id },
			relations: {
				character: true,
				weapon: true,
			},
		});

		if (!entity) {
			throw new CharacterWeaponNotFoundError();
		}

		return entity;
	}

	@Transactional()
	async createCharacterWeapon(dto: CreateCharacterWeaponRequest) {
		const { characterId, weaponId } = await this.resolveReferences(dto);
		await this.ensureUnique(characterId, weaponId);

		const entity = this.characterWeaponRepo.create({
			characterId,
			weaponId,
			constellationCondition: dto.constellationCondition ?? null,
		});
		const saved = await this.characterWeaponRepo.save(entity);
		return this.getCharacterWeapon(saved.id);
	}

	@Transactional()
	async updateCharacterWeapon(id: number, dto: UpdateCharacterWeaponRequest) {
		const existing = await this.characterWeaponRepo.findOneBy({ id });
		if (!existing) {
			throw new CharacterWeaponNotFoundError();
		}

		const { characterId, weaponId } = await this.resolveReferences(dto, {
			defaultCharacterId: existing.characterId,
			defaultWeaponId: existing.weaponId,
		});

		const duplicate = await this.characterWeaponRepo.findOneBy(
			characterId === null
				? { characterId: IsNull(), weaponId }
				: { characterId, weaponId },
		);
		if (duplicate && duplicate.id !== existing.id) {
			throw new CharacterWeaponAlreadyExistsError();
		}

		existing.characterId = characterId;
		existing.weaponId = weaponId;
		existing.constellationCondition = dto.constellationCondition ?? null;

		await this.characterWeaponRepo.save(existing);
		return this.getCharacterWeapon(existing.id);
	}

	@Transactional()
	async deleteCharacterWeapon(id: number) {
		const entity = await this.getCharacterWeapon(id);
		await this.characterWeaponRepo.delete(id);
		return entity;
	}

	private async ensureUnique(characterId: number | null, weaponId: number) {
		const existed = await this.characterWeaponRepo.findOneBy(
			characterId === null
				? { characterId: IsNull(), weaponId }
				: { characterId, weaponId },
		);
		if (existed) {
			throw new CharacterWeaponAlreadyExistsError();
		}
	}

	private async resolveReferences(
		dto: {
			characterId?: number | null;
			characterKey?: string;
			weaponId?: number;
			weaponKey?: string;
		},
		fallback?: {
			defaultCharacterId: number | null;
			defaultWeaponId: number;
		},
	) {
		const characterId = await this.resolveCharacterId(dto, fallback);
		const weaponId = await this.resolveWeaponId(dto, fallback);
		return { characterId, weaponId };
	}

	private async resolveCharacterId(
		dto: {
			characterId?: number | null;
			characterKey?: string;
		},
		fallback?: {
			defaultCharacterId: number | null;
			defaultWeaponId: number;
		},
	): Promise<number | null> {
		if (dto.characterId === null) {
			return null;
		}

		if (typeof dto.characterId === "number") {
			const character = await this.characterRepo.findOneBy({
				id: dto.characterId,
			});
			if (!character) {
				throw new CharacterNotFoundError();
			}
			return character.id;
		}

		if (dto.characterKey) {
			const character = await this.characterRepo.findOneBy({
				key: dto.characterKey,
			});
			if (!character) {
				throw new CharacterNotFoundError();
			}
			return character.id;
		}

		if (fallback) {
			return fallback.defaultCharacterId;
		}

		throw new CharacterWeaponInvalidInputError(
			"characterId (number|null) or characterKey is required",
		);
	}

	private async resolveWeaponId(
		dto: {
			weaponId?: number;
			weaponKey?: string;
		},
		fallback?: {
			defaultCharacterId: number | null;
			defaultWeaponId: number;
		},
	): Promise<number> {
		if (typeof dto.weaponId === "number") {
			const weapon = await this.weaponRepo.findOneBy({ id: dto.weaponId });
			if (!weapon) {
				throw new WeaponNotFoundError();
			}
			return weapon.id;
		}

		if (dto.weaponKey) {
			const weapon = await this.weaponRepo.findOneBy({
				key: dto.weaponKey,
			});
			if (!weapon) {
				throw new WeaponNotFoundError();
			}
			return weapon.id;
		}

		if (fallback) {
			return fallback.defaultWeaponId;
		}

		throw new CharacterWeaponInvalidInputError(
			"weaponId or weaponKey is required",
		);
	}
}
