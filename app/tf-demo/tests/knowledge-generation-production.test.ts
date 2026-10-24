import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import * as Effect from "effect/Effect";
import { api, internal } from "../convex/_generated/api";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import {
	effectiveRelationPublicationPolicy,
	generatedKnowledgeAllowedForPublication,
} from "../convex/model/generatedKnowledgeContainment";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import { createTestConvex } from "./support/convex";
import {
	addToDictionary,
	attempts,
	BANK_READING,
	generateWith,
	insertAccumulatedKnowledge,
	insertAttempt,
	type KnowledgeChange,
	logEvent,
	publish,
	publishArgs,
	rows,
	seedDictionaryReading,
	seedOccurrence,
	seedSecondOccurrence,
	stubProvider,
} from "./support/knowledge-generation";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("Full is a zero-call cache hit and generation keeps the complete German base mask", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await insertAttempt(t, occurrence, "already-full", { state: "Scheduled" });
	const provider = stubProvider(async () => {
		throw new Error("A Full attempt needs no model call.");
	});
	try {
		expect(
			await t.action(
				internal.knowledgeGenerationActions.runKnowledgeGeneration,
				{ attemptKey: "already-full" },
			),
		).toBeNull();
	} finally {
		provider.restore();
	}
	expect(provider.requests).toEqual([]);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "LostRace" }),
	]);
	expect(await rows(t, "knowledgeChanges")).toEqual([]);

	const request = generationRequestFor(BANK_READING, []);
	// The Knowledge call that creates the Reading proposes its frame; its plural
	// is the Lemma Paradigm's, which tf-demo doesn't request yet (#1232).
	expect(request).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
		valency: null,
	});
	expect(
		generationRequestFor(BANK_READING, [], {
			translationLanguages: ["ru"],
			topUpOnly: true,
		}),
	).toEqual({ translations: { ru: null } });
	const angst = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Angst",
			coreFeatures: { gender: "Fem" },
		},
		emojiDescription: "😨",
	} as const;
	// A top-up never proposes a frame; attested government travels beside it.
	expect(
		generationRequestFor(angst, [], {
			translationLanguages: [],
			topUpOnly: true,
		}),
	).toEqual({});
	// Only a Reading with no frame yet asks for one.
	expect(
		missingKnowledgeRequest(generationRequestFor(angst, []), {
			knowledge: {
				definition: "Furcht.",
				valency: [
					{
						status: "Optional",
						complements: [
							{
								kind: "Preposition",
								preposition: { canonicalForm: "vor" },
								governedCase: "Dat",
								referent: "Either",
							},
						],
					},
				],
			},
			checkedRelationKinds: [],
		}),
	).toEqual({
		transcription: null,
		translations: { en: null, ru: null },
	});
});

test("production publication remains empty without a reviewed verdict", () => {
	expect(effectiveRelationPublicationPolicy()).toMatchObject({
		artifactPath: null,
		qualifiedKinds: [],
		invalidationReasons: ["missingReviewedVerdictArtifact"],
	});
	const publishable = generatedKnowledgeAllowedForPublication({
		changes: [
			{
				kind: "Contribute",
				aspect: "transcription",
				value: "bank",
			},
			{
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [],
			},
			{
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		],
		pendingRelations: [
			{
				relation: "synonym",
				target: {
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Geldinstitut",
				},
			},
		],
	});

	expect(publishable).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "transcription",
				value: "bank",
			},
			{
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		],
		pendingRelations: [],
	});
});

test("the production application path keeps generated relations outside Dumdict", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "attempt-1");
	const result = await publish(
		t,
		publishArgs({
			attemptKey: "attempt-1",
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					value: [],
				},
			],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Geldinstitut",
					},
				},
			],
		}),
	);

	expect(result).toEqual({ status: "Committed" });
	expect(await rows(t, "knowledgeChanges")).toEqual([
		expect.objectContaining({
			knowledgeChangeKey: "attempt-1:1:1:0",
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		}),
	]);
	expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
	expect(await rows(t, "semanticRelationEdges")).toEqual([]);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Committed",
		publicationSequence: 1,
	});
});

test("Knowledge settings default enabled and persist independently per visitor", async () => {
	const t = createTestConvex();
	const defaults = defaultKnowledgeSettings();
	expect(defaults.semanticRelations.nearAntonym).toBe(true);
	expect(defaults.translations).toEqual({ en: true, ru: true });
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(defaults);
	const hiddenDefinition = { ...defaults, definition: false };
	expect(
		await t.mutation(api.knowledgeSettings.update, {
			visitorId: "visitor-1",
			settings: hiddenDefinition,
		}),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-2" }),
	).toEqual(defaults);

	expect(generationRequestFor(BANK_READING, []).definition).toBeNull();
});

