import {
	findPane,
	isRooted,
	type Presentation,
	type Rung,
	type WorkspaceCommand,
	type WorkspaceState,
} from "./model";

/** A Sheet a Pane should show: its Subject, and the Presentation it was when known. */
export type NavigationSheet<S> = {
	readonly subject: S;
	readonly presentationId?: string;
};

/** One rung of the Ground line a Pane should walk. */
export type NavigationRung<S> =
	| { readonly kind: "Menu" }
	| { readonly kind: "MenuItem"; readonly item: string }
	| { readonly kind: "Sheet"; readonly sheet: NavigationSheet<S> };

/**
 * The Sheet Stack a Rooted Pane should hold: its Ground line, Menu first,
 * then a Menu Item and that item's selections, and the Covers above it,
 * bottom first.
 */
export type NavigationTarget<S> = {
	readonly line: readonly NavigationRung<S>[];
	readonly covers: readonly NavigationSheet<S>[];
};

/**
 * The commands that take a Rooted Pane to `target`, as the reader would get
 * there. The Sheets the Pane shares with it, bottom up, stay with their Decks;
 * everything above them leaves as going back would, top first, so a Cover
 * whose Card is in a live Deck collapses; then the rest of the line is walked
 * and the rest of the Covers are followed as fresh Links, with no Deck.
 *
 * `same` says whether a Presentation already open is the Sheet the target
 * names: by Presentation id when the target came from this Pane's history,
 * by Subject when only its address is known. A Floating Pane, or a target
 * that is no Ground line, gets no commands.
 */
export function planNavigation<S>(
	state: WorkspaceState<S>,
	paneId: string,
	target: NavigationTarget<S>,
	same: (presentation: Presentation<S>, sheet: NavigationSheet<S>) => boolean,
): readonly WorkspaceCommand<S>[] {
	const pane = findPane(state.layout, paneId);
	if (!pane || !isRooted(pane) || !isLine(target.line)) return [];
	const rungs = sharedLength(pane.line, target.line, (rung, want) =>
		rungMatches(rung, want, same),
	);
	const lineKept = rungs === pane.line.length && rungs === target.line.length;
	const covers = lineKept
		? sharedLength(pane.covers, target.covers, (cover, want) =>
				same(cover.presentation, want),
			)
		: 0;

	const commands: WorkspaceCommand<S>[] = [];
	/* down to what is shared, top first */
	for (const cover of pane.covers.slice(covers).reverse())
		commands.push({ type: "GoBack", sheetId: cover.id });
	for (const rung of pane.line.slice(rungs).reverse())
		commands.push({ type: "GoBack", sheetId: rung.id });
	/* then up the rest of the line */
	const kept = pane.line.slice(0, rungs);
	let ground = kept.at(-1)?.kind;
	const rest = target.line.slice(rungs);
	const item = rest[0];
	if (item?.kind === "MenuItem") {
		if (ground !== "Menu") return [];
		commands.push({
			type: "StepUp",
			paneId,
			to: { kind: "MenuItem", item: item.item },
		});
		ground = "MenuItem";
	}
	const walked = rest.flatMap((rung) =>
		rung.kind === "Sheet" ? [rung.sheet.subject] : [],
	);
	if (walked.length) {
		if (ground === "Menu") return [];
		commands.push({
			type: "WalkLine",
			paneId,
			keep: kept.filter((rung) => rung.kind === "Sheet").length,
			to: walked,
		});
	}
	for (const cover of target.covers.slice(covers))
		commands.push({ type: "FollowLink", paneId, subject: cover.subject });
	return commands;
}

/** Menu, then optionally a Menu Item, then only that item's selections. */
function isLine<S>(line: readonly NavigationRung<S>[]): boolean {
	return (
		line.length > 0 &&
		line.every((rung, index) =>
			index === 0
				? rung.kind === "Menu"
				: index === 1
					? rung.kind === "MenuItem"
					: rung.kind === "Sheet",
		)
	);
}

function rungMatches<S>(
	rung: Rung<S>,
	want: NavigationRung<S>,
	same: (presentation: Presentation<S>, sheet: NavigationSheet<S>) => boolean,
): boolean {
	switch (want.kind) {
		case "Menu":
			return rung.kind === "Menu";
		case "MenuItem":
			return rung.kind === "MenuItem" && rung.item === want.item;
		case "Sheet":
			return rung.kind === "Sheet" && same(rung.presentation, want.sheet);
	}
}

/** How many leading members of `a` match `b`'s, in order. */
function sharedLength<A, B>(
	a: readonly A[],
	b: readonly B[],
	match: (a: A, b: B) => boolean,
): number {
	let length = 0;
	for (const [index, member] of a.entries()) {
		const other = b[index];
		if (other === undefined || !match(member, other)) break;
		length += 1;
	}
	return length;
}
