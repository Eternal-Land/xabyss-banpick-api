import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { MatchStateRepository } from "@db/repositories";
import { TURN_DURATION_SECONDS, DRAFT_SEQUENCE } from "./match.service";
import { PlayerSide } from "@utils/enums";

@Injectable()
export class DraftTimerService implements OnModuleDestroy {
	private readonly turnTimeouts = new Map<string, NodeJS.Timeout>();

	/**
	 * Callback set by MatchModule during onModuleInit to avoid circular dependency.
	 * Signature: (matchId: string, expectedDraftStep: number) => Promise<void>
	 */
	onTurnTimeout:
		| ((matchId: string, expectedDraftStep: number) => Promise<void>)
		| null = null;

	constructor(private readonly matchStateRepo: MatchStateRepository) {}

	onModuleDestroy() {
		for (const timeout of this.turnTimeouts.values()) {
			clearTimeout(timeout);
		}
		this.turnTimeouts.clear();
	}

	/**
	 * Schedule a turn timeout for the given match.
	 * Reads the current draft step from the match state and calculates the maximum
	 * allowed time (TURN_DURATION + side's remaining bank).
	 */
	async scheduleFromMatchState(matchId: string) {
		this.cancel(matchId);

		const matchState = await this.matchStateRepo.findOne({
			where: { matchId },
		});
		if (!matchState || !matchState.turnStartedAt) {
			return;
		}

		if (matchState.draftStep >= DRAFT_SEQUENCE.length) {
			return;
		}

		const currentAction = DRAFT_SEQUENCE[matchState.draftStep];
		if (!currentAction) {
			return;
		}

		const sideBank =
			currentAction.side === PlayerSide.BLUE
				? matchState.blueTimeBank
				: matchState.redTimeBank;

		const maxTurnMs = (TURN_DURATION_SECONDS + sideBank) * 1000;
		const elapsed = Date.now() - matchState.turnStartedAt.getTime();
		const remainingMs = Math.max(0, maxTurnMs - elapsed);

		const expectedDraftStep = matchState.draftStep;

		const timeout = setTimeout(() => {
			this.turnTimeouts.delete(matchId);
			void this.handleTimeout(matchId, expectedDraftStep);
		}, remainingMs);

		this.turnTimeouts.set(matchId, timeout);
	}

	cancel(matchId: string) {
		const existing = this.turnTimeouts.get(matchId);
		if (existing) {
			clearTimeout(existing);
			this.turnTimeouts.delete(matchId);
		}
	}

	async pause(matchId: string) {
		this.cancel(matchId);
		const matchState = await this.matchStateRepo.findOne({
			where: { matchId },
		});
		if (!matchState || matchState.isPaused || !matchState.turnStartedAt) {
			return;
		}

		const elapsed = Date.now() - matchState.turnStartedAt.getTime();
		matchState.isPaused = true;
		matchState.pausedElapsedMs = elapsed;
		matchState.turnStartedAt = null;
		await this.matchStateRepo.save(matchState);
	}

	async resume(matchId: string) {
		const matchState = await this.matchStateRepo.findOne({
			where: { matchId },
		});
		if (!matchState || !matchState.isPaused) {
			return;
		}

		const elapsed = matchState.pausedElapsedMs ?? 0;
		matchState.isPaused = false;
		matchState.pausedElapsedMs = null;
		matchState.turnStartedAt = new Date(Date.now() - elapsed);
		await this.matchStateRepo.save(matchState);

		await this.scheduleFromMatchState(matchId);
	}

	private async handleTimeout(matchId: string, expectedDraftStep: number) {
		if (!this.onTurnTimeout) {
			return;
		}

		try {
			await this.onTurnTimeout(matchId, expectedDraftStep);
			// Re-schedule for the next turn (if draft continues)
			await this.scheduleFromMatchState(matchId);
		} catch (error) {
			console.error(
				`[DraftTimerService] Error handling turn timeout for match ${matchId}:`,
				error,
			);
		}
	}
}
