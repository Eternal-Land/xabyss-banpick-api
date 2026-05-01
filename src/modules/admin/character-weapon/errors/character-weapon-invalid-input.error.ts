import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class CharacterWeaponInvalidInputError extends ApiError {
	constructor(message: string) {
		super({
			code: ErrorCode.VALIDATION_ERROR,
			message,
			status: 400,
		});
	}
}
