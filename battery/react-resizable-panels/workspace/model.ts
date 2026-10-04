/**
 * The Pane algebra: Panes with a Ground beneath their Covers, the Decks their
 * Sheets deal, and the Held Card of a Lift (tf-demo ADR 0008).
 *
 * It is pure and generic over the Subject, which it never inspects. Every id
 * is a string minted from the state's own counter, and the state holds no
 * functions or DOM, so it survives serialisation. Renderers, gestures, and
 * motion stay with the application.
 */

/** The axis a split lays its two children along; only side-by-side is made for now. */
export type SplitDirection = "horizontal" | "vertical";

/**
 * A Pane's side edge, in the writing direction: a Held Card dropped there
 * spawns a Floating Pane beside it. The renderer maps it to a physical side.
 */
export type Edge = "inline-start" | "inline-end";

/**
 * One workspace instance of a Subject. Every Open mints a fresh one, so more
 * than one may show the same Subject.
 */
export type Presentation<S> = {
	readonly id: string;
	readonly subject: S;
	/** The caller's stable key for a dealt Card; `ReconcileDeck` matches on it. */
	readonly key?: string;
};

/** The ordered Cards dealt from one Sheet. */
export type Deck<S> = {
	readonly id: string;
	/** The caller's key for the selection that dealt it, such as the clicked Segment. */
	readonly selection: string;
	/**
	 * Every Card dealt, in rank. A Card keeps its rank in whatever form it
	 * takes: opening it as a Sheet does not move it, and collapsing brings it
	 * back to the same slot.
	 */
	readonly cards: readonly Presentation<S>[];
	/** The Card in front; `null` puts the first resting Card there. */
	readonly frontId: string | null;
};

/** One rung of a Ground line. */
export type Rung<S> = { readonly id: string; readonly deck: Deck<S> | null } & (
	| { readonly kind: "Menu" }
	| { readonly kind: "MenuItem"; readonly item: string }
	| { readonly kind: "Sheet"; readonly presentation: Presentation<S> }
);

export type Cover<S> = {
	readonly id: string;
	readonly presentation: Presentation<S>;
	readonly deck: Deck<S> | null;
};

export type PaneNode<S> = {
	readonly kind: "Pane";
	readonly id: string;
	/** The Ground line, bottom rung first; its last rung is the Ground. */
	readonly line: readonly Rung<S>[];
	/** The Sheets above the Ground, bottom first. */
	readonly covers: readonly Cover<S>[];
};

export type SplitNode<S> = {
	readonly kind: "Split";
	readonly id: string;
	readonly direction: SplitDirection;
	readonly children: readonly [LayoutNode<S>, LayoutNode<S>];
	/** The child this split was made for, and the size it opened at. */
	readonly fresh?: {
		readonly paneId: string;
		readonly size: number | string;
	};
};

export type LayoutNode<S> = PaneNode<S> | SplitNode<S>;

/** Where a Held Card was lifted from, which decides where letting it go sends it. */
export type LiftOrigin =
	| {
			readonly kind: "Deck";
			readonly paneId: string;
			readonly sheetId: string;
	  }
	| {
			readonly kind:
				| "Cover"
				| "FloatingGround"
				| "RootedGround"
				| "Fresh";
			readonly paneId: string;
	  };

/**
 * What a Release does to the Held Card: rest in its slot in a live Deck,
 * restore the Rooted Ground it was lifted from, close (a Sheet with no live
 * slot), or vanish (a fresh Card from nowhere).
 */
export type HeldHome = "slot" | "restore" | "close" | "vanish";

export type WorkspaceSnapshot<S> = {
	readonly layout: LayoutNode<S>;
	readonly activePaneId: string;
	/** The next number to mint an id from. */
	readonly nextId: number;
};

export type HeldCard<S> = {
	readonly presentation: Presentation<S>;
	readonly origin: LiftOrigin;
	/** The workspace as it was when the Lift began; Cancel gesture restores it. */
	readonly checkpoint: WorkspaceSnapshot<S>;
};

export type WorkspaceState<S> = WorkspaceSnapshot<S> & {
	readonly held: HeldCard<S> | null;
};

