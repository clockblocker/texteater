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
	} & Pick<
		Parameters<typeof createTfDemoOrchestrator>[0],
		"draftKnowledge" | "draftGraceMs" | "observer"
	> = {},
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
		...(options.draftKnowledge
			? { draftKnowledge: options.draftKnowledge }
			: {}),
		...(options.draftGraceMs === undefined
			? {}
			: { draftGraceMs: options.draftGraceMs }),
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

function silencedConsole() {
	const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
	const error = jest.spyOn(console, "error").mockImplementation(() => {});
	return {
		warn,
		error,
		[Symbol.dispose]() {
			warn.mockRestore();
			error.mockRestore();
		},
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

/** A port whose Reading waits for `release` before answering 🏦. */
function slowReading(release: Promise<void>, started?: () => void) {
	return fakeResolution({
		reading: () =>
			Effect.promise(async () => {
				started?.();
				await release;
				return { decision: "New" as const, emojiDescription: "🏦" };
			}),
	}).resolution;
}

test("Knowledge drafts start from the Lemma before the Emoji Description and are handed to persistence with the new Reading", async () => {
	const draftStarted = Promise.withResolvers<void>();
	const emojiStarted = Promise.withResolvers<void>();
	const releaseDraft = Promise.withResolvers<void>();
	const releaseEmoji = Promise.withResolvers<void>();
	const readingAvailable = Promise.withResolvers<void>();
	const draft = {
		sourceFingerprint: "fixture",
		texts: [{ aspect: "definition" as const, text: "Ein Geldinstitut." }],
	};
	let emojiSettled = false;
	const run = setup({
		resolution: slowReading(
			releaseEmoji.promise.then(() => {
				emojiSettled = true;
			}),
			emojiStarted.resolve,
		),
		draftKnowledge: (input) =>
			Effect.tryPromise(async () => {
				expect(emojiSettled).toBe(false);
				expect(input.lemma).toEqual(lemma);
				expect("reading" in input).toBe(false);
				draftStarted.resolve();
				await releaseDraft.promise;
				return draft;
			}),
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				readingAvailable.resolve();
			},
		},
	});
	const pending = run.resolve({ grammatical: grammar });
	await Promise.all([draftStarted.promise, emojiStarted.promise]);
	expect(run.writes).toEqual([]);
	releaseEmoji.resolve();
	await readingAvailable.promise;
	expect(run.writes).toEqual([]);
	releaseDraft.resolve();
	await pending;
	expect(run.writes).toHaveLength(1);
	expect(JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null")).toEqual(
		draft,
	);
});

test("a new Reading commits after the draft grace with the leaves that finished", async () => {
	const finished = {
		aspect: "translations" as const,
		language: "en",
		text: "bank",
	};
	const run = setup({
		draftGraceMs: 20,
		draftKnowledge: ({ settle }) =>
			Effect.promise(
				() =>
					new Promise((resolve) =>
						settle.addEventListener("abort", () =>
							resolve({
								sourceFingerprint: "fixture",
								texts: [finished],
							}),
						),
					),
			),
	});
	const started = performance.now();
	await run.resolve({ grammatical: grammar });
	expect(performance.now() - started).toBeLessThan(1_000);
	expect(
		JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null").texts,
	).toEqual([finished]);
});

test("a draft that ignores the settle is dropped instead of holding the commit", async () => {
	let interrupted = false;
	const run = setup({
		draftGraceMs: 20,
		draftKnowledge: () =>
			Effect.never.pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						interrupted = true;
					}),
				),
			),
	});
	await run.resolve({ grammatical: grammar });
	expect(interrupted).toBe(true);
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
});

test("a Reading failure interrupts an in-flight Knowledge draft and hands nothing to persistence", async () => {
	let drafts = 0;
	let interrupted = false;
	const run = setup({
		resolution: fakeResolution({
			reading: () => Effect.fail(providerFailure("emoji failed")),
		}).resolution,
		draftKnowledge: () => {
			drafts++;
			return Effect.never.pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						interrupted = true;
					}),
				),
			);
		},
	});
	await expect(run.resolve({ grammatical: grammar })).rejects.toThrow(
		"emoji failed",
	);
	expect(drafts).toBe(1);
	expect(interrupted).toBe(true);
	expect(run.writes).toEqual([]);
});

test("failed Knowledge speculation does not fail Reading resolution", async () => {
	using _log = silencedConsole();
	const run = setup({ draftKnowledge: () => Effect.fail(Error("offline")) });
	await run.resolve({ grammatical: grammar });
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
});

test("a defective Knowledge draft is logged as a bug and does not fail Reading resolution", async () => {
	using log = silencedConsole();
	const run = setup({
		draftKnowledge: () => Effect.die(new TypeError("draft bug")),
	});
	await run.resolve({ grammatical: grammar });
	expect(run.writes).toHaveLength(1);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
	expect(log.error.mock.calls[0]?.[1]).toBeInstanceOf(TypeError);
	expect(log.warn).not.toHaveBeenCalled();
});

test("a reused Reading drops an unfinished Knowledge draft instead of waiting for it", async () => {
	let interrupted = false;
	const run = setup({
		candidates: [reading],
		draftKnowledge: () =>
			Effect.never.pipe(
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						interrupted = true;
					}),
				),
			),
	});
	await run.resolve({ grammatical: grammar });
	expect(interrupted).toBe(true);
	expect(run.writes[0]?.knowledgeDraftJson).toBeUndefined();
});

test("a reused Reading keeps a Knowledge draft that already finished", async () => {
	const draft = {
		sourceFingerprint: "fixture",
		texts: [{ aspect: "definition" as const, text: "Ein Geldinstitut." }],
	};
	const run = setup({
		candidates: [reading],
		draftKnowledge: () => Effect.succeed(draft),
	});
	await run.resolve({ grammatical: grammar });
	expect(JSON.parse(run.writes[0]?.knowledgeDraftJson ?? "null")).toEqual(
		draft,
	);
});

test("a failed Reading checkpoint prevents occurrence commit", async () => {
	const run = setup({
		candidates: [reading],
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				throw Error("Checkpoint unavailable");
			},
		},
	});
	await expect(run.resolve({ grammatical: grammar })).rejects.toThrow();
	expect(run.writes).toEqual([]);
});

test("the occurrence commit waits for the in-flight Reading checkpoint", async () => {
	const checkpoint = Promise.withResolvers<void>();
	let commitsWhenSaved: number | undefined;
	const run = setup({
		candidates: [reading],
		observer: {
			async grammarAvailable() {},
			async readingAvailable() {
				await checkpoint.promise;
				commitsWhenSaved = run.writes.length;
			},
		},
	});
	const outcome = run.resolve({ grammatical: grammar });
	await Bun.sleep(0);
	expect(run.writes).toEqual([]);
	checkpoint.resolve();
	await outcome;
	expect(commitsWhenSaved).toBe(0);
	expect(run.writes).toHaveLength(1);
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
