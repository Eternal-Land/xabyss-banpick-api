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
	blueSelectedWeaponRefinements: number[];
	redBanChars: string[];
	redSelectedChars: string[];
	redSelectedWeapons: string[];
	redSelectedWeaponRefinements: number[];
	blueTimeBank: number;
	redTimeBank: number;
	turnStartedAt: Date | null;
	isPaused: boolean;
	pausedElapsedMs: number | null;
	draftStep: number;
	blueSupachaiUsedCount: number;
	redSupachaiUsedCount: number;
	blueSupachaiUsedSessionCount: number;
	redSupachaiUsedSessionCount: number;
	blueUsedChars: string[];
	redUsedChars: string[];
	supachaiMaxUses: number;
	updatedAt: Date;

	static fromEntity(entity: MatchStateEntity): MatchStateResponse {
		const matchState = entity as MatchStateEntity & {
			blueSelectedWeaponRefinements?: number[];
			redSelectedWeaponRefinements?: number[];
		};

		return Builder(MatchStateResponse)
			.hostJoined(entity.hostJoined)
			.redPlayerJoined(entity.redPlayerJoined)
			.bluePlayerJoined(entity.bluePlayerJoined)
			.currentSession(entity.currentSession)
			.currentTurn(entity.currentTurn)
			.blueBanChars(entity.blueBanChars)
			.blueSelectedChars(entity.blueSelectedChars)
			.blueSelectedWeapons(entity.blueSelectedWeapons)
			.blueSelectedWeaponRefinements(
				matchState.blueSelectedWeaponRefinements ?? [],
			)
			.redBanChars(entity.redBanChars)
			.redSelectedChars(entity.redSelectedChars)
			.redSelectedWeapons(entity.redSelectedWeapons)
			.redSelectedWeaponRefinements(
				matchState.redSelectedWeaponRefinements ?? [],
			)
			.blueTimeBank(entity.blueTimeBank)
			.redTimeBank(entity.redTimeBank)
			.turnStartedAt(entity.turnStartedAt)
			.isPaused(entity.isPaused)
			.pausedElapsedMs(entity.pausedElapsedMs)
			.draftStep(entity.draftStep)
			.blueSupachaiUsedCount(entity.blueSupachaiUsedCount)
			.redSupachaiUsedCount(entity.redSupachaiUsedCount)
			.blueSupachaiUsedSessionCount(entity.blueSupachaiUsedSessionCount)
			.redSupachaiUsedSessionCount(entity.redSupachaiUsedSessionCount)
			.blueUsedChars(entity.blueUsedChars ?? [])
			.redUsedChars(entity.redUsedChars ?? [])
			.supachaiMaxUses(entity.supachaiMaxUses)
			.updatedAt(entity.updatedAt)
			.build();
	}
}
