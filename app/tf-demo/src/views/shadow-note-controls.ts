import type { FunctionReturnType } from "convex/server";
import type { api } from "../../convex/_generated/api";

type ShadowCleanupResult = FunctionReturnType<
	typeof api.shadowResolution.cleanupPendingRelation
>;

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

type ShadowControlState = {
	actionError: string | null;
	outcome: string | null;
};

type ShadowControlEvent =
	| { type: "begin" }
	| { type: "settled"; result: ShadowCleanupResult }
	| { type: "failed"; message: string };

/**
 * The cleanup feedback of one Shadow Note. `ShadowNoteView` keys its
 * container by Shadow ID, so a new target starts from fresh state.
 */
export function reduceShadowControls(
	state: ShadowControlState,
	event: ShadowControlEvent,
): ShadowControlState {
	if (event.type === "begin") {
		return { ...state, actionError: null, outcome: null };
	}
	if (event.type === "failed") {
		return { ...state, actionError: event.message, outcome: null };
	}
	return { ...state, ...shadowCleanupFeedback(event.result) };
}