export type DealtCard<S> = { readonly subject: S; readonly key?: string };

export type WorkspaceCommand<S> =
	/** Walk the Ground line up: the Menu to a Menu Item, or a Menu Item to its selection. */
	| {
			readonly type: "StepUp";
			readonly paneId: string;
			readonly to:
				| { readonly kind: "MenuItem"; readonly item: string }
				| { readonly kind: "Sheet"; readonly subject: S };
	  }
	/** ← on the top Sheet: a Cover collapses or closes; a Rooted Ground steps one rung down. */
	| { readonly type: "GoBack"; readonly sheetId: string }
	/** Spawn an empty Rooted Pane, at its Menu, beside a Pane. */
	| {
			readonly type: "SpawnRootedPane";
			readonly paneId: string;
			readonly edge: Edge;
	  }
	/** A selection in the top Sheet deals it a Deck, replacing any it held. */
	| {
			readonly type: "Deal";
			readonly sheetId: string;
			readonly selection: string;
			readonly cards: readonly DealtCard<S>[];
	  }
	/**
	 * Rewrite a live Deck's Cards by key as a Resolution progresses: kept
	 * keys keep their Presentation and slot, new keys are appended in order.
	 */
	| {
			readonly type: "ReconcileDeck";
			readonly deckId: string;
			readonly cards: readonly (DealtCard<S> & {
				readonly key: string;
			})[];
	  }
	| {
			readonly type: "BringToFront";
			readonly sheetId: string;
			readonly presentationId: string;
	  }
	/** End the Deck of a Sheet that is on top of its Pane. */
	| { readonly type: "Sweep"; readonly sheetId: string }
	/** Push a fresh Presentation as a Cover. Go to source is a Link like any other. */
	| {
			readonly type: "FollowLink";
			readonly paneId: string;
			readonly subject: S;
	  }
	/** Every Cover in the Pane leaves at once, each as going back would. */
	| { readonly type: "ClearCovers"; readonly paneId: string }
	/** X on a Floating Pane: it closes with its Covers and Decks. */
	| { readonly type: "ClosePane"; readonly paneId: string }
	/** Take a resting Card from its Deck into the hand. */
	| {
			readonly type: "LiftCard";
			readonly sheetId: string;
			readonly presentationId: string;
	  }
	/**
	 * Lift a Sheet: a Cover leaves its stack, a Floating Ground takes its
	 * Pane with it, and a Rooted Ground's Pane steps one rung down.
	 */
	| { readonly type: "LiftSheet"; readonly sheetId: string }
	/** Lift a fresh Presentation dragged out of a Sheet, from a Segment or a Link. */
	| {
			readonly type: "LiftFresh";
			readonly paneId: string;
			readonly subject: S;
	  }
	/**
	 * Settle the Held Card as a Sheet: a Cover inside the Pane, or the Ground
	 * of a new Floating Pane on its side edge, opened at `size`.
	 */
	| {
			readonly type: "Expand";
			readonly paneId: string;
			readonly edge?: Edge;
			readonly size?: number | string;
	  }
	/** Let go of the Held Card where no Pane takes it; see `HeldHome`. */
	| { readonly type: "Release" }
	| { readonly type: "CancelGesture" }
	| { readonly type: "ActivatePane"; readonly paneId: string };

/** A Sheet in a Pane, found by id: the Ground rung or one of its Covers. */
export type SheetRef<S> = {
	readonly paneId: string;
	readonly sheetId: string;
	/** `null` while the Ground is at the Menu or a Menu Item. */
	readonly presentation: Presentation<S> | null;
	readonly deck: Deck<S> | null;
	readonly ground: boolean;
};

/** One Rooted Pane at its Menu. */
export function createWorkspace<S>(
	options: { readonly paneId?: string } = {},
): WorkspaceState<S> {
	const paneId = options.paneId ?? "pane-1";
	return {
		layout: {
			kind: "Pane",
			id: paneId,
			line: [{ id: "sheet-2", kind: "Menu", deck: null }],
			covers: [],
		},
		activePaneId: paneId,
		nextId: 3,
		held: null,
	};
}

