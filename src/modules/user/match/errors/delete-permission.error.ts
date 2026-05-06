import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class DeletePermissionError extends ApiError {
	constructor() {
		super({
			code: ErrorCode.VALIDATION_ERROR,
			message: "You do not have permission to delete this match",
			status: 403,
		});
	}
}
