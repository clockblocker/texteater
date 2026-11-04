import { isRecord } from "common-utils";
import type { NavigationTarget } from "compass";
import type { WorkspaceSubject } from "./workspace-subject";

/**
 * How the browser's history keeps up with the Pane's Sheet Stack (tf-demo
 * ADR 0015). Every entry the workspace writes is one Sheet Stack: the one
 * below it is that stack less its top Sheet, so Back, like ←, takes off the
 * top Sheet. An entry keeps its stack's Sheets, as `sheetIdsOf` names them,
 * and every entry's below it, so the rule reads from the entry the page is
 * on, even after a reload.
 */
export type WorkspaceEntry = {
	/** How many workspace entries lie below this one. */
	readonly index: number;
	readonly presentationIds: readonly string[];
	/** The `presentationIds` of each entry below, bottom first. */
	readonly below: readonly (readonly string[])[];
};

/** What the workspace writes into `history.state`. */
export function historyStateOf(entry: WorkspaceEntry): {
	readonly workspace: WorkspaceEntry;
} {
	return { workspace: entry };
}

/** The workspace's entry in `history.state`, or `null` when it is none of ours. */
export function workspaceEntryOf(state: unknown): WorkspaceEntry | null {
	if (!isRecord(state) || !isRecord(state.workspace)) return null;
	const { index, presentationIds, below } = state.workspace;
	return typeof index === "number" &&
		isIds(presentationIds) &&
		Array.isArray(below) &&
		below.length === index &&
		below.every(isIds)
		? { index, presentationIds, below }
		: null;
}

function isIds(value: unknown): value is readonly string[] {
	return (
		Array.isArray(value) &&
		value.every((member) => typeof member === "string")
	);
}

/**
 * The entries that spell a stack bottom up, one per Sheet: every Sheet above
 * `from`'s stack, or all of them from the Menu up when there is no `from`.
 */
export function entriesUpTo(
	presentationIds: readonly string[],
	from: WorkspaceEntry | null,
): WorkspaceEntry[] {
	const below = from ? [...from.below, from.presentationIds] : [];
	const start = from ? from.presentationIds.length + 1 : 1;
	const entries: WorkspaceEntry[] = [];
	for (let depth = start; depth <= presentationIds.length; depth += 1) {
		const entry = {
			index: below.length,
			presentationIds: presentationIds.slice(0, depth),
			below: [...below],
		};
		entries.push(entry);
		below.push(entry.presentationIds);
	}
	return entries;
}

/**
 * What a committed change does to history, given the entry the page is on
 * and the Sheets the stack holds now:
 *
 * - `stay`: the same Sheets at the same Address;
 * - `replace`: the same Sheets renamed, such as a Resolution Step that is a
 *   Reading now, or a stack the entries below do not lead to;
 * - `push`: Sheets added on top, one entry each, so ← and Back take them
 *   off one at a time;
 * - `go`: back to the nearest entry below whose stack this one starts with,
 *   as ←, × and Close all leave; any Sheets above it are pushed once the
 *   browser lands there (Next, which keeps only the Sections it shares).
 */
export type HistoryMove =
	| { readonly kind: "stay" }
	| { readonly kind: "replace" }
	| { readonly kind: "push"; readonly entries: readonly WorkspaceEntry[] }
	| { readonly kind: "go"; readonly delta: number };

export function historyMove(
	entry: WorkspaceEntry,
	presentationIds: readonly string[],
	addressChanged: boolean,
): HistoryMove {
	const current = entry.presentationIds;
	if (sameIds(current, presentationIds))
		return addressChanged ? { kind: "replace" } : { kind: "stay" };
	if (startsWith(presentationIds, current))
		return { kind: "push", entries: entriesUpTo(presentationIds, entry) };
	for (let index = entry.below.length - 1; index >= 0; index -= 1) {
		const below = entry.below[index];
		if (below && startsWith(presentationIds, below))
			return { kind: "go", delta: index - entry.index };
	}
	return { kind: "replace" };
}

/**
 * The entry Back or Forward landed on, rewritten for the stack the
 * workspace now holds there. Back keeps what lies below it; Forward keeps
 * the entry it left, which it is one or more Sheets above.
 */
export function landedEntry(
	landed: WorkspaceEntry | null,
	left: WorkspaceEntry | null,
	presentationIds: readonly string[],
): WorkspaceEntry {
	const below =
		landed && (!left || landed.index <= left.index)
			? landed.below
			: left
				? [
						...left.below,
						left.presentationIds,
						...(landed?.below.slice(left.index + 1) ?? []),
					]
				: [];
	return { index: below.length, presentationIds, below };
}

/**
 * The target a history entry names, with each Sheet's Presentation id, so
 * Back and Forward match on ids. A Menu rung's id is the rung itself.
 */
export function withPresentationIds(
	target: NavigationTarget<WorkspaceSubject>,
	presentationIds: readonly string[],
): NavigationTarget<WorkspaceSubject> {
	const idAt = (index: number) => presentationIds[index];
	return {
		line: target.line.map((rung, index) => {
			const presentationId = idAt(index);
			return rung.kind === "Sheet" && presentationId !== undefined
				? { kind: "Sheet", sheet: { ...rung.sheet, presentationId } }
				: rung;
		}),
		covers: target.covers.map((cover, index) => {
			const presentationId = idAt(target.line.length + index);
			return presentationId === undefined
				? cover
				: { ...cover, presentationId };
		}),
	};
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && startsWith(a, b);
}

/** Whether `ids` begins with every one of `prefix`. */
function startsWith(ids: readonly string[], prefix: readonly string[]) {
	return (
		prefix.length <= ids.length &&
		prefix.every((id, index) => ids[index] === id)
	);
}
