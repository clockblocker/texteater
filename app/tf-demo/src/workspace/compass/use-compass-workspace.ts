import { RegistryContext, useAtomValue } from "@effect/atom-react";
import {
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import type * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { useContext } from "react";

/**
 * The Panes, their Decks and the Held Card, as the battery's reducer keeps
 * them, held in an atom by whoever renders the Compass so it can also
 * persist them and send its own commands (tf-demo ADR 0014).
 */
export type CompassWorkspace<S> = {
	/** What renders. */
	readonly state: WorkspaceState<S>;
	/**
	 * What handlers read: the atom's value in the registry, which `dispatch`
	 * writes at once, so a handler sees its own command's result before the
	 * next render.
	 */
	readonly current: () => WorkspaceState<S>;
	readonly dispatch: (command: WorkspaceCommand<S>) => WorkspaceState<S>;
	/** Start over from `state`. */
	readonly reset: (state: WorkspaceState<S>) => void;
};

type WorkspaceAtom<S> = Atom.Writable<WorkspaceState<S>>;

/** The Compass's reads and writes of `atom`, straight through `registry`. */
export function compassWorkspaceOf<S>(
	registry: AtomRegistry.AtomRegistry,
	atom: WorkspaceAtom<S>,
): Omit<CompassWorkspace<S>, "state"> {
	return {
		current: () => registry.get(atom),
		dispatch: (command) => {
			const next = workspaceReducer(registry.get(atom), command);
			registry.set(atom, next);
			return next;
		},
		reset: (fresh) => registry.set(atom, fresh),
	};
}

/** The workspace in `atom`, rendered from and written through the registry. */
export function useCompassWorkspace<S>(
	atom: WorkspaceAtom<S>,
): CompassWorkspace<S> {
	const registry = useContext(RegistryContext);
	return {
		state: useAtomValue(atom),
		...compassWorkspaceOf(registry, atom),
	};
}
