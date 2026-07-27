/** biome-ignore-all lint/correctness/noUnusedVariables: README example file */
import {
	type Lemma,
	type LemmaEntry,
	makeDumlingIdFor,
	type Surface,
	type SurfaceEntry,
} from "../../src";
import { getBootedUpDumdict } from "../../src/testing/boot";

const walkLemma = {
	canonicalLemma: "walk",
	inherentFeatures: {},
	language: "en",
	lemmaKind: "Lexeme",
	meaningInEmojis: "walk-as-motion",
	lemmaSubKind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

const runLemma = {
	canonicalLemma: "run",
	inherentFeatures: {},
	language: "en",
	lemmaKind: "Lexeme",
	meaningInEmojis: "run-as-motion",
	lemmaSubKind: "VERB",
} satisfies Lemma<"en", "Lexeme", "VERB">;

const walkSurface = {
	inflectionalFeatures: {
		tense: "Pres",
		verbForm: "Fin",
	},
	language: "en",
	normalizedFullSurface: "walk",
	surfaceKind: "Inflection",
	lemma: walkLemma,
} satisfies Surface<"en", "Inflection", "Lexeme", "VERB">;

// README_BLOCK:english-walk-lemma-entry:start
const walkEntry = {
	id: makeDumlingIdFor("en", walkLemma),
	lemma: walkLemma,
	lexicalRelations: {},
	morphologicalRelations: {},
	attestedTranslations: ["caminar", "gehen"],
	attestations: ["They walk home together."],
	notes: "Core motion verb.",
} satisfies LemmaEntry<"en">;
// README_BLOCK:english-walk-lemma-entry:end

// README_BLOCK:english-walk-surface-entry:start
const walkSurfaceEntry = {
	id: makeDumlingIdFor("en", walkSurface),
	surface: walkSurface,
	ownerLemmaId: walkEntry.id,
	attestedTranslations: ["walk"],
	attestations: ["They walk home together."],
	notes: "Present finite surface.",
} satisfies SurfaceEntry<"en">;
// README_BLOCK:english-walk-surface-entry:end

// README_BLOCK:service-lookup:start
const { dict: lookupDict } = getBootedUpDumdict("en", [
	{
		lemmaEntry: walkEntry,
		ownedSurfaceEntries: [walkSurfaceEntry],
		pendingRelations: [],
	},
]);

const walkSenses = await lookupDict.findStoredLemmaSenses({
	lemmaDescription: {
		language: "en",
		canonicalLemma: "walk",
		lemmaKind: "Lexeme",
		lemmaSubKind: "VERB",
	},
});

const foundLemmaIds = walkSenses.candidates.map(({ lemmaId }) => lemmaId);
// README_BLOCK:service-lookup:end

// README_BLOCK:quickstart-walk:start
const { dict, storage } = getBootedUpDumdict("en", [
	{
		lemmaEntry: walkEntry,
		ownedSurfaceEntries: [walkSurfaceEntry],
		pendingRelations: [],
	},
]);

const addRunResult = await dict.addNewNote({
	draft: {
		lemma: runLemma,
		note: {
			attestedTranslations: ["correr", "laufen"],
			attestations: ["They run before breakfast."],
			notes: "Core fast-motion verb.",
		},
	},
});

const storedRunNote = storage
	.loadAll()
	.find(({ lemmaEntry }) => lemmaEntry.id === makeDumlingIdFor("en", runLemma));
// README_BLOCK:quickstart-walk:end
