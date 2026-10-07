/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */
import type * as Dumling from "dumling/types";

import {type LemmaRecord,makeSurfaceId,type ReadingEntry,type SurfaceEntry} from "../../src";
import {createDumdictPlanner,type ReadingEntryContext} from "../../src/planning";

const walkLemma = {unitKind: "Lemma" as const,
	canonicalForm: "walk",
	coreFeatures: {
		phrasal: null,
		extPos: null,
		abbr: null,
	},
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Dumling.Lemma<"en", "Lexeme", "VERB">;

const runLemma = {
	...walkLemma,
	canonicalForm: "run",
};

const walkReading = {unitKind: "Reading" as const,
	lemma: walkLemma,
	emojiDescription: "🚶",
} satisfies Dumling.Reading<"en">;

const runReading = {unitKind: "Reading" as const,
	lemma: runLemma,
	emojiDescription: "🏃",
} satisfies Dumling.Reading<"en">;

const walkSurface = {unitKind: "Surface" as const,
	inflectionalFeatures: {
		mood: null,
		number: null,
		person: null,
		tense: "Pres",
		verbForm: "Fin",
		voice: null,
	},
	language: "en",
	normalizedSurface: "walk",

	lemma: walkLemma,
	surfaceFeatures: null,
	spelling: { kind: "Canonical" },
} satisfies Dumling.Surface<"en", "Lexeme", "VERB">;

// README_BLOCK:english-walk-entry-record:start
const walkLemmaRecord = {
	lemma: walkLemma,
} satisfies LemmaRecord<"en">;
// README_BLOCK:english-walk-entry-record:end

// README_BLOCK:english-walk-reading-entry:start
const walkReadingEntry = {
	reading: walkReading,
	attestedTranslations: ["caminar", "gehen"],
	attestations: ["They walk home together."],
	notes: "Core motion sense.",
} satisfies ReadingEntry<"en">;
// README_BLOCK:english-walk-reading-entry:end

// README_BLOCK:english-walk-surface-entry:start
const walkSurfaceEntry = {
	id: makeSurfaceId("en", walkSurface),
	surface: walkSurface,
	ownerLemma: walkLemma,
	attestedTranslations: ["walk"],
	attestations: ["They walk home together."],
	notes: "Present finite surface.",
} satisfies SurfaceEntry<"en">;
// README_BLOCK:english-walk-surface-entry:end

// README_BLOCK:planner-context:start
const planner = createDumdictPlanner("en");

const runRequest = {
	draft: {
		reading: runReading,
		note: {
			attestedTranslations: ["correr", "laufen"],
			attestations: ["They run before breakfast."],
			notes: "Core fast-motion sense.",
		},
	},
};

// The host reads exactly this slice from its store, inside its transaction.
const sliceRequest = planner.contextRequest({
	intent: "addNewNote",
	request: runRequest,
});

const runContext = {
	intent: "addNewNote",
	revision: "rev-7",
	existingOwnedSurfaces: [],
	explicitExistingLemmaTargets: [],
	exactPendingRelations: [],
	pendingRelationsMatchingProposedLemma: [],
	relationLemmas: [walkLemmaRecord],
	relationReadings: [walkReadingEntry],
} satisfies ReadingEntryContext<"en">;
// README_BLOCK:planner-context:end

// README_BLOCK:quickstart-run:start
const outcome = planner.addNewNote(runContext, runRequest);

if (outcome.status === "planned") {
	// Apply every change in order, checking its preconditions, in the same
	// transaction that loaded runContext.
	const changeTypes = outcome.plan.changes.map(({ type }) => type);
	// ["createLemma", "createReading"]
} else {
	// "rejected" (e.g. readingAlreadyExists) or "conflict"
	const refusal = outcome.code;
}
// README_BLOCK:quickstart-run:end
