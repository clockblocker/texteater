import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import {
	type DefaultFunctionArgs,
	type FunctionReference,
	getFunctionName,
} from "convex/server";
import * as Effect from "effect/Effect";
import { internal } from "../convex/_generated/api";
import { RELATION_PUBLICATION_FINGERPRINTS } from "../convex/model/generatedKnowledgeContainment";
import { replaceAccumulatedKnowledge } from "../convex/model/shadows";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import type {
	KnowledgeInput,
	KnowledgeProduction,
} from "../server/knowledgeProduction";
import {
	HEBREW_READING,
	seedOccurrence as seedHebrewOccurrence,
} from "./knowledge-generation-fixtures";
import { actionContext, createTestConvex } from "./support/convex";
import {
	ANGST_READING,
	addToDictionary,
	attempts,
	BANK_READING_KEY,
	generateWith,
	insertAccumulatedKnowledge,
	insertAttempt,
	interceptPublish,
	type KnowledgeChange,
	logEvent,
	type Occurrence,
	PIZZA_READING,
	type PublishArgs,
	publish,
	publishArgs,
	rows,
	schedule,
	seedDictionaryReading,
	seedOccurrence,
} from "./support/knowledge-generation";
import { noModelCalls } from "./support/providers";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("Hebrew Knowledge passes action planning and publishes to its dictionary Reading", async () => {
	const t = createTestConvex();
	const occurrence = await seedHebrewOccurrence(t, HEBREW_READING);
	await t.run((ctx) =>
		ctx.db.patch(occurrence.sentenceId, { language: "he" }),
	);
	await addToDictionary(t, occurrence);
	await insertAttempt(t, occurrence, "hebrew", { state: "Scheduled" });
	const received: string[] = [];
	await generateWith(t, "hebrew", (input) => {
		received.push(input.reading.lemma.language);
		return Effect.succeed({
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "יצירה כתובה לקריאה.",
				},
				{
					kind: "Contribute",
					aspect: "hebrewParadigm",
					value: {
						forms: [
							{ form: "ספרים", features: { number: "Plur" } },
						],
					},
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["book"],
				},
			],
			pendingRelations: [],
			failures: [],
		});
	});
	expect(received).toEqual(["he"]);
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
	expect((await rows(t, "readingEntries"))[0]?.record).toMatchObject({
		knowledge: {
			definition: "יצירה כתובה לקריאה.",
			translations: { en: ["book"] },
		},
	});
	expect((await rows(t, "accumulatedKnowledge"))[0]?.ownerReadingKey).toBe(
		occurrence.readingKey,
	);
});

test("retry requests skip saved text and covered translations but retain missing leaves", () => {
	expect(
		missingKnowledgeRequest(
			{
				definition: null,
				transcription: null,
				translations: { en: null, ru: null },
			},
			{
				knowledge: {
					definition: "Ein Geldinstitut.",
					translations: { en: ["bank"], ru: [] },
				},
				checkedRelationKinds: [],
			},
		),
	).toEqual({ transcription: null, translations: { ru: null } });
	expect(
		missingKnowledgeRequest(
			{ definition: null },
			{ knowledge: {}, checkedRelationKinds: [] },
		),
	).toEqual({ definition: null });
});

