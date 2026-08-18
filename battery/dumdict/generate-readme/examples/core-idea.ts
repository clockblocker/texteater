/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */

import type { Reading } from "dumling/types";
import {
	type Lemma,
	type LemmaRecord,
	makeSurfaceId,
	type ReadingEntry,
	type Surface,
	type SurfaceEntry,
} from "../../src";
import { getBootedUpDumdict } from "../../src/testing/boot";

const walkLemma = {
	canonicalForm: "walk",
	coreFeatures: {
		style: null,
		phrasal: null,
		hasGovPrep: null,
		extPos: null,
		abbr: null,
	},
	language: "en",
	family: "Lexeme",
	kind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

const runLemma = {
	...walkLemma,
	canonicalForm: "run",
};

const walkReading = {
	lemma: walkLemma,
	emojiDescription: "🚶",
} satisfies Reading<"en">;

const runReading = {
	lemma: runLemma,
	emojiDescription: "🏃",
} satisfies Reading<"en">;

const walkSurface = {
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
	surfaceKind: "Inflection",
	lemma: walkLemma,
	surfaceFeatures: null,
	spelling: "Canonical",
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

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

const serializedWalk = {
	schemaVersion: 1 as const,
	lemmaRecord: walkLemmaRecord,
	readingEntries: [walkReadingEntry],
	ownedSurfaceEntries: [walkSurfaceEntry],
	pendingRelations: [],
};

// README_BLOCK:service-lookup:start
const { dict: lookupDict } = getBootedUpDumdict("en", [serializedWalk]);

const walkReadings = await lookupDict.findStoredReadings({
	lemma: walkLemma,
});

const foundReadings = walkReadings.candidates.map(({ reading }) => reading);
// README_BLOCK:service-lookup:end

// README_BLOCK:quickstart-walk:start
const { dict, storage } = getBootedUpDumdict("en", [serializedWalk]);

const addRunResult = await dict.addNewNote({
	draft: {
		reading: runReading,
		note: {
			attestedTranslations: ["correr", "laufen"],
			attestations: ["They run before breakfast."],
			notes: "Core fast-motion sense.",
		},
	},
});

const storedRunReading = storage
	.loadAll()
	.flatMap(({ readingEntries }) => readingEntries)
	.find(
		({ reading }) =>
			reading.emojiDescription === runReading.emojiDescription,
	);
// README_BLOCK:quickstart-walk:end
