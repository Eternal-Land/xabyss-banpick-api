import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class SupachaiPickSlotNotFoundError extends ApiError {
	constructor() {
		super({
			code: ErrorCode.VALIDATION_ERROR,
			message: "Selected pick slot for Supachai was not found",
			status: 400,
		});
	}
}