export function workspaceReducer<S>(
	state: WorkspaceState<S>,
	command: WorkspaceCommand<S>,
): WorkspaceState<S> {
	switch (command.type) {
		case "Expand":
			return expand(state, command.paneId, command.edge, command.size);
		case "Release":
			return release(state);
		case "CancelGesture":
			return state.held ? restore(state, state.held.checkpoint) : state;
		case "ActivatePane":
			return findPane(state.layout, command.paneId) &&
				state.activePaneId !== command.paneId
				? { ...state, activePaneId: command.paneId }
				: state;
		case "ReconcileDeck":
			return reconcileDeck(state, command.deckId, command.cards);
	}
	/* while a Card is in hand, nothing else moves under it */
	if (state.held) return state;
	switch (command.type) {
		case "StepUp":
			return stepUp(state, command.paneId, command.to);
		case "GoBack":
			return goBack(state, command.sheetId);
		case "SpawnRootedPane":
			return spawnRootedPane(state, command.paneId, command.edge);
		case "Deal":
			return deal(
				state,
				command.sheetId,
				command.selection,
				command.cards,
			);
		case "BringToFront":
			return bringToFront(state, command.sheetId, command.presentationId);
		case "Sweep":
			return sweep(state, command.sheetId);
		case "FollowLink":
			return followLink(state, command.paneId, command.subject);
		case "ClearCovers":
			return clearCovers(state, command.paneId);
		case "ClosePane":
			return closePane(state, command.paneId);
		case "LiftCard":
			return liftCard(state, command.sheetId, command.presentationId);
		case "LiftSheet":
			return liftSheet(state, command.sheetId);
		case "LiftFresh":
			return liftFresh(state, command.paneId, command.subject);
	}
}

/* --- selectors --- */

export function panesOf<S>(node: LayoutNode<S>): readonly PaneNode<S>[] {
	return node.kind === "Pane"
		? [node]
		: node.children.flatMap((child) => panesOf(child));
}

export function findPane<S>(
	node: LayoutNode<S>,
	paneId: string,
): PaneNode<S> | null {
	return panesOf(node).find((pane) => pane.id === paneId) ?? null;
}

/** A Pane whose Ground line starts at the Menu. */
export function isRooted<S>(pane: PaneNode<S>): boolean {
	return pane.line[0]?.kind === "Menu";
}

export function groundOf<S>(pane: PaneNode<S>): Rung<S> {
	const rung = pane.line.at(-1);
	if (!rung) throw new Error(`Pane ${pane.id} has no Ground`);
	return rung;
}

/** Every Sheet in a Pane, bottom first: the Ground, then its Covers. */
export function sheetsOf<S>(pane: PaneNode<S>): readonly SheetRef<S>[] {
	const ground = groundOf(pane);
	return [
		{
			paneId: pane.id,
			sheetId: ground.id,
			presentation: ground.kind === "Sheet" ? ground.presentation : null,
			deck: ground.deck,
			ground: true,
		},
		...pane.covers.map((cover) => ({
			paneId: pane.id,
			sheetId: cover.id,
			presentation: cover.presentation,
			deck: cover.deck,
			ground: false,
		})),
	];
}

export function topSheetOf<S>(pane: PaneNode<S>): SheetRef<S> {
	return sheetsOf(pane).at(-1) as SheetRef<S>;
}

export function findSheet<S>(
	node: LayoutNode<S>,
	sheetId: string,
): SheetRef<S> | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.sheetId === sheetId) return sheet;
	return null;
}

/** The Sheet holding a Deck, found by the Deck's id. */
export function findDeck<S>(
	node: LayoutNode<S>,
	deckId: string,
): SheetRef<S> | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.deck?.id === deckId) return sheet;
	return null;
}

/** Every Presentation open as a Sheet somewhere, so its Card does not rest on a Deck. */
export function openIds<S>(node: LayoutNode<S>): ReadonlySet<string> {
	const ids = new Set<string>();
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.presentation) ids.add(sheet.presentation.id);
	return ids;
}

