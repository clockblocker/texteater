import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type ShadowCleanupResult = FunctionReturnType<
	typeof api.shadowResolution.cleanupPendingRelation
>;

export function isCurrentShadowAction(
	attempt: number,
	currentEpoch: number,
): boolean {
	return attempt === currentEpoch;
}

export function shadowCleanupFeedback(result: ShadowCleanupResult): {
	actionError: string | null;
	outcome: string | null;
} {
	if (result.status === "applied") {
		return { actionError: null, outcome: result.message };
	}
	return {
		actionError:
			result.status === "conflict"
				? `${result.message} The Shadow Note was refreshed.`
				: result.message,
		outcome: null,
	};
}

export type ShadowControlState = {
	targetShadowId: string;
	actionError: string | null;
	outcome: string | null;
};

export type ShadowControlEvent =
	| { type: "begin" }
	| { type: "settled"; result: ShadowCleanupResult }
	| { type: "failed"; message: string }
	| { type: "targetChanged"; targetShadowId: string }
	| { type: "refreshed"; targetShadowId: string };

export function reduceShadowControls(
	state: ShadowControlState,
	event: ShadowControlEvent,
): ShadowControlState {
	if (event.type === "targetChanged") {
		return event.targetShadowId === state.targetShadowId
			? state
			: {
					targetShadowId: event.targetShadowId,
					actionError: null,
					outcome: null,
				};
	}
	if (event.type === "refreshed") return state;
	if (event.type === "begin") {
		return { ...state, actionError: null, outcome: null };
	}
	if (event.type === "failed") {
		return { ...state, actionError: event.message, outcome: null };
	}
	return { ...state, ...shadowCleanupFeedback(event.result) };
}
