import { ApiError } from "@errors";
import { ErrorCode } from "@utils/enums";

export class TravellerAlreadyPickedError extends ApiError {
	constructor() {
		super({
			code: ErrorCode.VALIDATION_ERROR,
			message: "Traveller can only be picked once per side",
			status: 400,
		});
	}
}
