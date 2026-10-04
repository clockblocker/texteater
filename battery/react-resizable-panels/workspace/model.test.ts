import { describe, expect, test } from "vitest";
import {
	createWorkspace,
	deckHolding,
	findPane,
	findSheet,
	groundOf,
	heldHome,
	isRooted,
	type PaneNode,
	panesOf,
	restingCards,
	type SheetRef,
	sheetsOf,
	topSheetOf,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "./model";

/* Describe and test names follow the Compass playground's RULES. */

type Subject = { readonly name: string };
type State = WorkspaceState<Subject>;
type Command = WorkspaceCommand<Subject>;

const ROOT = "root";
const text = { name: "Text" };
const otherText = { name: "Other Text" };
const note = (name: string) => ({ name });

function reduce(state: State, ...commands: Command[]): State {
	return commands.reduce(workspaceReducer<Subject>, state);
}

function pane(state: State, paneId = ROOT): PaneNode<Subject> {
	const found = findPane(state.layout, paneId);
	if (!found) throw new Error(`no Pane ${paneId}`);
	return found;
}

function top(state: State, paneId = ROOT): SheetRef<Subject> {
	return topSheetOf(pane(state, paneId));
}

function ground(state: State, paneId = ROOT): SheetRef<Subject> {
	return sheetsOf(pane(state, paneId))[0] as SheetRef<Subject>;
}

function names(cards: readonly { subject: Subject }[]): string[] {
	return cards.map((card) => card.subject.name);
}

/** A Rooted Pane at Menu › Library › Text. */
function atText(): State {
	return reduce(
		createWorkspace<Subject>({ paneId: ROOT }),
		{
			type: "StepUp",
			paneId: ROOT,
			to: { kind: "MenuItem", item: "Library" },
		},
		{ type: "StepUp", paneId: ROOT, to: { kind: "Sheet", subject: text } },
	);
}

function dealOn(state: State, sheetId: string, word = "noch"): State {
	return reduce(state, {
		type: "Deal",
		sheetId,
		selection: word,
		cards: ["A", "B", "C"].map((name) => ({
			subject: note(`${word} ${name}`),
		})),
	});
}

/** The Text's Deck dealt, and its first Card opened as a Cover. */
function withCardCover(): State {
	const dealt = dealOn(atText(), ground(atText()).sheetId);
	const card = ground(dealt).deck?.cards[0];
	if (!card) throw new Error("no Card");
	return reduce(
		dealt,
		{
			type: "LiftCard",
			sheetId: ground(dealt).sheetId,
			presentationId: card.id,
		},
		{ type: "Expand", paneId: ROOT },
	);
}

describe("the Ground line", () => {
	test("a workspace starts as one Rooted Pane at its Menu", () => {
		const state = createWorkspace<Subject>();
		const [only] = panesOf(state.layout);
		expect(only && isRooted(only)).toBe(true);
		expect(only && groundOf(only).kind).toBe("Menu");
		expect(state.activePaneId).toBe(only?.id);
		expect(state.held).toBeNull();
	});

	test("walks Menu › Menu Item › selection, and a selection on the Ground stays put", () => {
		const state = atText();
		expect(pane(state).line.map((rung) => rung.kind)).toEqual([
			"Menu",
			"MenuItem",
			"Sheet",
		]);
		expect(ground(state).presentation?.subject).toBe(text);
		expect(
			reduce(state, {
				type: "StepUp",
				paneId: ROOT,
				to: { kind: "Sheet", subject: otherText },
			}),
		).toBe(state);
		expect(
			reduce(createWorkspace<Subject>({ paneId: ROOT }), {
				type: "StepUp",
				paneId: ROOT,
				to: { kind: "Sheet", subject: text },
			}).layout,
		).toEqual(createWorkspace<Subject>({ paneId: ROOT }).layout);
	});

	test("any Menu Item can be a rung, not only the Library", () => {
		const state = reduce(createWorkspace<Subject>({ paneId: ROOT }), {
			type: "StepUp",
			paneId: ROOT,
			to: { kind: "MenuItem", item: "Settings" },
		});
		expect(groundOf(pane(state))).toMatchObject({
			kind: "MenuItem",
			item: "Settings",
		});
	});

	test("does not step up under Covers", () => {
		const covered = reduce(createWorkspace<Subject>({ paneId: ROOT }), {
			type: "FollowLink",
			paneId: ROOT,
			subject: note("n"),
		});
		expect(
			reduce(covered, {
				type: "StepUp",
				paneId: ROOT,
				to: { kind: "MenuItem", item: "Library" },
			}),
		).toBe(covered);
	});
});

describe("Click a word", () => {
	test("Deals a Deck that belongs to the Sheet it was clicked in: the Text", () => {
		const state = dealOn(atText(), ground(atText()).sheetId);
		const deck = ground(state).deck;
		expect(deck?.selection).toBe("noch");
		expect(names(deck?.cards ?? [])).toEqual([
			"noch A",
			"noch B",
			"noch C",
		]);
		expect(deck?.frontId).toBeNull();
	});

	test("Deals a Deck that belongs to the Sheet it was clicked in: a Source Context inside a Note", () => {
		const covered = withCardCover();
		const cover = top(covered);
		const state = dealOn(covered, cover.sheetId, "Haus");
		expect(top(state).deck?.selection).toBe("Haus");
		expect(ground(state).deck?.selection).toBe("noch");
	});

	test("a new selection in the same Sheet replaces its Deck", () => {
		const first = dealOn(atText(), ground(atText()).sheetId);
		const second = dealOn(first, ground(first).sheetId, "Haus");
		expect(ground(second).deck?.selection).toBe("Haus");
		expect(ground(second).deck?.id).not.toBe(ground(first).deck?.id);
	});

	test("only the top Sheet deals: a covered Sheet does not", () => {
		const covered = withCardCover();
		expect(dealOn(covered, ground(covered).sheetId, "Haus")).toBe(covered);
	});

	test("a tap on a folded Card brings it to the front", () => {
		const state = dealOn(atText(), ground(atText()).sheetId);
		const second = ground(state).deck?.cards[1];
		const fronted = reduce(state, {
			type: "BringToFront",
			sheetId: ground(state).sheetId,
			presentationId: second?.id ?? "",
		});
		expect(ground(fronted).deck?.frontId).toBe(second?.id);
	});
});

describe("Click a link", () => {
	test("Pushes a Cover over this Pane", () => {
		const state = reduce(atText(), {
			type: "FollowLink",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		expect(pane(state).covers).toHaveLength(1);
		expect(top(state).presentation?.subject.name).toBe("Lemma");
		expect(
			deckHolding(state.layout, top(state).presentation?.id ?? ""),
		).toBeNull();
	});

	test("each push is a fresh Presentation, even of a Subject already open", () => {
		const subject = note("Lemma");
		const state = reduce(
			atText(),
			{ type: "FollowLink", paneId: ROOT, subject },
			{ type: "FollowLink", paneId: ROOT, subject },
		);
		const [a, b] = pane(state).covers;
		expect(a?.presentation.id).not.toBe(b?.presentation.id);
	});

	test("Go to source pushes the Text: it closes no Cover and never touches the Ground", () => {
		const covered = withCardCover();
		const source = { name: "Text, at the Sentence" };
		const state = reduce(covered, {
			type: "FollowLink",
			paneId: ROOT,
			subject: source,
		});
		expect(pane(state).covers).toHaveLength(2);
		expect(pane(state).covers[0]).toBe(pane(covered).covers[0]);
		expect(pane(state).line).toBe(pane(covered).line);
		expect(top(state).presentation?.subject).toBe(source);
	});
});

describe("Drag a word or link", () => {
	test("Lifts a Held Card: a fresh Presentation from nowhere", () => {
		const before = atText();
		const state = reduce(before, {
			type: "LiftFresh",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		expect(state.held?.presentation.subject.name).toBe("Lemma");
		expect(state.held?.origin).toEqual({ kind: "Fresh", paneId: ROOT });
		expect(state.layout).toBe(before.layout);
		expect(heldHome(state)).toBe("vanish");
	});

	test("Drop on a side for a new Pane: a Floating Pane with the Card as its Ground", () => {
		const state = reduce(
			atText(),
			{ type: "LiftFresh", paneId: ROOT, subject: note("Lemma") },
			{ type: "Expand", paneId: ROOT, edge: "inline-end", size: "40%" },
		);
		const panes = panesOf(state.layout);
		expect(panes.map((p) => p.id)[0]).toBe(ROOT);
		const floating = panes[1] as PaneNode<Subject>;
		expect(isRooted(floating)).toBe(false);
		expect(ground(state, floating.id).presentation?.subject.name).toBe(
			"Lemma",
		);
		expect(state.layout).toMatchObject({
			kind: "Split",
			direction: "horizontal",
			fresh: { paneId: floating.id, size: "40%" },
		});
		expect(state.held).toBeNull();
	});

	test("Drop on the inline-start side puts the new Pane first", () => {
		const state = reduce(
			atText(),
			{ type: "LiftFresh", paneId: ROOT, subject: note("Lemma") },
			{ type: "Expand", paneId: ROOT, edge: "inline-start" },
		);
		expect(
			panesOf(state.layout)
				.map((p) => p.id)
				.at(-1),
		).toBe(ROOT);
	});

	test("anywhere else in a Pane for a Cover", () => {
		const state = reduce(
			atText(),
			{ type: "LiftFresh", paneId: ROOT, subject: note("Lemma") },
			{ type: "Expand", paneId: ROOT },
		);
		expect(top(state).presentation?.subject.name).toBe("Lemma");
		expect(top(state).ground).toBe(false);
	});

	test("let go with nothing under it, the fresh Card goes", () => {
		const before = atText();
		const state = reduce(
			before,
			{ type: "LiftFresh", paneId: ROOT, subject: note("Lemma") },
			{ type: "Release" },
		);
		expect(state.layout).toBe(before.layout);
		expect(state.held).toBeNull();
	});
});

describe("Drag ↑ a Card", () => {
	test("Takes it in hand; letting go over a Pane opens it as a Cover that keeps its slot", () => {
		const covered = withCardCover();
		const deck = ground(covered).deck;
		const card = top(covered).presentation;
		expect(deck?.cards[0]?.id).toBe(card?.id);
		expect(names(restingCards(covered.layout, deck ?? never()))).toEqual([
			"noch B",
			"noch C",
		]);
		expect(deckHolding(covered.layout, card?.id ?? "")?.sheetId).toBe(
			ground(covered).sheetId,
		);
	});

	test("back down on the Deck, it rests", () => {
		const dealt = dealOn(atText(), ground(atText()).sheetId);
		const card = ground(dealt).deck?.cards[1];
		const lifted = reduce(dealt, {
			type: "LiftCard",
			sheetId: ground(dealt).sheetId,
			presentationId: card?.id ?? "",
		});
		expect(heldHome(lifted)).toBe("slot");
		expect(lifted.layout).toBe(dealt.layout);
		const rested = reduce(lifted, { type: "Release" });
		expect(rested.layout).toBe(dealt.layout);
		expect(rested.held).toBeNull();
	});

	test("a Card open as a Sheet cannot be lifted off its Deck", () => {
		const covered = withCardCover();
		expect(
			reduce(covered, {
				type: "LiftCard",
				sheetId: ground(covered).sheetId,
				presentationId: top(covered).presentation?.id ?? "",
			}),
		).toBe(covered);
	});

	test("while a Card is in hand, nothing else moves under it", () => {
		const dealt = dealOn(atText(), ground(atText()).sheetId);
		const lifted = reduce(dealt, {
			type: "LiftCard",
			sheetId: ground(dealt).sheetId,
			presentationId: ground(dealt).deck?.cards[0]?.id ?? "",
		});
		expect(
			reduce(lifted, { type: "Sweep", sheetId: ground(lifted).sheetId }),
		).toBe(lifted);
		expect(
			reduce(lifted, {
				type: "FollowLink",
				paneId: ROOT,
				subject: note("n"),
			}),
		).toBe(lifted);
	});
});

describe("Drag ← a Card", () => {
	test("Swipes the whole Deck: let go past the line and it is swept", () => {
		const dealt = dealOn(atText(), ground(atText()).sheetId);
		const swept = reduce(dealt, {
			type: "Sweep",
			sheetId: ground(dealt).sheetId,
		});
		expect(ground(swept).deck).toBeNull();
		expect(ground(swept).presentation).toBe(ground(dealt).presentation);
	});
});

describe("← on a Cover", () => {
	test("Collapses it to its Card if that Card is still in a live Deck", () => {
		const covered = withCardCover();
		const card = top(covered).presentation;
		const state = reduce(covered, {
			type: "GoBack",
			sheetId: top(covered).sheetId,
		});
		expect(pane(state).covers).toHaveLength(0);
		expect(ground(state).deck?.frontId).toBe(card?.id);
		expect(
			names(restingCards(state.layout, ground(state).deck ?? never())),
		).toEqual(["noch A", "noch B", "noch C"]);
	});

	test("else closes it", () => {
		const covered = withCardCover();
		const swept = reduce(
			covered,
			{ type: "GoBack", sheetId: top(covered).sheetId },
			{ type: "Sweep", sheetId: ground(covered).sheetId },
		);
		const linked = reduce(swept, {
			type: "FollowLink",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		const state = reduce(linked, {
			type: "GoBack",
			sheetId: top(linked).sheetId,
		});
		expect(pane(state).covers).toHaveLength(0);
		expect(ground(state).deck).toBeNull();
	});

	test("its own Deck ends with it, and the Deck beneath shows again", () => {
		const covered = withCardCover();
		const dealtOnCover = dealOn(covered, top(covered).sheetId, "Haus");
		const state = reduce(dealtOnCover, {
			type: "GoBack",
			sheetId: top(dealtOnCover).sheetId,
		});
		expect(ground(state).deck?.selection).toBe("noch");
		expect(findSheet(state.layout, top(dealtOnCover).sheetId)).toBeNull();
	});

	test("only the top Cover's ← is reachable", () => {
		const covered = reduce(withCardCover(), {
			type: "FollowLink",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		const lower = pane(covered).covers[0];
		expect(
			reduce(covered, { type: "GoBack", sheetId: lower?.id ?? "" }),
		).toBe(covered);
	});
});

describe("← on the Ground", () => {
	test("Steps one rung down the line: Text › Library › Menu. The Text's Deck goes with it", () => {
		const dealt = dealOn(atText(), ground(atText()).sheetId);
		const library = reduce(dealt, {
			type: "GoBack",
			sheetId: ground(dealt).sheetId,
		});
		expect(groundOf(pane(library))).toMatchObject({
			kind: "MenuItem",
			item: "Library",
			deck: null,
		});
		const menu = reduce(library, {
			type: "GoBack",
			sheetId: ground(library).sheetId,
		});
		expect(groundOf(pane(menu)).kind).toBe("Menu");
		expect(
			reduce(menu, { type: "GoBack", sheetId: ground(menu).sheetId }),
		).toBe(menu);
	});

	test("not while it is covered", () => {
		const covered = withCardCover();
		expect(
			reduce(covered, {
				type: "GoBack",
				sheetId: ground(covered).sheetId,
			}),
		).toBe(covered);
	});

	test("a Floating Ground has no rung below: its bar shows X, not ←", () => {
		const floating = floatingFromCard();
		const paneId = panesOf(floating.layout)[1]?.id ?? "";
		expect(
			reduce(floating, {
				type: "GoBack",
				sheetId: ground(floating, paneId).sheetId,
			}),
		).toBe(floating);
	});
});

/** The Text's Deck dealt, and its first Card dropped on the inline-end edge. */
function floatingFromCard(): State {
	const dealt = dealOn(atText(), ground(atText()).sheetId);
	return reduce(
		dealt,
		{
			type: "LiftCard",
			sheetId: ground(dealt).sheetId,
			presentationId: ground(dealt).deck?.cards[0]?.id ?? "",
		},
		{ type: "Expand", paneId: ROOT, edge: "inline-end" },
	);
}

describe("X", () => {
	test("Closes a Floating Pane. Its Note collapses back to its Card if the Deck is still live", () => {
		const floating = floatingFromCard();
		const paneId = panesOf(floating.layout)[1]?.id ?? "";
		const card = ground(floating, paneId).presentation;
		const state = reduce(floating, { type: "ClosePane", paneId });
		expect(panesOf(state.layout).map((p) => p.id)).toEqual([ROOT]);
		expect(ground(state).deck?.frontId).toBe(card?.id);
	});

	test("closes it with its Covers and its Deck, and the Note closes when its Deck is gone", () => {
		const floating = floatingFromCard();
		const paneId = panesOf(floating.layout)[1]?.id ?? "";
		const busy = reduce(
			dealOn(floating, ground(floating, paneId).sheetId, "Haus"),
			{ type: "FollowLink", paneId, subject: note("Lemma") },
			{ type: "Sweep", sheetId: ground(floating).sheetId },
		);
		const state = reduce(busy, { type: "ClosePane", paneId });
		expect(panesOf(state.layout)).toHaveLength(1);
		expect(ground(state).deck).toBeNull();
	});

	test("a Rooted Pane has no X", () => {
		const state = atText();
		expect(reduce(state, { type: "ClosePane", paneId: ROOT })).toBe(state);
	});

	test("the Active Pane falls back to a Pane that exists", () => {
		const floating = floatingFromCard();
		const paneId = panesOf(floating.layout)[1]?.id ?? "";
		const state = reduce(
			floating,
			{ type: "ActivatePane", paneId },
			{ type: "ClosePane", paneId },
		);
		expect(state.activePaneId).toBe(ROOT);
	});
});

describe("× on a Cover", () => {
	test("Every Cover in the Pane leaves at once, each as its ← would, and the Ground shows", () => {
		const covered = withCardCover();
		const second = ground(covered).deck?.cards[1];
		const stacked = reduce(
			covered,
			{
				type: "LiftCard",
				sheetId: ground(covered).sheetId,
				presentationId: second?.id ?? "",
			},
			{ type: "Expand", paneId: ROOT },
			{ type: "FollowLink", paneId: ROOT, subject: note("Lemma") },
		);
		const state = reduce(stacked, { type: "ClearCovers", paneId: ROOT });
		expect(pane(state).covers).toHaveLength(0);
		/* the Cover nearest the Ground lands in front */
		expect(ground(state).deck?.frontId).toBe(top(covered).presentation?.id);
		expect(
			restingCards(state.layout, ground(state).deck ?? never()),
		).toHaveLength(3);
	});
});

describe("Drag a Cover's Heading", () => {
	test("Lifts the Cover into a Held Card, back in front on its live Deck", () => {
		const covered = withCardCover();
		const card = top(covered).presentation;
		const state = reduce(covered, {
			type: "LiftSheet",
			sheetId: top(covered).sheetId,
		});
		expect(pane(state).covers).toHaveLength(0);
		expect(state.held?.presentation).toBe(card);
		expect(state.held?.origin).toEqual({ kind: "Cover", paneId: ROOT });
		expect(ground(state).deck?.frontId).toBe(card?.id);
		expect(heldHome(state)).toBe("slot");
	});

	test("a lifted Cover with no live Deck closes when let go", () => {
		const linked = reduce(atText(), {
			type: "FollowLink",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		const lifted = reduce(linked, {
			type: "LiftSheet",
			sheetId: top(linked).sheetId,
		});
		expect(heldHome(lifted)).toBe("close");
		const state = reduce(lifted, { type: "Release" });
		expect(pane(state).covers).toHaveLength(0);
		expect(state.held).toBeNull();
	});

	test("A Floating Ground lifts the same way, and its Pane closes behind it", () => {
		const floating = floatingFromCard();
		const paneId = panesOf(floating.layout)[1]?.id ?? "";
		const state = reduce(floating, {
			type: "LiftSheet",
			sheetId: ground(floating, paneId).sheetId,
		});
		expect(panesOf(state.layout)).toHaveLength(1);
		expect(state.held?.origin).toEqual({ kind: "FloatingGround", paneId });
		expect(heldHome(state)).toBe("slot");
	});

	test("Cancel gesture restores the workspace as it was when the Lift began", () => {
		const covered = withCardCover();
		const state = reduce(
			covered,
			{ type: "LiftSheet", sheetId: top(covered).sheetId },
			{ type: "CancelGesture" },
		);
		expect(state.layout).toBe(covered.layout);
		expect(state.held).toBeNull();
	});

	test("the id counter never runs backwards on a cancel", () => {
		const lifted = reduce(atText(), {
			type: "LiftFresh",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		const state = reduce(lifted, { type: "CancelGesture" });
		expect(state.nextId).toBe(lifted.nextId);
	});
});

describe("Hold the Pane bar", () => {
	test("About a second on a Rooted Ground's bar lifts the Text; the Pane steps down to the Library", () => {
		const dealt = dealOn(atText(), ground(atText()).sheetId);
		const state = reduce(dealt, {
			type: "LiftSheet",
			sheetId: ground(dealt).sheetId,
		});
		expect(groundOf(pane(state))).toMatchObject({
			kind: "MenuItem",
			item: "Library",
		});
		expect(state.held?.presentation.subject).toBe(text);
		expect(state.held?.origin).toEqual({
			kind: "RootedGround",
			paneId: ROOT,
		});
		expect(heldHome(state)).toBe("restore");
	});

	test("let go in place, the Text is the Ground again with its Deck", () => {
		const dealt = dealOn(atText(), ground(atText()).sheetId);
		const state = reduce(
			dealt,
			{ type: "LiftSheet", sheetId: ground(dealt).sheetId },
			{ type: "Release" },
		);
		expect(state.layout).toBe(dealt.layout);
	});

	test("a Rooted Ground at a Menu rung has nothing to lift", () => {
		const library = reduce(createWorkspace<Subject>({ paneId: ROOT }), {
			type: "StepUp",
			paneId: ROOT,
			to: { kind: "MenuItem", item: "Library" },
		});
		expect(
			reduce(library, {
				type: "LiftSheet",
				sheetId: ground(library).sheetId,
			}),
		).toBe(library);
	});
});

describe("Click the page, Esc", () => {
	test("Sweeps the top Sheet's Deck", () => {
		const covered = dealOn(
			withCardCover(),
			top(withCardCover()).sheetId,
			"Haus",
		);
		const state = reduce(covered, {
			type: "Sweep",
			sheetId: top(covered).sheetId,
		});
		expect(top(state).deck).toBeNull();
		expect(ground(state).deck?.selection).toBe("noch");
	});

	test("a covered Sheet's Deck is hidden, not swept", () => {
		const covered = withCardCover();
		expect(
			reduce(covered, {
				type: "Sweep",
				sheetId: ground(covered).sheetId,
			}),
		).toBe(covered);
	});
});

describe("Spawn an empty Rooted Pane", () => {
	test("spawns a Rooted Pane at its Menu beside the Pane", () => {
		const state = reduce(atText(), {
			type: "SpawnRootedPane",
			paneId: ROOT,
			edge: "inline-end",
		});
		const fresh = panesOf(state.layout)[1] as PaneNode<Subject>;
		expect(isRooted(fresh)).toBe(true);
		expect(groundOf(fresh).kind).toBe("Menu");
		expect(state.layout).toMatchObject({
			kind: "Split",
			direction: "horizontal",
		});
	});
});

describe("ReconcileDeck", () => {
	function keyed(state: State, ...keys: string[]): State {
		return reduce(state, {
			type: "Deal",
			sheetId: ground(state).sheetId,
			selection: "noch",
			cards: keys.map((key) => ({ key, subject: note(key) })),
		});
	}
	function reconcile(
		state: State,
		deckId: string,
		...cards: [string, string][]
	) {
		return reduce(state, {
			type: "ReconcileDeck",
			deckId,
			cards: cards.map(([key, name]) => ({ key, subject: note(name) })),
		});
	}

	test("keeps the Presentations of kept keys, adds new ones, and drops the rest, in the given order", () => {
		const dealt = keyed(atText(), "resolver");
		const deck = ground(dealt).deck ?? never();
		const state = reconcile(
			dealt,
			deck.id,
			["reading", "Reading"],
			["resolver", "resolver"],
		);
		const cards = ground(state).deck?.cards ?? [];
		expect(cards.map((card) => card.key)).toEqual(["reading", "resolver"]);
		expect(cards[1]).toBe(deck.cards[0]);
		const dropped = reconcile(state, deck.id, ["reading", "Reading"]);
		expect(ground(dropped).deck?.cards.map((card) => card.key)).toEqual([
			"reading",
		]);
		expect(ground(dropped).deck?.cards[0]?.id).toBe(cards[0]?.id);
	});

	test("an unchanged reconcile returns the same state", () => {
		const dealt = keyed(atText(), "a", "b");
		const deckId = ground(dealt).deck?.id ?? "";
		expect(reconcile(dealt, deckId, ["a", "a"], ["b", "b"])).toBe(dealt);
	});

	test("a Card open as a Sheet takes its new Subject, and keeps its slot", () => {
		const dealt = keyed(atText(), "step");
		const card = ground(dealt).deck?.cards[0];
		const covered = reduce(
			dealt,
			{
				type: "LiftCard",
				sheetId: ground(dealt).sheetId,
				presentationId: card?.id ?? "",
			},
			{ type: "Expand", paneId: ROOT },
		);
		const state = reconcile(covered, ground(covered).deck?.id ?? "", [
			"step",
			"Reading",
		]);
		expect(top(state).presentation).toMatchObject({
			id: card?.id,
			subject: { name: "Reading" },
		});
		expect(deckHolding(state.layout, card?.id ?? "")).not.toBeNull();
	});

	test("a Sheet whose key is dropped loses its slot, so going back closes it", () => {
		const dealt = keyed(atText(), "step");
		const covered = reduce(
			dealt,
			{
				type: "LiftCard",
				sheetId: ground(dealt).sheetId,
				presentationId: ground(dealt).deck?.cards[0]?.id ?? "",
			},
			{ type: "Expand", paneId: ROOT },
		);
		const state = reconcile(covered, ground(covered).deck?.id ?? "", [
			"reading",
			"Reading",
		]);
		expect(
			deckHolding(state.layout, top(state).presentation?.id ?? ""),
		).toBeNull();
		expect(top(state).presentation?.subject.name).toBe("step");
	});

	test("a swept or replaced Deck is not brought back", () => {
		const dealt = keyed(atText(), "a");
		const deckId = ground(dealt).deck?.id ?? "";
		const swept = reduce(dealt, {
			type: "Sweep",
			sheetId: ground(dealt).sheetId,
		});
		expect(reconcile(swept, deckId, ["a", "A"])).toBe(swept);
		const replaced = keyed(dealt, "b");
		expect(reconcile(replaced, deckId, ["a", "A"])).toBe(replaced);
	});

	test("duplicate keys are refused", () => {
		const dealt = keyed(atText(), "a");
		const deckId = ground(dealt).deck?.id ?? "";
		expect(reconcile(dealt, deckId, ["a", "A"], ["a", "B"])).toBe(dealt);
	});

	test("applies while a Card is in hand, and a cancel keeps the update", () => {
		const dealt = keyed(atText(), "a", "b");
		const deckId = ground(dealt).deck?.id ?? "";
		const lifted = reduce(dealt, {
			type: "LiftCard",
			sheetId: ground(dealt).sheetId,
			presentationId: ground(dealt).deck?.cards[0]?.id ?? "",
		});
		const updated = reconcile(
			lifted,
			deckId,
			["a", "A2"],
			["b", "b"],
			["c", "c"],
		);
		expect(updated.held?.presentation.subject.name).toBe("A2");
		const cancelled = reduce(updated, { type: "CancelGesture" });
		expect(
			ground(cancelled).deck?.cards.map((card) => card.subject.name),
		).toEqual(["A2", "b", "c"]);
		expect(ground(cancelled).deck?.cards.map((card) => card.id)).toEqual(
			ground(updated).deck?.cards.map((card) => card.id),
		);
	});
});

describe("serialisation", () => {
	test("the state survives a JSON round trip", () => {
		const state = reduce(floatingFromCard(), {
			type: "LiftFresh",
			paneId: ROOT,
			subject: note("Lemma"),
		});
		expect(JSON.parse(JSON.stringify(state))).toEqual(state);
	});
});

function never(): never {
	throw new Error("unreachable");
}
