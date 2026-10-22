import { ProviderFailure } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type {
	ClickEncounter,
	ClickGrammarInput,
	ClickReadingInput,
	ClickResolution,
} from "../../server/clickResolution";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type ResolutionContext,
	type ReusableAttestation,
} from "../../server/linguisticOrchestration";
import { parseResolvedGrammar } from "../../server/resolutionGrammar";
import type { StoredUnit } from "../../server/storedSegments";

/*
 * Fixtures for the click orchestrator's tests: the clicked Sentence `Banken`,
 * its Grammar and Reading, a fake ClickResolution port and in-memory
 * persistence.
 */

/** A failure the ClickResolution port may report. */
export const providerFailure = (message: string) =>
	new ProviderFailure({ stage: "test", message });

export const lemma: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};
export const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "🏦",
};
export const encounter: ClickEncounter = {
	sentence: {
		id: "sentence-1",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Banken" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
};
export const attestation: Dumling.Attestation<"de", "Lexeme", "NOUN"> = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: "Banken",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur", gender: null },
	},
	realizationCoverage: "Full",
	articleEvidence: null,
	valencyEvidence: [],
	members: [{ attested: "Banken", orthography: "Standard" }],
};
export const grammar = parseResolvedGrammar({ encounter, attestation });
export const unit: StoredUnit = {
	segments: [0],
	route: { language: "de", family: "Lexeme", kind: "NOUN" },
};
export const selection = {
	requestId: "request-1",
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 0,
};

/** The clicked Sentence `Banken`, with its one stored unit. */
export function context(
	overrides: Partial<ResolutionContext> = {},
): ResolutionContext {
	return {
		reusable: null,
		lemmaCandidates: [],
		sentence: {
			sentenceId: "sentence-1",
			scrollId: "text-1",
			segmentedSentenceId: "sentence-1",
			language: "de",
			stitchedText: "Banken",
			segments: [{ index: 0, kind: "ResolvableText", text: "Banken" }],
			units: [unit],
		},
		...overrides,
	};
}

/**
 * A ClickResolution that resolves `Banken` and records every call: Grammar
 * names the occurrence, and Reading reuses a stored 🏦 or makes a new one.
 */
export function fakeResolution(
	overrides: {
		readonly grammar?: ClickResolution["grammar"];
		readonly reading?: ClickResolution["reading"];
	} = {},
) {
	const grammarInputs: ClickGrammarInput[] = [];
	const readingInputs: ClickReadingInput[] = [];
	const resolution: ClickResolution = {
		grammar: (input) => {
			grammarInputs.push(input);
			return overrides.grammar?.(input) ?? Effect.succeed(grammar);
		},
		reading: (input) => {
			readingInputs.push(input);
			return (
				overrides.reading?.(input) ??
				Effect.succeed({
					decision: input.candidates.includes("🏦")
						? ("Reuse" as const)
						: ("New" as const),
					emojiDescription: "🏦",
				})
			);
		},
	};
	return { resolution, grammarInputs, readingInputs };
}

export function setup(
	options: {
		readonly resolution?: ClickResolution;
		readonly persistence?: Partial<OrchestrationPersistence>;
		readonly candidates?: Dumling.Reading<"de">[];
		readonly context?: ResolutionContext;
	} & Pick<Parameters<typeof createTfDemoOrchestrator>[0], "observer"> = {},
) {
	const fake = fakeResolution();
	const writes: Parameters<
		OrchestrationPersistence["persistResolvedClick"]
	>[0][] = [];
	const unresolved: Parameters<
		OrchestrationPersistence["persistUnresolvedClick"]
	>[0][] = [];
	let occurrence: ReusableAttestation | null = null;
	const persistence: OrchestrationPersistence = {
		async loadResolutionContext() {
			return options.context ?? context({ reusable: occurrence });
		},
		async persistResolvedClick(input) {
			writes.push(input);
			occurrence = {
				attestationId: "attestation-1",
				grammatical: parseResolvedGrammar({
					encounter,
					attestation: input.occurrence.attestation,
				}),
				reading: input.reading,
			};
			return {
				status: "Committed",
				encounterId: "click-1",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
				occurrence,
			};
		},
		async persistReusedResolvedClick() {
			return {
				status: "Reused",
				encounterId: "click-2",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
			};
		},
		async persistUnresolvedClick(input) {
			unresolved.push(input);
			return {
				status: "Unresolved",
				encounterId: "click-1",
				deduplicated: false,
			};
		},
		...options.persistence,
	};
	const orchestrator = createTfDemoOrchestrator({
		resolution: options.resolution ?? fake.resolution,
		findStoredReadings: () => Effect.succeed(options.candidates ?? []),
		persistence,
		...(options.observer ? { observer: options.observer } : {}),
	});
	return {
		resolve: (
			checkpoints?: Parameters<typeof orchestrator.resolveSegment>[1],
		) =>
			Effect.runPromise(
				orchestrator.resolveSegment(selection, checkpoints),
			),
		fake,
		writes,
		unresolved,
	};
}