/** The Cards a Deck shows at rest: those not open as a Sheet. */
export function restingCards<S>(
	node: LayoutNode<S>,
	deck: Deck<S>,
): readonly Presentation<S>[] {
	const open = openIds(node);
	return deck.cards.filter((card) => !open.has(card.id));
}

/**
 * The Sheet whose live Deck still has a slot for this Card: the Sheet that
 * dealt it is in its stack and the Deck has not been swept or replaced.
 */
export function deckHolding<S>(
	node: LayoutNode<S>,
	presentationId: string,
): SheetRef<S> | null {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.deck?.cards.some((card) => card.id === presentationId))
				return sheet;
	return null;
}

/** Where a Release would send the Held Card, or `null` with nothing in hand. */
export function heldHome<S>(state: WorkspaceState<S>): HeldHome | null {
	const held = state.held;
	if (!held) return null;
	if (held.origin.kind === "Fresh") return "vanish";
	if (held.origin.kind === "RootedGround") return "restore";
	return deckHolding(state.layout, held.presentation.id) ? "slot" : "close";
}

/* --- layout helpers, pure over the tree --- */

/** Replaces a Pane by id; `null` removes it and lets its sibling take its place. */
export function replacePane<S>(
	node: LayoutNode<S>,
	paneId: string,
	next: LayoutNode<S> | null,
): LayoutNode<S> | null {
	if (node.kind === "Pane") return node.id === paneId ? next : node;
	const [a, b] = node.children;
	const nextA = replacePane(a, paneId, next);
	const nextB = replacePane(b, paneId, next);
	if (nextA === null) return nextB;
	if (nextB === null) return nextA;
	if (nextA === a && nextB === b) return node;
	return { ...node, children: [nextA, nextB] };
}

export function updatePane<S>(
	node: LayoutNode<S>,
	paneId: string,
	update: (pane: PaneNode<S>) => PaneNode<S>,
): LayoutNode<S> {
	const pane = findPane(node, paneId);
	if (!pane) return node;
	return replacePane(node, paneId, update(pane)) ?? node;
}

/**
 * Puts `fresh` beside a Pane, side by side, on the side the edge names. A
 * split's children run in reading order, so `inline-start` puts it first.
 */
export function splitBeside<S>(
	node: LayoutNode<S>,
	paneId: string,
	edge: Edge,
	fresh: PaneNode<S>,
	split: { readonly id: string; readonly size?: number | string },
): LayoutNode<S> {
	const pane = findPane(node, paneId);
	if (!pane) return node;
	const next: SplitNode<S> = {
		kind: "Split",
		id: split.id,
		direction: "horizontal",
		children: edge === "inline-start" ? [fresh, pane] : [pane, fresh],
		...(split.size === undefined
			? {}
			: { fresh: { paneId: fresh.id, size: split.size } }),
	};
	return replacePane(node, paneId, next) ?? node;
}

/* --- commands --- */

/** Mints ids from the state's counter; `nextId` is where it stopped. */
function minter(start: number) {
	let next = start;
	return {
		mint: (kind: "presentation" | "sheet" | "deck" | "pane" | "split") =>
			`${kind}-${(next++).toString()}`,
		get nextId() {
			return next;
		},
	};
}

/** Commits a new layout, keeping the Active Pane on a Pane that exists. */
function withLayout<S>(
	state: WorkspaceState<S>,
	layout: LayoutNode<S>,
	nextId = state.nextId,
): WorkspaceState<S> {
	const activePaneId = findPane(layout, state.activePaneId)
		? state.activePaneId
		: (panesOf(layout)[0]?.id ?? state.activePaneId);
	return { ...state, layout, activePaneId, nextId };
}

function updateSheet<S>(
	node: LayoutNode<S>,
	sheetId: string,
	update: <T extends Rung<S> | Cover<S>>(sheet: T) => T,
): LayoutNode<S> {
	const sheet = findSheet(node, sheetId);
	if (!sheet) return node;
	return updatePane(node, sheet.paneId, (pane) => ({
		...pane,
		line: pane.line.map((rung) =>
			rung.id === sheetId ? update(rung) : rung,
		),
		covers: pane.covers.map((cover) =>
			cover.id === sheetId ? update(cover) : cover,
		),
	}));
}