test.each([false, true])(
	"the generation action publishes before a slow translation and retries failed publication (failure=%s)",
	async (failFirstPublication) => {
		// Nothing is scheduled here; the run is driven directly and polled.
		jest.useRealTimers();
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		// A Reading missing from the dictionary rejects the first publication,
		// a transient failure the final publication recovers from.
		if (!failFirstPublication) await addToDictionary(t, occurrence);
		await insertAttempt(t, occurrence, "progress", { state: "Scheduled" });
		const slow = Promise.withResolvers<void>();
		const firstPublication = Promise.withResolvers<void>();
		const errors = spyOn(console, "error").mockImplementation(
			(message: unknown) => {
				if (
					logEvent(message)?.event ===
					"KnowledgeContributionPublicationFailed"
				)
					firstPublication.resolve();
			},
		);
		const definition: KnowledgeChange = {
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		};
		const russian: KnowledgeChange = {
			kind: "Contribute",
			aspect: "translations",
			language: "ru",
			value: ["банк"],
		};
		const english: KnowledgeChange = {
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["bank"],
		};
		const transcription: KnowledgeChange = {
			kind: "Contribute",
			aspect: "transcription",
			value: "baŋk",
		};
		const committedChanges = () =>
			t.run((ctx) => ctx.db.query("knowledgeChanges").take(10));
		let finished = false;
		try {
			const running = generateWith(t, "progress", (_input, options) =>
				Effect.gen(function* () {
					// The finished leaves are handed on before the slow one,
					// in the run's fiber as Dumgen hands them.
					yield* options.onContribution([definition, russian]);
					yield* Effect.promise(() => slow.promise);
					return {
						failures: [],
						changes: [definition, russian, english, transcription],
						pendingRelations: [],
					};
				}),
			).then(() => {
				finished = true;
			});
			if (!failFirstPublication) {
				void (async () => {
					while (!finished && (await committedChanges()).length === 0)
						await Bun.sleep(1);
					firstPublication.resolve();
				})();
			}
			await firstPublication.promise;
			expect(finished).toBe(false);
			expect((await committedChanges()).length).toBeLessThan(3);
			expect((await attempts(t))[0]).toMatchObject({ state: "Running" });
			if (failFirstPublication) {
				expect(await committedChanges()).toEqual([]);
				await addToDictionary(t, occurrence);
			}
			slow.resolve();
			await running;
			// The final publication always carries every change; the mutation
			// drops what this run already published.
			const changes = await committedChanges();
			expect(changes).toHaveLength(4);
			const sequences = new Set(
				changes.map(
					({ knowledgeChangeKey }) =>
						knowledgeChangeKey.split(":")[2],
				),
			);
			expect(sequences.size).toBe(failFirstPublication ? 1 : 2);
			expect((await attempts(t))[0]).toMatchObject({
				state: "Committed",
			});
		} finally {
			slow.resolve();
			// The committed definition schedules its Definition Text; it
			// settles here, not in a later test's console.
			await t.finishAllScheduledFunctions(() => {});
			errors.mockRestore();
		}
	},
);

test.each([false, true])(
	"partial generation commits valid changes and retains its final trace (incremental=%s)",
	async (incremental) => {
		const t = createTestConvex();
		const occurrence = await seedDictionaryReading(t);
		await insertAttempt(t, occurrence, "partial");
		const change = {
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		};
		const evidence = {
			request: { definition: null, translations: { ru: null } },
			failures: [
				{
					aspect: "translations",
					leaf: "ru",
					code: "ProviderFailure",
					message: "offline",
				},
			],
			operationTraces: [
				JSON.stringify({
					operation: "produceKnowledge",
					outcome: "Partial",
					calls: [],
				}),
			],
		};
		if (incremental) {
			const intermediate = publishArgs({
				attemptKey: "partial",
				final: false,
				changes: [change],
				productionEvidence: {
					...evidence,
					failures: [],
					operationTraces: [],
				},
			});
			expect(await publish(t, intermediate)).toEqual({
				status: "Committed",
			});
			expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
				knowledge: { definition: "Ein Geldinstitut." },
				status: "Partial",
			});
			expect((await attempts(t))[0]).toMatchObject({
				state: "Running",
				publicationSequence: 1,
			});
			expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
			// A repeated contribution is deduplicated by content, not by sequence.
			expect(await publish(t, intermediate)).toEqual({
				status: "Committed",
			});
			expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
			expect(
				await publish(t, {
					...intermediate,
					relationPublication: {
						...intermediate.relationPublication,
						runNumber: 999,
					},
				}),
			).toEqual({ status: "Ignored" });
			expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
		}
		const result = await publish(
			t,
			publishArgs({
				attemptKey: "partial",
				changes: [change],
				productionEvidence: evidence,
			}),
		);
		expect(result.status).toBe("Committed");
		expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
		expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
			status: "Partial",
			knowledge: { definition: "Ein Geldinstitut." },
			coveredTranslationLanguages: [],
		});
		expect((await attempts(t))[0]).toMatchObject({
			state: "Failed",
			failureCode: "partialKnowledge",
		});
		expect((await rows(t, "knowledgeProductionRuns"))[0]).toMatchObject({
			outcome: "Partial",
			evidence,
		});
	},
);

test("a run's origin is New for the Reading's first occurrence and TopUp for a later one (#677, #883 point 5)", async () => {
	const t = createTestConvex();
	const first = await seedDictionaryReading(t);
	const second = await seedSecondOccurrence(t, first);
	await insertAttempt(t, first, "first", { state: "Scheduled" });
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "first",
		}),
	).toEqual(expect.objectContaining({ kind: "Generate", origin: "New" }));
	await insertAttempt(t, second, "second", { state: "Scheduled" });
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "second",
		}),
	).toEqual(expect.objectContaining({ kind: "Generate", origin: "TopUp" }));
});

test("a run whose every failure is a Catalog Miss records a growth signal and fails as catalogMiss (#883 point 8)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "miss", { state: "Scheduled" });
	await generateWith(t, "miss", () =>
		Effect.succeed({
			changes: [],
			pendingRelations: [],
			failures: [
				{
					aspect: "definition",
					code: "CatalogMiss",
					message:
						"The authored NOUN Bank has no reviewed definition",
				},
			],
		}),
	);
	expect(await rows(t, "catalogGrowthSignals")).toHaveLength(1);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "catalogMiss",
	});
});