test("intake attests no government, so a Full Reading with its translations demands no top-up", async () => {
	const input = (occurrence: Occurrence) => ({
		attemptKey: "government-top-up",
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t, ANGST_READING);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { translations: { en: ["fear"], ru: ["страх"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	// `segment.inUnits` attests no governed preposition, so "Angst vor
	// Hunden" leaves nothing for a Full Reading to top up.
	await schedule(t, input(occurrence));
	expect(await attempts(t)).toEqual([]);

	const covered = createTestConvex();
	const coveredOccurrence = await seedOccurrence(covered, ANGST_READING);
	await insertAccumulatedKnowledge(covered, coveredOccurrence, {
		knowledge: {
			translations: { en: ["fear"], ru: ["страх"] },
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
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await schedule(covered, input(coveredOccurrence));
	expect(await attempts(covered)).toEqual([]);
});

test("a Full Reading's plural occurrence schedules no Knowledge run: a later occurrence never changes a stored aspect (#883 point 5)", async () => {
	const pizzas = (grammaticalCase: string) => ({
		normalizedSurface: "Pizzas",
		inflectionalFeatures: {
			case: grammaticalCase,
			gender: null,
			number: "Plur",
		},
	});
	jest.useRealTimers();
	// Whatever the stored plural, its own or none, a plural Surface demands nothing.
	for (const stored of [["En"], ["En", "S"], "NoPlural", undefined]) {
		const t = createTestConvex();
		const occurrence = await seedOccurrence(
			t,
			PIZZA_READING,
			pizzas("Nom"),
		);
		await insertAccumulatedKnowledge(t, occurrence, {
			knowledge: {
				translations: { en: ["pizza"], ru: ["пицца"] },
				...(stored === undefined ? {} : { pluralPattern: stored }),
			},
			status: "Full" as const,
			coveredTranslationLanguages: ["en" as const, "ru" as const],
		});
		await schedule(t, {
			attemptKey: "plural-top-up",
			visitorId: "visitor-1",
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
		});
		expect(await attempts(t)).toEqual([]);
	}
});

test("a run that proposes an empty frame stores nothing and still completes the Reading", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "empty-frame", { state: "Scheduled" });
	const requests: KnowledgeInput["request"][] = [];
	await generateWith(t, "empty-frame", (input) => {
		requests.push(input.request);
		// No valency change: the proposed frame is empty.
		return Effect.succeed({
			failures: [],
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
				{
					kind: "Contribute",
					aspect: "transcription",
					value: "baŋk",
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "en",
					value: ["bank"],
				},
				{
					kind: "Contribute",
					aspect: "translations",
					language: "ru",
					value: ["банк"],
				},
			],
			pendingRelations: [],
		});
	});
	expect(Object.keys(requests[0] ?? {})).toContain("valency");
	const [accumulated] = await rows(t, "accumulatedKnowledge");
	expect(accumulated?.knowledge).not.toHaveProperty("valency");
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
});

test("a deployment without TF_KNOWLEDGE_PRODUCTION fails a run with the safe message and calls no model (#887)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "idle", { state: "Scheduled" });
	const errors = spyOn(console, "error").mockImplementation(() => {});
	const previousFlag = process.env.TF_KNOWLEDGE_PRODUCTION;
	delete process.env.TF_KNOWLEDGE_PRODUCTION;
	const models = noModelCalls();
	try {
		await t.action(
			internal.knowledgeGenerationActions.runKnowledgeGeneration,
			{ attemptKey: "idle" },
		);
	} finally {
		errors.mockRestore();
		models.restore();
		if (previousFlag !== undefined)
			process.env.TF_KNOWLEDGE_PRODUCTION = previousFlag;
	}
	expect(models.requests).toEqual([]);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
	expect(await rows(t, "knowledgeChanges")).toEqual([]);
});

test("existing requested content completes an empty generated batch and the first complete writer wins", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t, {
		knowledge: {
			definition: "canonical",
			translations: { en: ["bank"] },
		},
	});
	await insertAttempt(t, occurrence, "attempt-1");
	await insertAttempt(t, occurrence, "attempt-2");

	expect(await publish(t, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Committed",
	});
	expect(await publish(t, publishArgs({ attemptKey: "attempt-2" }))).toEqual({
		status: "AlreadyFull",
	});
	expect(await rows(t, "accumulatedKnowledge")).toEqual([
		expect.objectContaining({
			ownerReadingKey: BANK_READING_KEY,
			knowledge: {
				definition: "canonical",
				translations: { en: ["bank"] },
			},
			status: "Full",
		}),
	]);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			state: "Committed",
		}),
		expect.objectContaining({ attemptKey: "attempt-2", state: "LostRace" }),
	]);
});

test("commit-time relation blocking keeps base evidence and records publication failure", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "attempt-1");
	const relationPublication: PublishArgs["relationPublication"] = {
		runNumber: 1,
		requestedKinds: ["synonym"],
		artifactPath: "gate/verdict.json",
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		proposals: [
			{
				relation: "synonym",
				targetShadow: {
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Geldinstitut",
				},
			},
		],
	};
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
			relationPublication,
		}),
	);
	expect(result).toEqual({ status: "Committed" });
	// The blocked relation never reaches the dictionary: no pending Shadow, no edge.
	expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
	expect(await rows(t, "knowledgeChanges")).toEqual([
		expect.objectContaining({
			change: expect.objectContaining({ aspect: "definition" }),
		}),
	]);
	expect((await rows(t, "readingEntries"))[0]?.record).toMatchObject({
		knowledge: { definition: "Ein Geldinstitut." },
	});
	expect(await rows(t, "generatedRelationRuns")).toEqual([
		expect.objectContaining({
			relation: "synonym",
			generatedTargets: 1,
			publicationFailures: 1,
			directMatches: 0,
			pendingShadows: 0,
		}),
	]);
	expect(await rows(t, "generatedRelationProposals")).toEqual([
		expect.objectContaining({ outcome: "PublicationFailed" }),
	]);
});