function setDeck<S>(
	node: LayoutNode<S>,
	sheetId: string,
	deck: Deck<S> | null,
): LayoutNode<S> {
	return updateSheet(node, sheetId, (sheet) => ({ ...sheet, deck }));
}

/** A Sheet's Card goes back in front on the live Deck that still holds it, if one does. */
function collapseTo<S>(
	node: LayoutNode<S>,
	presentationId: string,
): LayoutNode<S> {
	const holder = deckHolding(node, presentationId);
	return holder?.deck
		? setDeck(node, holder.sheetId, {
				...holder.deck,
				frontId: presentationId,
			})
		: node;
}

function isTop<S>(node: LayoutNode<S>, sheet: SheetRef<S>): boolean {
	const pane = findPane(node, sheet.paneId);
	return pane ? topSheetOf(pane).sheetId === sheet.sheetId : false;
}

function stepUp<S>(
	state: WorkspaceState<S>,
	paneId: string,
	to: Extract<WorkspaceCommand<S>, { type: "StepUp" }>["to"],
): WorkspaceState<S> {
	const pane = findPane(state.layout, paneId);
	if (!pane || pane.covers.length) return state;
	const ground = groundOf(pane);
	/* the line runs Menu › Menu Item › selection; a selection, once on the
	   Ground, changes only by going back or a lift */
	if (ground.kind !== (to.kind === "MenuItem" ? "Menu" : "MenuItem"))
		return state;
	const ids = minter(state.nextId);
	const rung: Rung<S> =
		to.kind === "MenuItem"
			? {
					id: ids.mint("sheet"),
					kind: "MenuItem",
					item: to.item,
					deck: null,
				}
			: {
					id: ids.mint("sheet"),
					kind: "Sheet",
					presentation: {
						id: ids.mint("presentation"),
						subject: to.subject,
					},
					deck: null,
				};
	return withLayout(
		state,
		updatePane(state.layout, paneId, (p) => ({
			...p,
			line: [...p.line, rung],
		})),
		ids.nextId,
	);
}

/** One rung down a Rooted Pane's line; the rung's Deck ends with it. */
function stepDown<S>(node: LayoutNode<S>, pane: PaneNode<S>): LayoutNode<S> {
	return updatePane(node, pane.id, (p) => ({
		...p,
		line: p.line.slice(0, -1),
	}));
}

function canStepDown<S>(pane: PaneNode<S>): boolean {
	return isRooted(pane) && !pane.covers.length && pane.line.length > 1;
}

function goBack<S>(
	state: WorkspaceState<S>,
	sheetId: string,
): WorkspaceState<S> {
	const sheet = findSheet(state.layout, sheetId);
	const pane = sheet && findPane(state.layout, sheet.paneId);
	if (!sheet || !pane || !isTop(state.layout, sheet)) return state;
	if (!sheet.ground)
		return withLayout(state, leaveCover(state.layout, pane, sheetId));
	return canStepDown(pane)
		? withLayout(state, stepDown(state.layout, pane))
		: state;
}

/** A Cover leaves: it collapses to its slot in a live Deck, or closes. */
function leaveCover<S>(
	node: LayoutNode<S>,
	pane: PaneNode<S>,
	coverId: string,
): LayoutNode<S> {
	const cover = pane.covers.find((c) => c.id === coverId);
	if (!cover) return node;
	return collapseTo(
		updatePane(node, pane.id, (p) => ({
			...p,
			covers: p.covers.filter((c) => c.id !== coverId),
		})),
		cover.presentation.id,
	);
}

function spawnRootedPane<S>(
	state: WorkspaceState<S>,
	paneId: string,
	edge: Edge,
): WorkspaceState<S> {
	if (!findPane(state.layout, paneId)) return state;
	const ids = minter(state.nextId);
	const fresh: PaneNode<S> = {
		kind: "Pane",
		id: ids.mint("pane"),
		line: [{ id: ids.mint("sheet"), kind: "Menu", deck: null }],
		covers: [],
	};
	return withLayout(
		state,
		splitBeside(state.layout, paneId, edge, fresh, {
			id: ids.mint("split"),
		}),
		ids.nextId,
	);
}

