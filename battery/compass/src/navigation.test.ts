import { describe, expect, test } from "bun:test";
import {
	createWorkspace,
	findPane,
	type PaneNode,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "./model";
import {
	type NavigationRung,
	type NavigationSheet,
	type NavigationTarget,
	planNavigation,
} from "./navigation";

type Subject = { readonly name: string };
type State = WorkspaceState<Subject>;
type Command = WorkspaceCommand<Subject>;

const ROOT = "root";

function reduce(state: State, ...commands: readonly Command[]): State {
	return commands.reduce(workspaceReducer<Subject>, state);
}

function pane(state: State): PaneNode<Subject> {
	const found = findPane(state.layout, ROOT);
	if (!found) throw new Error("no Pane");
	return found;
}

/** A Rooted Pane at Menu › Library › each of `rungs`. */
function at(...rungs: readonly string[]): State {
	const library = reduce(createWorkspace<Subject>({ paneId: ROOT }), {
		type: "StepUp",
		paneId: ROOT,
		to: { kind: "MenuItem", item: "library" },
	});
	return rungs.length
		? reduce(library, {
				type: "WalkLine",
				paneId: ROOT,
				keep: 0,
				to: rungs.map((name) => ({ name })),
			})
		: library;
}

function follow(state: State, ...names: readonly string[]): State {
	return reduce(
		state,
		...names.map(
			(name): Command => ({
				type: "FollowLink",
				paneId: ROOT,
				subject: { name },
			}),
		),
	);
}

/** Matching by Subject, as a fresh load does. */
const bySubject = (
	presentation: { readonly subject: Subject },
	sheet: NavigationSheet<Subject>,
) => presentation.subject.name === sheet.subject.name;

/** Matching by Presentation id, as Back and Forward do. */
const byId = (
	presentation: { readonly id: string },
	sheet: NavigationSheet<Subject>,
) => presentation.id === sheet.presentationId;

/** A target spelled as an address would: Menu › Library › rungs, then Covers. */
function target(
	rungs: readonly string[],
	covers: readonly string[] = [],
): NavigationTarget<Subject> {
	return {
		line: [
			{ kind: "Menu" },
			{ kind: "MenuItem", item: "library" },
			...rungs.map(
				(name): NavigationRung<Subject> => ({
					kind: "Sheet",
					sheet: { subject: { name } },
				}),
			),
		],
		covers: covers.map((name) => ({ subject: { name } })),
	};
}

/** What the Pane shows, as an address would spell it. */
function spelled(state: State): string {
	const p = pane(state);
	return [
		...p.line.map((rung) =>
			rung.kind === "Menu"
				? "Menu"
				: rung.kind === "MenuItem"
					? rung.item
					: rung.presentation.subject.name,
		),
		...p.covers.map((cover) => `+${cover.presentation.subject.name}`),
	].join(" › ");
}

function navigate(
	state: State,
	to: NavigationTarget<Subject>,
	same = bySubject,
): State {
	return reduce(state, ...planNavigation(state, ROOT, to, same));
}

/** The workspace with a Deck dealt on its top Sheet. */
function dealt(state: State, ...names: readonly string[]): State {
	const top = pane(state).covers.at(-1)?.id ?? pane(state).line.at(-1)?.id;
	if (!top) throw new Error("no top Sheet");
	return reduce(state, {
		type: "Deal",
		sheetId: top,
		selection: "click",
		cards: names.map((name) => ({ subject: { name } })),
	});
}

describe("planNavigation", () => {
	test("a Pane already at its target gets no commands", () => {
		const state = follow(at("Section", "Scroll"), "Lemma");
		expect(
			planNavigation(
				state,
				ROOT,
				target(["Section", "Scroll"], ["Lemma"]),
				bySubject,
			),
		).toEqual([]);
	});

	test("one Cover too many leaves as going back would, collapsing to its live Deck", () => {
		const withDeck = dealt(at("Scroll"), "Reading", "Lemma");
		const card = pane(withDeck).line.at(-1)?.deck?.cards[0];
		if (!card) throw new Error("no Card");
		const opened = reduce(
			withDeck,
			{
				type: "LiftCard",
				sheetId: pane(withDeck).line.at(-1)?.id ?? "",
				presentationId: card.id,
			},
			{ type: "Expand", paneId: ROOT },
		);
		const commands = planNavigation(
			opened,
			ROOT,
			target(["Scroll"]),
			bySubject,
		);
		expect(commands).toEqual([
			{ type: "GoBack", sheetId: pane(opened).covers[0]?.id ?? "" },
		]);
		const back = reduce(opened, ...commands);
		expect(pane(back).covers).toEqual([]);
		expect(pane(back).line.at(-1)?.deck?.frontId).toBe(card.id);
	});

	test("a Cover the Pane lacks is followed as a fresh Link, with no Deck", () => {
		const state = at("Scroll");
		const forward = navigate(
			state,
			target(["Scroll"], ["Lemma", "Source"]),
		);
		expect(spelled(forward)).toBe(
			"Menu › library › Scroll › +Lemma › +Source",
		);
		expect(pane(forward).covers.every((cover) => cover.deck === null)).toBe(
			true,
		);
	});

	test("a Ground below its target walks up the line in one step", () => {
		const commands = planNavigation(
			at("Series"),
			ROOT,
			target(["Series", "Season", "Scroll"]),
			bySubject,
		);
		expect(commands).toEqual([
			{
				type: "WalkLine",
				paneId: ROOT,
				keep: 1,
				to: [{ name: "Season" }, { name: "Scroll" }],
			},
		]);
	});

	test("a Ground on another branch steps down to what it shares, then walks", () => {
		const state = follow(at("Series", "Season 1", "Scroll 1"), "Lemma");
		const next = navigate(
			state,
			target(["Series", "Season 2", "Scroll 2"]),
		);
		expect(spelled(next)).toBe(
			"Menu › library › Series › Season 2 › Scroll 2",
		);
		expect(pane(next).line[2]?.id).toBe(pane(state).line[2]?.id);
	});

	test("the Menu and its Items are rungs like any other", () => {
		const menu = navigate(at("Scroll"), {
			line: [{ kind: "Menu" }],
			covers: [],
		});
		expect(spelled(menu)).toBe("Menu");
		const settings = navigate(menu, {
			line: [{ kind: "Menu" }, { kind: "MenuItem", item: "settings" }],
			covers: [],
		});
		expect(spelled(settings)).toBe("Menu › settings");
		const library = navigate(settings, target(["Scroll"], ["Lemma"]));
		expect(spelled(library)).toBe("Menu › library › Scroll › +Lemma");
	});

	test("the Sheets shared with the target keep their Decks", () => {
		const state = dealt(
			follow(dealt(at("Scroll"), "Reading"), "Lemma"),
			"Surface",
		);
		const next = navigate(state, target(["Scroll"], ["Lemma", "Source"]));
		expect(spelled(next)).toBe(
			"Menu › library › Scroll › +Lemma › +Source",
		);
		expect(pane(next).line.at(-1)?.deck).toEqual(
			pane(state).line.at(-1)?.deck,
		);
		expect(pane(next).covers[0]?.deck).toEqual(pane(state).covers[0]?.deck);
	});

	test("matching by id reopens a Sheet whose Presentation is gone, even with its Subject on top", () => {
		const state = follow(at("Scroll"), "Lemma");
		const lemma = pane(state).covers[0]?.presentation.id;
		const sheet = {
			subject: { name: "Lemma" },
			presentationId: "presentation-0",
		};
		const commands = planNavigation(
			state,
			ROOT,
			{ line: target(["Scroll"]).line, covers: [sheet] },
			byId,
		);
		const next = reduce(state, ...commands);
		expect(spelled(next)).toBe("Menu › library › Scroll › +Lemma");
		expect(pane(next).covers[0]?.presentation.id).not.toBe(lemma);
	});

	test("a target that is no Ground line, or a Pane that is not there, gets no commands", () => {
		const state = at("Scroll");
		expect(
			planNavigation(state, ROOT, { line: [], covers: [] }, bySubject),
		).toEqual([]);
		expect(
			planNavigation(
				state,
				ROOT,
				{ line: [{ kind: "Menu" }, { kind: "Menu" }], covers: [] },
				bySubject,
			),
		).toEqual([]);
		expect(
			planNavigation(
				state,
				ROOT,
				{
					line: [
						{ kind: "Menu" },
						{
							kind: "Sheet",
							sheet: { subject: { name: "Scroll" } },
						},
					],
					covers: [],
				},
				bySubject,
			),
		).toEqual([]);
		expect(planNavigation(state, "nowhere", target([]), bySubject)).toEqual(
			[],
		);
	});
});
