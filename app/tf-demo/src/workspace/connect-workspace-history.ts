import { type PaneNode, planNavigation, type WorkspaceState } from "compass";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { locationAtom } from "@/lib/location-atoms";
import { compassWorkspaceOf } from "./compass/use-compass-workspace";
import {
	addressedPane,
	addressOf,
	isSameSheet,
	sheetIdsOf,
	targetOf,
} from "./workspace-address";
import { applicationWorkspaceAtom } from "./workspace-atoms";
import {
	entriesUpTo,
	historyMove,
	historyStateOf,
	landedEntry,
	type WorkspaceEntry,
	withPresentationIds,
	workspaceEntryOf,
} from "./workspace-history";
import type { WorkspaceSubject } from "./workspace-subject";

type Stack = {
	readonly pane: PaneNode<WorkspaceSubject>;
	readonly address: string;
	readonly presentationIds: readonly string[];
};

/**
 * Keeps the browser's history in step with the Pane's Sheet Stack (tf-demo
 * ADR 0015) while the workspace is mounted, and returns the disconnect.
 *
 * On connect the page's entry takes the workspace's Address; an entry that
 * is not the workspace's own, as after a pasted link, becomes one entry per
 * Sheet, so Back takes them off as ← would. After every committed change,
 * never while a Card is in hand, `historyMove` says whether to push,
 * replace or go back. Back and Forward (`popstate`, which `locationAtom`
 * owns) cancel any gesture, then take the workspace to the entry's stack by
 * Presentation id: what Back leaves goes as ← would, and a Sheet Forward
 * brings back is followed afresh, with no Deck.
 */
export function connectWorkspaceHistory(
	registry: AtomRegistry.AtomRegistry,
	cancelGesture: () => void,
): () => void {
	const workspace = compassWorkspaceOf(registry, applicationWorkspaceAtom);
	/** The entry the page is on, as last written. */
	let at: WorkspaceEntry | null = null;
	/** The index a `go` of ours lands on, until it does. */
	let landing: number | null = null;
	/** Back or Forward is moving the workspace; its changes are not commits. */
	let navigating = false;

	function stackOf(state: WorkspaceState<WorkspaceSubject>): Stack | null {
		const pane = addressedPane(state);
		const address = pane && addressOf(pane);
		return pane && address
			? { pane, address, presentationIds: sheetIdsOf(pane) }
			: null;
	}

	function write(stack: Stack, entry: WorkspaceEntry, replace: boolean) {
		registry.set(locationAtom, {
			pathname:
				addressOf(stack.pane, entry.presentationIds.length) ??
				stack.address,
			state: historyStateOf(entry),
			replace,
		});
		at = entry;
	}

	function start() {
		const stack = stackOf(workspace.current());
		if (!stack) return;
		const entry = workspaceEntryOf(window.history.state);
		if (entry) {
			write(
				stack,
				{ ...entry, presentationIds: stack.presentationIds },
				true,
			);
			return;
		}
		entriesUpTo(stack.presentationIds, null).forEach((each, index) => {
			write(stack, each, index === 0);
		});
	}

	function commit(state: WorkspaceState<WorkspaceSubject>) {
		if (navigating || landing !== null || state.held) return;
		const stack = stackOf(state);
		if (!stack) return;
		const entry = workspaceEntryOf(window.history.state);
		if (!entry) {
			start();
			return;
		}
		const move = historyMove(
			entry,
			stack.presentationIds,
			stack.address !== window.location.pathname,
		);
		switch (move.kind) {
			case "stay":
				return;
			case "replace":
				write(
					stack,
					{ ...entry, presentationIds: stack.presentationIds },
					true,
				);
				return;
			case "push":
				for (const each of move.entries) write(stack, each, false);
				return;
			case "go":
				landing = entry.index + move.delta;
				registry.set(locationAtom, { go: move.delta });
				return;
		}
	}

	function popped() {
		const landed = workspaceEntryOf(window.history.state);
		if (landing !== null) {
			const expected = landing;
			landing = null;
			/* our own go: whatever the workspace added since is pushed now */
			if (landed?.index === expected) {
				commit(workspace.current());
				return;
			}
		}
		const target = targetOf(window.location.pathname);
		/* the Playground, or an entry that spells no Sheet Stack */
		if (!target) return;
		const left = at;
		navigating = true;
		try {
			cancelGesture();
			if (workspace.current().held)
				workspace.dispatch({ type: "CancelGesture" });
			const pane = addressedPane(workspace.current());
			const wanted = landed
				? withPresentationIds(target, landed.presentationIds)
				: target;
			if (pane)
				for (const command of planNavigation(
					workspace.current(),
					pane.id,
					wanted,
					isSameSheet,
				))
					workspace.dispatch(command);
		} finally {
			navigating = false;
		}
		const stack = stackOf(workspace.current());
		if (stack)
			write(
				stack,
				landedEntry(landed, left, stack.presentationIds),
				true,
			);
	}

	start();
	const stopCommits = registry.subscribe(applicationWorkspaceAtom, commit);
	/* a popstate is heard while the location atom notifies; it is handled
	   once that is done, and before the browser paints */
	const stopPops = registry.subscribe(locationAtom, (entry) => {
		if (entry.popped) queueMicrotask(popped);
	});
	return () => {
		stopCommits();
		stopPops();
	};
}
