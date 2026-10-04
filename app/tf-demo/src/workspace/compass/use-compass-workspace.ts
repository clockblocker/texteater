import { useRef, useState } from "react";
import {
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "react-resizable-panels/workspace";

/**
 * The Panes, their Decks and the Held Card, as the battery's reducer keeps
 * them, held by whoever renders the Compass so it can also persist them
 * and send its own commands.
 */
export type CompassWorkspace<S> = {
	/** What renders. */
	readonly state: WorkspaceState<S>;
	/**
	 * What handlers read: `dispatch` writes it at once, so a handler sees
	 * its own command's result before the next render.
	 */
	readonly current: () => WorkspaceState<S>;
	readonly dispatch: (command: WorkspaceCommand<S>) => WorkspaceState<S>;
	/** Start over from `state`. */
	readonly reset: (state: WorkspaceState<S>) => void;
};

export function useCompassWorkspace<S>(
	initial: () => WorkspaceState<S>,
): CompassWorkspace<S> {
	const [state, setState] = useState(initial);
	const ref = useRef(state);
	return {
		state,
		current: () => ref.current,
		dispatch: (command) => {
			const next = workspaceReducer(ref.current, command);
			ref.current = next;
			setState(next);
			return next;
		},
		reset: (fresh) => {
			ref.current = fresh;
			setState(fresh);
		},
	};
}
