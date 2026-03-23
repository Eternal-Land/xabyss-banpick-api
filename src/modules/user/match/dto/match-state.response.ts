import { MatchStateEntity } from "@db/entities";
import { PlayerSide } from "@utils/enums";
import { Builder } from "builder-pattern";

export class MatchStateResponse {
	hostJoined: boolean;
	redPlayerJoined: boolean;
	bluePlayerJoined: boolean;
	currentSession: number;
	currentTurn: PlayerSide;
	blueBanChars: string[];
	blueSelectedChars: string[];
	blueSelectedWeapons: string[];
	redBanChars: string[];
	redSelectedChars: string[];
	redSelectedWeapons: string[];
	updatedAt: Date;

	static fromEntity(entity: MatchStateEntity): MatchStateResponse {
		return Builder(MatchStateResponse)
			.hostJoined(entity.hostJoined)
			.redPlayerJoined(entity.redPlayerJoined)
			.bluePlayerJoined(entity.bluePlayerJoined)
			.currentSession(entity.currentSession)
			.currentTurn(entity.currentTurn)
			.blueBanChars(entity.blueBanChars)
			.blueSelectedChars(entity.blueSelectedChars)
			.blueSelectedWeapons(entity.blueSelectedWeapons)
			.redBanChars(entity.redBanChars)
			.redSelectedChars(entity.redSelectedChars)
			.redSelectedWeapons(entity.redSelectedWeapons)
			.updatedAt(entity.updatedAt)
			.build();
	}
}