function deal<S>(
	state: WorkspaceState<S>,
	sheetId: string,
	selection: string,
	cards: readonly DealtCard<S>[],
): WorkspaceState<S> {
	const sheet = findSheet(state.layout, sheetId);
	if (!sheet || !isTop(state.layout, sheet)) return state;
	const ids = minter(state.nextId);
	const deck: Deck<S> = {
		id: ids.mint("deck"),
		selection,
		cards: cards.map((card) => present(ids.mint("presentation"), card)),
		frontId: null,
	};
	return withLayout(state, setDeck(state.layout, sheetId, deck), ids.nextId);
}

function present<S>(id: string, card: DealtCard<S>): Presentation<S> {
	return card.key === undefined
		? { id, subject: card.subject }
		: { id, subject: card.subject, key: card.key };
}

function reconcileDeck<S>(
	state: WorkspaceState<S>,
	deckId: string,
	cards: readonly (DealtCard<S> & { readonly key: string })[],
): WorkspaceState<S> {
	const keys = new Set(cards.map((card) => card.key));
	if (keys.size !== cards.length) return state;
	const ids = minter(state.nextId);
	const live = reconcileIn(state.layout, deckId, cards, ids.mint);
	/* the Lift's checkpoint keeps up, so a cancel does not undo the update */
	const held = state.held;
	const checkpointLayout = held
		? reconcileIn(
				held.checkpoint.layout,
				deckId,
				cards,
				ids.mint,
				live.minted,
			)
		: null;
	if (!live.changed && !checkpointLayout?.changed) return state;
	const renamed = live.subjects.get(held?.presentation.id ?? "");
	return {
		...withLayout(state, live.layout, ids.nextId),
		held: held && {
			...held,
			presentation:
				renamed === undefined
					? held.presentation
					: { ...held.presentation, subject: renamed },
			checkpoint: checkpointLayout
				? { ...held.checkpoint, layout: checkpointLayout.layout }
				: held.checkpoint,
		},
	};
}

/**
 * Reconciles one Deck in a layout by key. A kept key keeps its Presentation
 * and its slot, and any Sheet showing it takes the new Subject. New keys are
 * appended in the order given, minted, or reusing `minted` so a checkpoint
 * names them as the live layout does. A key no longer given loses its slot,
 * so a Sheet showing it closes on going back. Unkeyed Cards stay as dealt.
 */
function reconcileIn<S>(
	node: LayoutNode<S>,
	deckId: string,
	cards: readonly (DealtCard<S> & { readonly key: string })[],
	mint: (kind: "presentation") => string,
	minted = new Map<string, string>(),
): {
	readonly layout: LayoutNode<S>;
	readonly changed: boolean;
	readonly subjects: ReadonlyMap<string, S>;
	readonly minted: Map<string, string>;
} {
	const subjects = new Map<string, S>();
	const sheet = findDeck(node, deckId);
	const deck = sheet?.deck;
	if (!sheet || !deck)
		return { layout: node, changed: false, subjects, minted };
	const given = new Map(cards.map((card) => [card.key, card] as const));
	const kept = deck.cards.flatMap((current) => {
		if (current.key === undefined) return [current];
		const card = given.get(current.key);
		if (!card) return [];
		if (sameValue(current.subject, card.subject)) return [current];
		subjects.set(current.id, card.subject);
		return [{ ...current, subject: card.subject }];
	});
	const held = new Set(deck.cards.map((card) => card.key));
	const added = cards.flatMap((card) => {
		if (held.has(card.key)) return [];
		const id = minted.get(card.key) ?? mint("presentation");
		minted.set(card.key, id);
		return [present(id, card)];
	});
	const next = [...kept, ...added];
	const frontId = next.some((card) => card.id === deck.frontId)
		? deck.frontId
		: null;
	const changed =
		frontId !== deck.frontId ||
		next.length !== deck.cards.length ||
		next.some((card, index) => card !== deck.cards[index]);
	if (!changed) return { layout: node, changed, subjects, minted };
	let layout = setDeck(node, sheet.sheetId, {
		...deck,
		cards: next,
		frontId,
	});
	for (const [id, subject] of subjects)
		layout = resubject(layout, id, subject);
	return { layout, changed, subjects, minted };
}

