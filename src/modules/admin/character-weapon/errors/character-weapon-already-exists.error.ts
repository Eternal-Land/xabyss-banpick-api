import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class CharacterWeaponAlreadyExistsError extends ApiError {
	constructor() {
		super({
			code: ErrorCode.CHARACTER_WEAPON_ALREADY_EXISTS,
			message: "Character weapon association already exists",
			status: 400,
		});
	}
}
