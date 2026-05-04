import { MatchStateEntity } from "@db/entities";
import { PlayerSide, CharacterElement, WeaponType } from "@utils/enums";
import { ApiProperty } from "@nestjs/swagger";
import { Builder } from "builder-pattern";

export class MatchStateCharacterSummaryResponse {
	@ApiProperty()
	characterId: string;

	@ApiProperty()
	level: number;

	@ApiProperty()
	constellation: number;

	@ApiProperty()
	cost: number;

	@ApiProperty({ enum: CharacterElement })
	element: CharacterElement;

	@ApiProperty({ enum: WeaponType })
	weaponType: WeaponType;
}

export interface MatchStateResponseExtras {
	blueSelectedCharacterSummaries?: MatchStateCharacterSummaryResponse[];
	redSelectedCharacterSummaries?: MatchStateCharacterSummaryResponse[];
}

export class MatchStateResponse {
	@ApiProperty()
	hostJoined: boolean;
	@ApiProperty()
	redPlayerJoined: boolean;
	@ApiProperty()
	bluePlayerJoined: boolean;
	@ApiProperty()
	currentSession: number;
	@ApiProperty({ enum: PlayerSide })
	currentTurn: PlayerSide;
	@ApiProperty({ type: String, isArray: true })
	blueBanChars: string[];
	@ApiProperty({ type: String, isArray: true })
	blueSelectedChars: string[];
	@ApiProperty({ type: String, isArray: true })
	blueSelectedWeapons: string[];
	@ApiProperty({ type: Number, isArray: true })
	blueSelectedWeaponRefinements: number[];
	@ApiProperty({ type: String, isArray: true })
	redBanChars: string[];
	@ApiProperty({ type: String, isArray: true })
	redSelectedChars: string[];
	@ApiProperty({ type: String, isArray: true })
	redSelectedWeapons: string[];
	@ApiProperty({ type: Number, isArray: true })
	redSelectedWeaponRefinements: number[];
	@ApiProperty()
	blueTimeBank: number;
	@ApiProperty()
	redTimeBank: number;
	@ApiProperty({ required: false, nullable: true })
	turnStartedAt: Date | null;
	@ApiProperty()
	isPaused: boolean;
	@ApiProperty({ required: false, nullable: true })
	pausedElapsedMs: number | null;
	@ApiProperty()
	draftStep: number;
	@ApiProperty()
	blueSupachaiUsedCount: number;
	@ApiProperty()
	redSupachaiUsedCount: number;
	@ApiProperty()
	blueSupachaiUsedSessionCount: number;
	@ApiProperty()
	redSupachaiUsedSessionCount: number;
	@ApiProperty({ type: String, isArray: true })
	blueUsedChars: string[];
	@ApiProperty({ type: String, isArray: true })
	redUsedChars: string[];
	@ApiProperty()
	supachaiMaxUses: number;
	@ApiProperty()
	updatedAt: Date;
	@ApiProperty({
		type: MatchStateCharacterSummaryResponse,
		isArray: true,
		required: false,
	})
	blueSelectedCharacterSummaries?: MatchStateCharacterSummaryResponse[];
	@ApiProperty({
		type: MatchStateCharacterSummaryResponse,
		isArray: true,
		required: false,
	})
	redSelectedCharacterSummaries?: MatchStateCharacterSummaryResponse[];

	static fromEntity(
		entity: MatchStateEntity,
		extras: MatchStateResponseExtras = {},
	): MatchStateResponse {
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
			.blueSelectedCharacterSummaries(
				extras.blueSelectedCharacterSummaries ?? [],
			)
			.redSelectedCharacterSummaries(extras.redSelectedCharacterSummaries ?? [])
			.build();
	}
}