/** A Presentation open as a Sheet shows the Subject its Card now has. */
function resubject<S>(
	node: LayoutNode<S>,
	presentationId: string,
	subject: S,
): LayoutNode<S> {
	for (const pane of panesOf(node))
		for (const sheet of sheetsOf(pane))
			if (sheet.presentation?.id === presentationId)
				return updateSheet(node, sheet.sheetId, (s) =>
					"presentation" in s
						? { ...s, presentation: { ...s.presentation, subject } }
						: s,
				);
	return node;
}

function bringToFront<S>(
	state: WorkspaceState<S>,
	sheetId: string,
	presentationId: string,
): WorkspaceState<S> {
	const deck = findSheet(state.layout, sheetId)?.deck;
	if (
		!deck ||
		deck.frontId === presentationId ||
		!deck.cards.some((card) => card.id === presentationId)
	)
		return state;
	return withLayout(
		state,
		setDeck(state.layout, sheetId, { ...deck, frontId: presentationId }),
	);
}

function sweep<S>(
	state: WorkspaceState<S>,
	sheetId: string,
): WorkspaceState<S> {
	const sheet = findSheet(state.layout, sheetId);
	if (!sheet?.deck || !isTop(state.layout, sheet)) return state;
	return withLayout(state, setDeck(state.layout, sheetId, null));
}

function followLink<S>(
	state: WorkspaceState<S>,
	paneId: string,
	subject: S,
): WorkspaceState<S> {
	if (!findPane(state.layout, paneId)) return state;
	const ids = minter(state.nextId);
	const presentation = { id: ids.mint("presentation"), subject };
	return withLayout(
		state,
		pushCover(state.layout, paneId, ids.mint("sheet"), presentation),
		ids.nextId,
	);
}

function pushCover<S>(
	node: LayoutNode<S>,
	paneId: string,
	sheetId: string,
	presentation: Presentation<S>,
): LayoutNode<S> {
	return updatePane(node, paneId, (pane) => ({
		...pane,
		covers: [...pane.covers, { id: sheetId, presentation, deck: null }],
	}));
}

/**
 * The lowest Cover collapses last, so when two collapse onto one Deck, the
 * one nearest the Ground is in front.
 */
function clearCovers<S>(
	state: WorkspaceState<S>,
	paneId: string,
): WorkspaceState<S> {
	const pane = findPane(state.layout, paneId);
	if (!pane?.covers.length) return state;
	return withLayout(
		state,
		[...pane.covers].reverse().reduce(
			(node, cover) => collapseTo(node, cover.presentation.id),
			updatePane(state.layout, paneId, (p) => ({ ...p, covers: [] })),
		),
	);
}

/** A Floating Pane goes; its Ground collapses to its slot in a live Deck, or closes. */
function removeFloatingPane<S>(
	node: LayoutNode<S>,
	pane: PaneNode<S>,
): LayoutNode<S> | null {
	const without = replacePane(node, pane.id, null);
	if (!without) return null;
	const ground = groundOf(pane);
	return ground.kind === "Sheet"
		? collapseTo(without, ground.presentation.id)
		: without;
}

function closePane<S>(
	state: WorkspaceState<S>,
	paneId: string,
): WorkspaceState<S> {
	const pane = findPane(state.layout, paneId);
	if (!pane || isRooted(pane)) return state;
	const layout = removeFloatingPane(state.layout, pane);
	return layout ? withLayout(state, layout) : state;
}

function liftCard<S>(
	state: WorkspaceState<S>,
	sheetId: string,
	presentationId: string,
): WorkspaceState<S> {
	const sheet = findSheet(state.layout, sheetId);
	const presentation = sheet?.deck
		? restingCards(state.layout, sheet.deck).find(
				(card) => card.id === presentationId,
			)
		: undefined;
	if (!sheet || !presentation) return state;
	return hold(state, state, presentation, {
		kind: "Deck",
		paneId: sheet.paneId,
		sheetId,
	});
}

