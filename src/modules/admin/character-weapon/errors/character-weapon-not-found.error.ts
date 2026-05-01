import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class CharacterWeaponNotFoundError extends ApiError {
	constructor() {
		super({
			code: ErrorCode.CHARACTER_WEAPON_NOT_FOUND,
			message: "Character weapon association not found",
			status: 404,
		});
	}
}
