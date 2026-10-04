import { afterEach, expect, jest, test } from "bun:test";
import { ProviderFailure } from "dumgen";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import { applyTrustedReadingKnowledgeChange } from "../convex/model/readingKnowledge";
import {
	type ClickEncounter,
	type ClickGrammarInput,
	type ClickReadingInput,
	type ClickResolution,
	selectUnitOnly,
} from "../server/clickResolution";
import {
	createTfDemoOrchestrator,
	type OrchestrationPersistence,
	type ResolutionContext,
	type ReusableAttestation,
} from "../server/linguisticOrchestration";
import { parseResolvedGrammar } from "../server/resolutionGrammar";
import type { StoredUnit } from "../server/storedSegments";
import { createTestConvex, submitText } from "./support/convex";
import { startSession } from "./support/occurrences";

/*
 * The click orchestrator behind the ClickResolution port (#848): reuse,
 * checkpoints, commits and conflicts on its side, Grammar and the Reading's
 * Emoji Description on the port's. A fake port stands in for resolution;
 * production runs `selectUnitOnly`.
 */

afterEach(() => {
	jest.useRealTimers();
});

/** A failure the ClickResolution port may report. */
const providerFailure = (message: string) =>
	new ProviderFailure({ stage: "test", message });

const lemma: Dumling.Lemma<"de", "Lexeme", "NOUN"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};
const reading: Dumling.Reading<"de", "Lexeme", "NOUN"> = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "🏦",
};
const encounter: ClickEncounter = {
	sentence: {
		id: "sentence-1",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Banken" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
};
const attestation: Dumling.Attestation<"de", "Lexeme", "NOUN"> = {
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
const grammar = parseResolvedGrammar({ encounter, attestation });
const unit: StoredUnit = {
	segments: [0],
	route: { language: "de", family: "Lexeme", kind: "NOUN" },
};
const selection = {
	requestId: "request-1",
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 0,
};

/** The clicked Sentence `Banken`, with its one stored unit. */
function context(
	overrides: Partial<ResolutionContext> = {},
): ResolutionContext {
	return {
		reusable: null,
		lemmaCandidates: [],
		sentence: {
			sentenceId: "sentence-1",
			textId: "text-1",
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
function fakeResolution(
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

function setup(
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
				clickId: "click-1",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
				occurrence,
			};
		},
		async persistReusedResolvedClick() {
			return {
				status: "Reused",
				clickId: "click-2",
				attestationId: "attestation-1",
				readingId: "reading-1",
				deduplicated: false,
			};
		},
		async persistUnresolvedClick(input) {
			unresolved.push(input);
			return {
				status: "Unresolved",
				clickId: "click-1",
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

test("a click resolved through the port reaches one atomic commit, and a repeat click reuses it", async () => {
	const run = setup();
	const result = await run.resolve();
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.reading).toEqual(reading);
	expect(run.writes[0]?.occurrence.attestation).toEqual(attestation);
	expect(run.writes[0]?.occurrence.memberSegmentIndices).toEqual([0]);
	expect(run.writes[0]?.readingDecision).toBe("New");
	expect(result).toMatchObject({
		grammatical: { encounter },
		persisted: { status: "Committed" },
	});
	expect(run.fake.grammarInputs).toHaveLength(1);
	expect(run.fake.readingInputs).toHaveLength(1);

	await run.resolve();
	expect(run.writes).toHaveLength(1);
	expect(run.fake.grammarInputs).toHaveLength(1);
});

test("Grammar receives the clicked Sentence, its stored unit, the Lemma candidates and the neighbouring Sentences", async () => {
	const neighbours = { before: "Maria kommt.", after: "Sie winkt." };
	const run = setup({
		context: context({
			lemmaCandidates: [{ lemma, foundUnder: ["Banken"] }],
			neighbours,
		}),
	});
	await run.resolve();
	expect(run.fake.grammarInputs).toEqual([
		{
			sentence: {
				id: "sentence-1",
				language: "de",
				segments: [{ kind: "ResolvableText", text: "Banken" }],
			},
			clickedSegmentIndex: 0,
			unit,
			lemmaCandidates: [{ lemma, foundUnder: ["Banken"] }],
			neighbours,
		},
	]);
});

test("retry uses its exact Grammar checkpoint and asks only for the Reading", async () => {
	const run = setup();
	await run.resolve({ grammatical: grammar });
	expect(run.fake.grammarInputs).toEqual([]);
	expect(run.fake.readingInputs).toHaveLength(1);
	expect(run.writes[0]?.reading).toEqual(reading);
});

test("stored Reading candidates reach the port and a match is reused without a new Reading plan", async () => {
	const run = setup({ candidates: [reading] });
	const result = await run.resolve({ grammatical: grammar });
	expect(run.fake.readingInputs[0]?.candidates).toEqual(["🏦"]);
	expect(result).toMatchObject({ readingResolution: { decision: "Reuse" } });
	expect(run.writes[0]?.readingDecision).toBe("Reuse");
});

test("a globally resolved occurrence is reused without asking the port", async () => {
	const run = setup({
		context: context({
			sentence: null,
			reusable: {
				attestationId: "attestation-1",
				grammatical: grammar,
				reading,
			},
		}),
	});
	expect(await run.resolve()).toMatchObject({
		reused: true,
		persisted: { status: "Reused" },
	});
	expect(run.fake.grammarInputs).toEqual([]);
	expect(run.writes).toEqual([]);
});

test("Unresolved is durable; a late committed occurrence still wins", async () => {
	const unresolvedPort = fakeResolution({
		grammar: () =>
			Effect.succeed({
				decision: "Unresolved" as const,
				language: "de" as const,
			}),
	});
	const run = setup({ resolution: unresolvedPort.resolution });
	expect(await run.resolve()).toMatchObject({
		grammatical: { decision: "Unresolved" },
		persisted: { status: "Unresolved" },
	});
	expect(run.unresolved).toEqual([selection]);
	expect(run.writes).toEqual([]);

	const late = setup({
		resolution: unresolvedPort.resolution,
		persistence: {
			async persistUnresolvedClick() {
				return {
					status: "Reused",
					clickId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading,
					},
				};
			},
		},
	});
	expect(await late.resolve()).toMatchObject({ reused: true, reading });
});

test("a failure from either side of the port leaves no partial dictionary records", async () => {
	for (const resolution of [
		fakeResolution({
			grammar: () => Effect.fail(providerFailure("grammar failed")),
		}).resolution,
		fakeResolution({
			reading: () => Effect.fail(providerFailure("emoji failed")),
		}).resolution,
	]) {
		const run = setup({ resolution });
		await expect(run.resolve()).rejects.toThrow("failed");
		expect(run.writes).toEqual([]);
	}
});

test("a CatalogMiss from Grammar or Reading is returned without dictionary writes", async () => {
	const miss = {
		decision: "CatalogMiss" as const,
		stage: "resolveGrammar",
		route: "de/Lexeme/DET",
		message: "Missing reviewed DET",
	};
	for (const resolution of [
		fakeResolution({ grammar: () => Effect.succeed(miss) }).resolution,
		fakeResolution({ reading: () => Effect.succeed(miss) }).resolution,
	]) {
		const run = setup({ resolution });
		expect(await run.resolve()).toEqual({ catalogMiss: miss });
		expect(run.writes).toEqual([]);
	}
});

test("a mismatched Reading checkpoint fails before any write", async () => {
	const run = setup();
	await expect(
		run.resolve({
			grammatical: grammar,
			reading: {
				resolution: { decision: "New", emojiDescription: "🏦" },
				reading: { ...reading, emojiDescription: "🪑" },
			},
		}),
	).rejects.toThrow("does not match Grammar");
	expect(run.fake.readingInputs).toEqual([]);
	expect(run.writes).toEqual([]);
});

test("Knowledge changes validate against the exact tagged source Reading", () => {
	const first = applyTrustedReadingKnowledgeChange(reading, undefined, {
		kind: "Contribute",
		aspect: "definition",
		value: "Financial institution",
	});
	expect(first.definition).toBe("Financial institution");
	expect(() =>
		applyTrustedReadingKnowledgeChange(reading, first, {
			kind: "Contribute",
			aspect: "definition",
			value: "Bench",
		}),
	).toThrow("conflicts");
});

test("the commit carries the Reading as its ReadingAvailable progress and the run's record, in one write", async () => {
	const succeeded = { phase: "Commit" as const, generationEvents: [] };
	const asked: unknown[] = [];
	const run = setup({
		observer: {
			async grammarAvailable() {},
			committing(input) {
				asked.push(input);
				return { ...input, succeeded };
			},
		},
	});
	await run.resolve({ grammatical: grammar });
	expect(asked).toEqual([
		{
			readingAvailable: {
				reading,
				readingResolution: {
					decision: "New",
					emojiDescription: "🏦",
				},
			},
		},
	]);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.progress).toEqual({
		readingAvailable: {
			reading,
			readingResolution: { decision: "New", emojiDescription: "🏦" },
		},
		succeeded,
	});
});

test("a checkpointed Reading commits with the run's record and no ReadingAvailable progress", async () => {
	const run = setup({
		observer: {
			async grammarAvailable() {},
			committing: (input) => ({
				...input,
				succeeded: { phase: "Commit", generationEvents: [] },
			}),
		},
	});
	await run.resolve({
		grammatical: grammar,
		reading: {
			resolution: { decision: "New", emojiDescription: "🏦" },
			reading,
		},
	});
	expect(run.fake.readingInputs).toEqual([]);
	expect(run.writes[0]?.progress).toEqual({
		succeeded: { phase: "Commit", generationEvents: [] },
	});
});

test("the production stub selects the unit only: Unresolved, no Reading and no commit", async () => {
	const run = setup({ resolution: selectUnitOnly });
	expect(await run.resolve()).toMatchObject({
		grammatical: { decision: "Unresolved" },
		persisted: { status: "Unresolved" },
	});
	expect(run.unresolved).toEqual([selection]);
	expect(run.writes).toEqual([]);
});

test("a Resolution Session run on a unit intake left Unresolved ends Unresolved with no model call, and its Note shows the clicked unit", async () => {
	jest.useFakeTimers();
	const t = createTestConvex();
	const verb = { language: "de", family: "Lexeme", kind: "VERB" } as const;
	const particleVerb = {
		language: "de",
		family: "Locution",
		kind: "VERB",
	} as const;
	const { sentenceIds } = await submitText(
		t,
		[["Er", " ", "gibt", " ", "auf", "."]],
		{
			units: [
				[
					{ segments: [0], route: "Unresolved" },
					{
						segments: [2, 4],
						route: verb,
						variants: [verb, particleVerb],
					},
				],
			],
		},
	);
	const sentenceId = sentenceIds[0];
	if (!sentenceId) throw new Error("Expected a stored Sentence.");
	const guard = await startSession(t, {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 0,
	});
	// The click's context carries the Sentence's units to the port.
	const loaded = await t.query(internal.resolutionContext.load, {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 4,
	});
	expect(loaded.sentence?.units?.[1]).toEqual({
		segments: [2, 4],
		route: verb,
		variants: [verb, particleVerb],
	});
	jest.useRealTimers();

	const fetches: string[] = [];
	const previousFetch = globalThis.fetch;
	globalThis.fetch = (async (url: string | URL | Request) => {
		fetches.push(String(url));
		throw new Error("No model call is expected.");
	}) as typeof fetch;
	try {
		await t.action(internal.orchestration.runResolutionSession, guard);
	} finally {
		globalThis.fetch = previousFetch;
	}
	expect(fetches).toEqual([]);
	const note = await t.query(api.resolutionSessions.getResolutionNote, {
		requestId: "request-1",
	});
	expect(note?.lifecycle).toMatchObject({
		state: "Terminal",
		outcome: "Unresolved",
	});
	expect(note?.unit).toEqual({ segments: [0], route: "Unresolved" });
	expect(note?.source.memberSegmentIndices).toEqual([0]);
	expect(await t.run((ctx) => ctx.db.query("readings").collect())).toEqual(
		[],
	);
});

/** A click on a Sentence intake failed to segment: `Banken`, stored with no units. */
function failedSentenceRun(
	resegment: Parameters<typeof createTfDemoOrchestrator>[0]["resegment"],
) {
	const fake = fakeResolution();
	const stored: Parameters<
		NonNullable<OrchestrationPersistence["storeResegmentedSentence"]>
	>[0][] = [];
	let failed = true;
	const persistence: OrchestrationPersistence = {
		async loadResolutionContext() {
			const loaded = context();
			if (!failed || !loaded.sentence) return loaded;
			return {
				...loaded,
				sentence: {
					...loaded.sentence,
					units: [],
					segmentationFailed: true,
				},
			};
		},
		async storeResegmentedSentence(input) {
			stored.push(input);
			failed = false;
			return { clickedSegmentIndex: input.clickedSegmentIndex };
		},
		async persistResolvedClick() {
			throw new Error("No commit is expected.");
		},
		async persistReusedResolvedClick() {
			throw new Error("No reuse is expected.");
		},
		async persistUnresolvedClick() {
			throw new Error("No unresolved commit is expected.");
		},
	};
	const orchestrator = createTfDemoOrchestrator({
		resolution: {
			...fake.resolution,
			reading: () => Effect.fail(providerFailure("stop after grammar")),
		},
		findStoredReadings: () => Effect.succeed([]),
		persistence,
		...(resegment ? { resegment } : {}),
	});
	return { orchestrator, fake, stored };
}

test("a click on a Sentence intake failed to segment segments it again, stores its units, then resolves the unit", async () => {
	const resegmented: string[] = [];
	const run = failedSentenceRun((stitchedText) => {
		resegmented.push(stitchedText);
		return Effect.succeed({
			segments: [{ kind: "ResolvableText" as const, text: "Banken" }],
			units: [unit],
		});
	});
	const failure = await Effect.runPromise(
		Effect.flip(run.orchestrator.resolveSegment(selection)),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(resegmented).toEqual(["Banken"]);
	expect(run.stored).toEqual([
		{
			...selection,
			segments: [{ kind: "ResolvableText", text: "Banken" }],
			units: [unit],
		},
	]);
	// Grammar ran on the new unit.
	expect(run.fake.grammarInputs[0]?.unit).toEqual(unit);
});

test("a re-segmentation that fails again fails the click and stores nothing", async () => {
	const run = failedSentenceRun(() =>
		Effect.fail(providerFailure("jev is down")),
	);
	const failure = await Effect.runPromise(
		Effect.flip(run.orchestrator.resolveSegment(selection)),
	);
	expect(failure).toMatchObject({ message: "jev is down" });
	expect(run.stored).toEqual([]);
	expect(run.fake.grammarInputs).toEqual([]);
});

// A New refused as stale is judged again (ADR 0031 decision 6, #596).

test("a New the commit refuses as stale is judged again over the Lemma's Readings now, keeping its written description on a second NoMatch", async () => {
	const fake = fakeResolution({
		reading: (input) =>
			Effect.succeed({
				decision: "New" as const,
				emojiDescription: input.written ?? "🏦",
				candidates: input.candidates,
			}),
	});
	let commits = 0;
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick(input) {
				commits++;
				if (commits === 1)
					return { status: "StaleReading", candidates: ["🪑"] };
				return {
					status: "Committed",
					clickId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	const result = await run.resolve();
	expect(
		fake.readingInputs.map(({ candidates, written }) => ({
			candidates,
			written,
		})),
	).toEqual([
		{ candidates: [], written: undefined },
		{ candidates: ["🪑"], written: "🏦" },
	]);
	expect(commits).toBe(2);
	expect(result).toMatchObject({
		readingResolution: {
			decision: "New",
			emojiDescription: "🏦",
			candidates: ["🪑"],
		},
		persisted: { status: "Committed" },
	});
});

test("judged again, a stale New may reuse the Reading stored since, and commits it as a Reuse", async () => {
	const fake = fakeResolution({
		reading: (input) =>
			Effect.succeed(
				input.written === undefined
					? {
							decision: "New" as const,
							emojiDescription: "🏦",
							candidates: [],
						}
					: { decision: "Reuse" as const, emojiDescription: "🪑" },
			),
	});
	const decisions: unknown[] = [];
	let commits = 0;
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick(input) {
				decisions.push([
					input.readingDecision,
					input.reading.emojiDescription,
					input.readingCandidates,
				]);
				commits++;
				if (commits === 1)
					return { status: "StaleReading", candidates: ["🪑"] };
				return {
					status: "Committed",
					clickId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: grammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	await run.resolve();
	expect(decisions).toEqual([
		["New", "🏦", []],
		["Reuse", "🪑", undefined],
	]);
});

test("a click whose Lemma keeps gaining Readings stops after judging twice more", async () => {
	const fake = fakeResolution({
		reading: (input) =>
			Effect.succeed({
				decision: "New" as const,
				emojiDescription: "🏦",
				candidates: input.candidates,
			}),
	});
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick() {
				return { status: "StaleReading", candidates: ["🪑"] };
			},
		},
	});
	await expect(run.resolve()).rejects.toThrow("kept gaining Readings");
	expect(fake.readingInputs).toHaveLength(3);
});

test("a Foreign click asks no Reading: its one Reading has no Emoji Description (ADR 0045)", async () => {
	const foreignLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Foreign",
		kind: "Foreign",
		// A Foreign Surface is its Lemma's Canonical Form.
		canonicalForm: "Banken",
		coreFeatures: { sourceLang: "en" },
	} as const;
	const foreignEncounter: ClickEncounter = {
		...encounter,
		target: {
			family: "Foreign",
			kind: "Foreign",
			memberSegmentIndices: [0],
		},
	};
	const foreignGrammar = parseResolvedGrammar({
		encounter: foreignEncounter,
		attestation: {
			unitKind: "Attestation",
			members: [{ attested: "Banken", orthography: "Standard" }],
			realizationCoverage: "Full",
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: "Banken",
				spelling: { kind: "Canonical" },
				lemma: foreignLemma,
				surfaceFeatures: null,
			},
		},
	});
	const fake = fakeResolution({
		grammar: () => Effect.succeed(foreignGrammar),
	});
	const run = setup({
		resolution: fake.resolution,
		persistence: {
			async persistResolvedClick(input) {
				run.writes.push(input);
				return {
					status: "Committed",
					clickId: "click-1",
					attestationId: "attestation-1",
					readingId: "reading-1",
					deduplicated: false,
					occurrence: {
						attestationId: "attestation-1",
						grammatical: foreignGrammar,
						reading: input.reading,
					},
				};
			},
		},
	});
	const result = await run.resolve();
	expect(fake.readingInputs).toEqual([]);
	expect(run.writes[0]?.reading).toEqual({
		unitKind: "Reading",
		lemma: foreignLemma,
	});
	expect(run.writes[0]?.readingDecision).toBe("New");
	expect(run.writes[0]?.readingCandidates).toBeUndefined();
	expect(result).toMatchObject({ persisted: { status: "Committed" } });
});
