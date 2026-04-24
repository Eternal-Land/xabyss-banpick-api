import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class SupachaiLimitReachedError extends ApiError {
	constructor() {
		super({
			code: ErrorCode.VALIDATION_ERROR,
			message: "Supachai usage limit has been reached for this match",
			status: 400,
		});
	}
}
