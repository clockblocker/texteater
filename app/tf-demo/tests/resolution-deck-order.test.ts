import { expect, test } from "bun:test";
import {
	createWorkspace,
	findPane,
	groundOf,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import type { Id } from "../convex/_generated/dataModel";
import {
	type ResolutionNote,
	resolutionDeckCards,
	segmentSelectionDeckCards,
} from "../src/views/resolution-deck";
import {
	type ApplicationWorkspaceStorage,
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "../src/workspace/application-workspace-persistence";
import type { WorkspaceCardTarget } from "../src/workspace/workspace-controller";
import {
	type WorkspaceSubject,
	workspaceSubjectFor,
} from "../src/workspace/workspace-subject";

/**
 * The order a click's Deck ends in, driven through the Compass as the
 * workspace drives it: the click's deal, the Resolution keeping its Deck up
 * to date, and a reload. Front first: the Reading in front, the Attestation
 * at the back, the Lemma and Surface between. Only the Cards whose step
 * says something are dealt (shared/click-story.ts); those keep this order,
 * and a Card once dealt is never taken back. Nothing a click carries
 * changes it; `segment-selection-deck.dom.test.tsx` clicks with Alt and
 * with the retired Route Note setting stored.
 */
const FRONT_FIRST = ["Reading", "Lemma", "Surface", "Attestation"];

const unitRoute = {
	language: "de" as const,
	family: "Lexeme" as const,
	kind: "VERB" as const,
};
type Steps = { attestation: boolean; surface: boolean; lemma: boolean };
const EVERY_STEP: Steps = { attestation: true, surface: true, lemma: true };
const NO_STEP: Steps = { attestation: false, surface: false, lemma: false };

function canonical(steps: Steps) {
	return {
		readingId: "reading-1" as Id<"readings">,
		lemmaId: "lemma-1" as Id<"lemmas">,
		surfaceLanguage: "de" as const,
		normalizedSurface: "verarbeiten",
		surfaceId: "surface-1" as Id<"surfaces">,
		attestationId: "attestation-1" as Id<"attestations">,
		steps,
	};
}

/** Grammar's reading of the clicked words: one Standard member, or as given. */
function grammar(
	members: NonNullable<ResolutionNote["grammar"]>["members"] = [
		{ attested: "verarbeiten", orthography: "Standard" },
	],
): ResolutionNote["grammar"] {
	return {
		grundform: true,
		members,
		valencyMembers: [],
		realizationCoverage: "Full",
		normalizedSurface: "verarbeiten",
		spelling: { kind: "Canonical" },
		canonicalForm: "verarbeiten",
		family: "Lexeme",
		kind: "VERB",
		coreFeatures: { hasSepPrefix: null, lexicallyReflexive: null },
	};
}

function note(
	lifecycle: ResolutionNote["lifecycle"],
	extra: Partial<ResolutionNote> = {},
): ResolutionNote {
	return {
		kind: "ResolutionNote",
		target: { kind: "Resolution", requestId: "request-1" },
		lifecycle,
		route: {
			textId: "text-1" as Id<"texts">,
			sentenceId: "sentence-1" as Id<"sentences">,
			stitchedText: "Wir verarbeiten Ihre Daten.",
			clickedSegmentIndex: 2,
			selectedSegment: "verarbeiten",
		},
		source: {
			segments: [
				{ kind: "ResolvableText", text: "Wir" },
				{ kind: "Whitespace", text: " " },
				{ kind: "ResolvableText", text: "verarbeiten" },
			],
			memberSegmentIndices: [2],
			textTitle: "Wir verarbeiten",
		},
		unit: { segments: [2], route: unitRoute },
		updatedAt: 1,
		...extra,
	};
}

const PROGRESS = [
	"Starting",
	"RouteAvailable",
	"GrammarAvailable",
	"ReadingAvailable",
	"Committing",
] as const;

/** A running Session at `progress`, Grammar's reading known from GrammarAvailable on. */
function running(
	progress: (typeof PROGRESS)[number],
	extra: Partial<ResolutionNote> = {},
	members?: Parameters<typeof grammar>[0],
) {
	const grammarKnown =
		progress !== "Starting" && progress !== "RouteAvailable";
	return note(
		{ state: "Active", progress, activity: "Running" },
		{ ...(grammarKnown ? { grammar: grammar(members) } : {}), ...extra },
	);
}

function complete(steps: Steps, extra: Partial<ResolutionNote> = {}) {
	return note(
		{
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
			attestationId: "attestation-1" as Id<"attestations">,
			readingId: "reading-1" as Id<"readings">,
			canonical: canonical(steps),
		},
		{ grammar: grammar(), ...extra },
	);
}

/** A fresh click on a unit of `unitSegments`, dealt as the click deals it. */
function click(unitSegments: number[]) {
	return deal(
		segmentSelectionDeckCards("request-1", {
			kind: "Resolving",
			requestId: "request-1",
			progress: "Starting",
			activity: "Scheduled",
			deduplicated: false,
			unitRoute,
			unitSegments,
		}),
	);
}

const roles = (state: WorkspaceState<WorkspaceSubject>) => order(state).roles;

function run(
	state: WorkspaceState<WorkspaceSubject>,
	...commands: WorkspaceCommand<WorkspaceSubject>[]
) {
	return commands.reduce(workspaceReducer, state);
}

function dealtCards(cards: readonly WorkspaceCardTarget[]) {
	return cards.map(({ key, target, presentationContext }) => ({
		key,
		subject: workspaceSubjectFor(target, presentationContext),
	}));
}

/** A Text on the first Pane's Ground, with the click's Cards dealt on it. */
function deal(cards: readonly WorkspaceCardTarget[]) {
	const start = run(
		createWorkspace<WorkspaceSubject>(),
		{
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "MenuItem", item: "library" },
		},
		{
			type: "StepUp",
			paneId: "pane-1",
			to: {
				kind: "Sheet",
				subject: {
					kind: "Text",
					target: { kind: "Text", textId: "text-1" },
				},
			},
		},
	);
	return run(start, {
		type: "Deal",
		sheetId: groundOf(pane(start)).id,
		selection: "sentence-1:2",
		cards: dealtCards(cards),
	});
}

function pane(state: WorkspaceState<WorkspaceSubject>) {
	const found = findPane(state.layout, "pane-1");
	if (!found) throw new Error("no pane");
	return found;
}

function deck(state: WorkspaceState<WorkspaceSubject>) {
	const dealt = groundOf(pane(state)).deck;
	if (!dealt) throw new Error("no Deck");
	return dealt;
}

/** The Deck's roles, front first, and whether a Card was brought forward. */
function order(state: WorkspaceState<WorkspaceSubject>) {
	const { cards, frontId } = deck(state);
	return {
		roles: cards.map(({ key }) => key?.split(":")[1]),
		frontId,
	};
}

function reconcile(
	state: WorkspaceState<WorkspaceSubject>,
	cards: readonly WorkspaceCardTarget[],
) {
	return run(state, {
		type: "ReconcileDeck",
		deckId: deck(state).id,
		cards: dealtCards(cards),
	});
}

function reload(state: WorkspaceState<WorkspaceSubject>) {
	const items = new Map<string, string>();
	const storage: ApplicationWorkspaceStorage = {
		getItem: (key) => items.get(key) ?? null,
		setItem: (key, value) => {
			items.set(key, value);
		},
	};
	saveApplicationWorkspace(state, storage);
	return loadApplicationWorkspace(
		() => {
			throw new Error("the saved workspace did not load");
		},
		new Set(["library", "settings"]),
		storage,
	);
}

test("a fresh click whose every step says something keeps the Deck's order while loading, at commit and after a reload", () => {
	const unit = { segments: [2, 4], route: unitRoute };
	let state = click([2, 4]);
	expect(order(state)).toEqual({
		roles: ["Reading", "Attestation"],
		frontId: null,
	});
	for (const progress of PROGRESS) {
		state = reconcile(
			state,
			resolutionDeckCards(running(progress, { unit })),
		);
		expect(order(state)).toEqual({
			roles: ["Reading", "Attestation"],
			frontId: null,
		});
	}
	state = reconcile(
		state,
		resolutionDeckCards(complete(EVERY_STEP, { unit })),
	);
	expect(order(state)).toEqual({ roles: FRONT_FIRST, frontId: null });
	expect(order(reload(state))).toEqual({
		roles: FRONT_FIRST,
		frontId: null,
	});
});

test("a plain dictionary-form word deals only its Reading, from the click to a reload", () => {
	let state = click([2]);
	expect(roles(state)).toEqual(["Reading"]);
	for (const progress of PROGRESS) {
		state = reconcile(state, resolutionDeckCards(running(progress)));
		expect(roles(state)).toEqual(["Reading"]);
	}
	state = reconcile(state, resolutionDeckCards(complete(NO_STEP)));
	expect(roles(state)).toEqual(["Reading"]);
	expect(roles(reload(state))).toEqual(["Reading"]);
});

test("a Surface or Lemma that says something joins at commit, in its place", () => {
	for (const [steps, expected] of [
		[{ ...NO_STEP, surface: true }, ["Reading", "Surface"]],
		[{ ...NO_STEP, lemma: true }, ["Reading", "Lemma"]],
		[
			{ ...NO_STEP, surface: true, lemma: true },
			["Reading", "Lemma", "Surface"],
		],
	] as const) {
		let state = click([2]);
		state = reconcile(state, resolutionDeckCards(running("Committing")));
		state = reconcile(state, resolutionDeckCards(complete(steps)));
		expect(roles(state)).toEqual([...expected]);
		expect(roles(reload(state))).toEqual([...expected]);
	}
});

test("Grammar's reading of a Typo deals the Attestation behind the Reading", () => {
	let state = click([2]);
	expect(roles(state)).toEqual(["Reading"]);
	const typo = [{ attested: "verarbieten", orthography: "Typo" as const }];
	state = reconcile(
		state,
		resolutionDeckCards(running("RouteAvailable", {}, typo)),
	);
	expect(roles(state)).toEqual(["Reading"]);
	state = reconcile(
		state,
		resolutionDeckCards(running("GrammarAvailable", {}, typo)),
	);
	expect(roles(state)).toEqual(["Reading", "Attestation"]);
	state = reconcile(
		state,
		resolutionDeckCards(
			complete(
				{ ...NO_STEP, attestation: true, lemma: true },
				{ grammar: grammar(typo) },
			),
		),
	);
	expect(roles(state)).toEqual(["Reading", "Lemma", "Attestation"]);
});

test("an Attestation dealt at the click is never taken back", () => {
	const unit = { segments: [2, 4], route: unitRoute };
	let state = click([2, 4]);
	for (const progress of PROGRESS)
		state = reconcile(
			state,
			resolutionDeckCards(running(progress, { unit })),
		);
	// Grammar read the clicked word alone, and the stored occurrence agrees.
	state = reconcile(state, resolutionDeckCards(complete(NO_STEP, { unit })));
	expect(roles(state)).toEqual(["Reading", "Attestation"]);
});

test("a click on a stored occurrence deals the Cards whose step says something, in order, and keeps them after a reload", () => {
	for (const [steps, expected] of [
		[EVERY_STEP, FRONT_FIRST],
		[NO_STEP, ["Reading"]],
		[{ ...NO_STEP, attestation: true }, ["Reading", "Attestation"]],
		[
			{ ...EVERY_STEP, lemma: false },
			["Reading", "Surface", "Attestation"],
		],
	] as const) {
		const state = deal(
			segmentSelectionDeckCards("request-2", {
				kind: "Available",
				canonical: canonical(steps),
			}),
		);
		expect(order(state)).toEqual({ roles: [...expected], frontId: null });
		expect(order(reload(state))).toEqual({
			roles: [...expected],
			frontId: null,
		});
	}
});