function liftSheet<S>(
	state: WorkspaceState<S>,
	sheetId: string,
): WorkspaceState<S> {
	const sheet = findSheet(state.layout, sheetId);
	const pane = sheet && findPane(state.layout, sheet.paneId);
	const presentation = sheet?.presentation;
	if (!sheet || !pane || !presentation) return state;
	if (!sheet.ground)
		return hold(
			state,
			withLayout(state, leaveCover(state.layout, pane, sheetId)),
			presentation,
			{ kind: "Cover", paneId: pane.id },
		);
	if (pane.covers.length) return state;
	if (isRooted(pane))
		return canStepDown(pane)
			? hold(
					state,
					withLayout(state, stepDown(state.layout, pane)),
					presentation,
					{ kind: "RootedGround", paneId: pane.id },
				)
			: state;
	const layout = removeFloatingPane(state.layout, pane);
	return layout
		? hold(state, withLayout(state, layout), presentation, {
				kind: "FloatingGround",
				paneId: pane.id,
			})
		: state;
}

function liftFresh<S>(
	state: WorkspaceState<S>,
	paneId: string,
	subject: S,
): WorkspaceState<S> {
	if (!findPane(state.layout, paneId)) return state;
	const ids = minter(state.nextId);
	const presentation = { id: ids.mint("presentation"), subject };
	return hold(state, { ...state, nextId: ids.nextId }, presentation, {
		kind: "Fresh",
		paneId,
	});
}

function hold<S>(
	before: WorkspaceState<S>,
	after: WorkspaceState<S>,
	presentation: Presentation<S>,
	origin: LiftOrigin,
): WorkspaceState<S> {
	return {
		...after,
		held: { presentation, origin, checkpoint: snapshot(before) },
	};
}

function expand<S>(
	state: WorkspaceState<S>,
	paneId: string,
	edge: Edge | undefined,
	size: number | string | undefined,
): WorkspaceState<S> {
	const held = state.held;
	if (!held || !findPane(state.layout, paneId)) return state;
	const ids = minter(state.nextId);
	const settled = { ...state, held: null };
	if (!edge)
		return withLayout(
			settled,
			pushCover(
				state.layout,
				paneId,
				ids.mint("sheet"),
				held.presentation,
			),
			ids.nextId,
		);
	const fresh: PaneNode<S> = {
		kind: "Pane",
		id: ids.mint("pane"),
		line: [
			{
				id: ids.mint("sheet"),
				kind: "Sheet",
				presentation: held.presentation,
				deck: null,
			},
		],
		covers: [],
	};
	return withLayout(
		settled,
		splitBeside(state.layout, paneId, edge, fresh, {
			id: ids.mint("split"),
			...(size === undefined ? {} : { size }),
		}),
		ids.nextId,
	);
}

function release<S>(state: WorkspaceState<S>): WorkspaceState<S> {
	const held = state.held;
	if (!held) return state;
	return heldHome(state) === "restore"
		? restore(state, held.checkpoint)
		: { ...state, held: null };
}

/** Back to a checkpoint; the id counter never runs backwards. */
function restore<S>(
	state: WorkspaceState<S>,
	checkpoint: WorkspaceSnapshot<S>,
): WorkspaceState<S> {
	return { ...checkpoint, nextId: state.nextId, held: null };
}

function snapshot<S>(state: WorkspaceState<S>): WorkspaceSnapshot<S> {
	return {
		layout: state.layout,
		activePaneId: state.activePaneId,
		nextId: state.nextId,
	};
}

/** Structural equality over plain, serialisable data. */
function sameValue(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (
		typeof a !== "object" ||
		typeof b !== "object" ||
		a === null ||
		b === null ||
		Array.isArray(a) !== Array.isArray(b)
	)
		return false;
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	return (
		keysA.length === keysB.length &&
		keysA.every(
			(key) =>
				Object.hasOwn(b, key) &&
				sameValue(
					(a as Record<string, unknown>)[key],
					(b as Record<string, unknown>)[key],
				),
		)
	);
}