test("manual writes never downgrade Full and failures persist only a safe category", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "winner" },
		status: "Full",
	});
	await insertAttempt(t, occurrence, "attempt-1");
	await t.run((ctx) =>
		replaceAccumulatedKnowledge(ctx, occurrence.readingKey, {
			definition: "manual",
		}),
	);
	await t.mutation(internal.knowledgeGeneration.fail, {
		attemptKey: "attempt-1",
		runNumber: 1,
		failureCode: "providerPayload",
		failureMessage: "secret provider response",
	});
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "manual" },
		status: "Full",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
});

test("a publication rejected after production keeps the run's aspect failures in its failure evidence", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "rejected", { state: "Scheduled" });
	const logged: unknown[] = [];
	const errors = spyOn(console, "error").mockImplementation((message) => {
		logged.push(logEvent(message));
	});
	const failures: KnowledgeProduction["failures"] = [
		{
			aspect: "translations",
			leaf: "ru",
			code: "ProviderFailure",
			message: "offline",
		},
	];
	try {
		await generateWith(
			t,
			"rejected",
			() =>
				Effect.succeed({
					failures,
					changes: [
						{
							kind: "Contribute",
							aspect: "definition",
							value: "Ein Geldinstitut.",
						},
					],
					pendingRelations: [],
				}),
			interceptPublish(t, async () => ({
				status: "Rejected",
				message: "Generated Knowledge could not be planned.",
			})),
		);
	} finally {
		errors.mockRestore();
	}
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "generationFailed",
	});
	expect((await rows(t, "knowledgeProductionRuns"))[0]).toMatchObject({
		outcome: "Failure",
		evidence: { failures },
	});
	expect(logged).toEqual([
		expect.objectContaining({
			event: "KnowledgeGenerationFailed",
			attemptKey: "rejected",
			runNumber: 1,
			phase: "Publish",
			errorName: "KnowledgePublicationRejected",
		}),
	]);
});

test("a failure recording that throws is logged as a structured line and leaves the run to the stale-run watchdog (#1032)", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "unrecorded", { state: "Scheduled" });
	const logged: unknown[] = [];
	const errors = spyOn(console, "error").mockImplementation((message) => {
		logged.push(logEvent(message));
	});
	const context = actionContext(t);
	const failingRecording = {
		...context,
		runMutation: (
			reference: FunctionReference<"mutation", "internal">,
			args: DefaultFunctionArgs,
		) =>
			getFunctionName(reference) ===
			getFunctionName(internal.knowledgeGeneration.fail)
				? Promise.reject(new Error("secret recording failure"))
				: context.runMutation(reference, args),
	};
	try {
		await expect(
			generateWith(
				t,
				"unrecorded",
				() => Effect.die(new Error("offline")),
				failingRecording,
			),
		).resolves.toBeNull();
	} finally {
		errors.mockRestore();
	}
	expect(logged).toEqual([
		expect.objectContaining({ event: "KnowledgeGenerationFailed" }),
		{
			event: "KnowledgeFailureRecordingFailed",
			attemptKey: "unrecorded",
			runNumber: 1,
			phase: "Produce",
			recordingFailure: {
				errorName: "Error",
				errorFingerprint: expect.stringMatching(/^fnv1a-/),
			},
			// Logged under the run's span, after its hop failed.
			span: {
				name: "Generate and publish Knowledge",
				id: expect.any(String),
			},
		},
	]);
	expect(JSON.stringify(logged)).not.toContain("secret recording failure");
	expect((await attempts(t))[0]).toMatchObject({
		state: "Running",
		runNumber: 1,
	});
	expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
});

test("an interrupted run records no failure and leaves the run to the stale-run watchdog", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "interrupted", { state: "Scheduled" });
	const errors = spyOn(console, "error").mockImplementation(() => {});
	try {
		await expect(
			generateWith(t, "interrupted", () => Effect.interrupt),
		).rejects.toBeDefined();
		expect(errors).not.toHaveBeenCalled();
	} finally {
		errors.mockRestore();
	}
	expect((await attempts(t))[0]).toMatchObject({
		state: "Running",
		runNumber: 1,
	});
	expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
});

test("each contribution's base text is published in order, one call each", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "in-order", { state: "Scheduled" });
	const incremental: PublishArgs["changes"][] = [];
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
	await generateWith(
		t,
		"in-order",
		(_input, { onContribution }) =>
			// The port's contract: one contribution at a time, each awaited.
			Effect.gen(function* () {
				yield* onContribution([definition]);
				yield* onContribution([russian]);
				yield* onContribution([english]);
				return {
					failures: [],
					changes: [definition, russian, english],
					pendingRelations: [],
				};
			}),
		interceptPublish(t, async (args, commit) => {
			if (!args.final) incremental.push(args.changes);
			return commit();
		}),
	);
	expect(incremental).toEqual([[definition], [russian], [english]]);
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
});
