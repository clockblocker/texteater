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
 * at the back, the Lemma and Surface between.
 */
const FRONT_FIRST = ["Reading", "Lemma", "Surface", "Attestation"];

const unitRoute = {
	language: "de" as const,
	family: "Lexeme" as const,
	kind: "VERB" as const,
};
const canonical = {
	readingId: "reading-1" as Id<"readings">,
	lemmaId: "lemma-1" as Id<"lemmas">,
	surfaceLanguage: "de" as const,
	normalizedSurface: "verarbeiten",
	surfaceId: "surface-1" as Id<"surfaces">,
	attestationId: "attestation-1" as Id<"attestations">,
};

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

test("a fresh click's Deck keeps its order while loading, at commit and after a reload", () => {
	let state = deal(
		segmentSelectionDeckCards("request-1", {
			kind: "Resolving",
			requestId: "request-1",
			progress: "Starting",
			activity: "Scheduled",
			deduplicated: false,
			unitRoute,
		}),
	);
	expect(order(state)).toEqual({
		roles: ["Reading", "Attestation"],
		frontId: null,
	});

	for (const progress of [
		"Starting",
		"RouteAvailable",
		"GrammarAvailable",
		"ReadingAvailable",
		"Committing",
	] as const) {
		state = reconcile(
			state,
			resolutionDeckCards(
				note({ state: "Active", progress, activity: "Running" }),
			),
		);
		expect(order(state)).toEqual({
			roles: ["Reading", "Attestation"],
			frontId: null,
		});
	}

	state = reconcile(
		state,
		resolutionDeckCards(
			note({
				state: "Terminal",
				progress: "Committing",
				outcome: "Complete",
				attestationId: canonical.attestationId,
				target: { kind: "Reading", readingId: canonical.readingId },
				canonical,
			}),
		),
	);
	expect(order(state)).toEqual({ roles: FRONT_FIRST, frontId: null });
	expect(order(reload(state))).toEqual({
		roles: FRONT_FIRST,
		frontId: null,
	});
});

test("a click on a stored occurrence deals the same order, and keeps it after a reload", () => {
	const state = deal(
		segmentSelectionDeckCards("request-2", {
			kind: "Available",
			target: { kind: "Reading", readingId: canonical.readingId },
			canonical,
		}),
	);
	expect(order(state)).toEqual({ roles: FRONT_FIRST, frontId: null });
	expect(order(reload(state))).toEqual({
		roles: FRONT_FIRST,
		frontId: null,
	});
});
