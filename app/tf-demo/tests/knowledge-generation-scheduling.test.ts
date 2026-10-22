import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { KNOWLEDGE_RETRY_COOLDOWN_MS } from "../convex/model/knowledgeAttempts";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";
import {
	ANGST_READING,
	attempts,
	BANK_READING_KEY,
	insertAccumulatedKnowledge,
	insertAttempt,
	type Occurrence,
	PIZZA_READING,
	queued,
	schedule,
	scheduledAttempts,
	seedDictionaryReading,
	seedOccurrence,
} from "./support/knowledgeGeneration";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
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

test("scheduling is exact, idempotent, skips Full, and retries Failed", async () => {
	const inputFor = (occurrence: Occurrence, attemptKey: string) => ({
		attemptKey,
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});

	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	const input = inputFor(occurrence, "request-1");
	await schedule(t, input);
	await schedule(t, input);
	expect(await scheduledAttempts(t)).toEqual(queued("request-1"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "request-1",
			ownerReadingKey: BANK_READING_KEY,
			state: "Scheduled",
		}),
	]);
	const loaded = await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: "request-1",
	});
	expect(loaded).toEqual(
		expect.objectContaining({
			kind: "Generate",
			reading: expect.objectContaining({ emojiDescription: "🏦" }),
			encounter: expect.objectContaining({
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [0],
				},
			}),
			attestation: expect.objectContaining({ unitKind: "Attestation" }),
		}),
	);
	expect(JSON.stringify(loaded)).toContain("Bank");
	expect(JSON.stringify(loaded)).toContain("am Fluss");

	const otherReadingId = await t.run((ctx) =>
		ctx.db.insert("readings", {
			readingKey: "reading-other",
			lemmaId: occurrence.lemmaId,
			emojiDescription: "🪑",
		}),
	);
	await expect(
		schedule(t, { ...input, readingId: otherReadingId }),
	).rejects.toThrow("exact saved occurrence");

	const full = createTestConvex();
	const fullOccurrence = await seedOccurrence(full);
	await insertAccumulatedKnowledge(full, fullOccurrence, {
		knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await schedule(full, inputFor(fullOccurrence, "full-request"));
	expect(await scheduledAttempts(full)).toEqual([]);
	expect(await attempts(full)).toEqual([]);

	const supplement = createTestConvex();
	const supplementOccurrence = await seedOccurrence(supplement);
	await insertAccumulatedKnowledge(supplement, supplementOccurrence, {
		knowledge: { translations: { en: ["bank"] } },
		status: "Full",
		coveredTranslationLanguages: ["en"],
	});
	await schedule(
		supplement,
		inputFor(supplementOccurrence, "russian-supplement"),
	);
	expect(
		await supplement.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "russian-supplement",
		}),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			translationLanguages: ["ru"],
			topUpOnly: true,
			government: [],
		}),
	);

	const retry = createTestConvex();
	const retryOccurrence = await seedOccurrence(retry);
	await retry.run((ctx) =>
		ctx.db.insert("visitorEncounters", {
			requestId: "click-request",
			visitorId: "visitor-1",
			scrollId: retryOccurrence.scrollId,
			sentenceId: retryOccurrence.sentenceId,
			segmentId: retryOccurrence.segmentId,
			attestationId: retryOccurrence.attestationId,
			encounteredAt: 1,
		}),
	);
	await insertAttempt(retry, retryOccurrence, "retry-request", {
		state: "Failed",
		failureCode: "generationFailed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
	await retry.mutation(internal.knowledgeGeneration.retry, {
		attemptKey: "retry-request",
		visitorId: "visitor-1",
		readingId: retryOccurrence.readingId,
		attestationId: retryOccurrence.attestationId,
	});
	expect(await scheduledAttempts(retry)).toEqual(queued("retry-request"));
	const [retried] = await attempts(retry);
	expect(retried).toEqual(expect.objectContaining({ state: "Scheduled" }));
	expect(retried).not.toHaveProperty("failureMessage");
});

test("a repeated demand reruns a Failed attempt only after its cooldown, unless it was interrupted", async () => {
	const demandAgain = async (failureCode: string) => {
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		await insertAttempt(t, occurrence, "failed", {
			state: "Failed",
			failureCode,
			failureMessage: "Knowledge generation failed. Please retry.",
			createdAt: Date.now(),
		});
		await schedule(t, {
			attemptKey: "failed",
			visitorId: "visitor-1",
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
		});
		return t;
	};

	const failed = await demandAgain("generationFailed");
	expect(await scheduledAttempts(failed)).toEqual([]);
	expect((await attempts(failed))[0]).toMatchObject({ state: "Failed" });

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	const [attempt] = await attempts(failed);
	if (!attempt) throw new Error("Expected the Failed attempt.");
	await schedule(failed, {
		attemptKey: "failed",
		visitorId: "visitor-1",
		readingId: attempt.readingId,
		attestationId: attempt.attestationId,
	});
	expect(await scheduledAttempts(failed)).toEqual(queued("failed"));
	expect((await attempts(failed))[0]).toMatchObject({ state: "Scheduled" });

	const interrupted = await demandAgain("interrupted");
	expect(await scheduledAttempts(interrupted)).toEqual(queued("failed"));
	expect((await attempts(interrupted))[0]).toMatchObject({
		state: "Scheduled",
	});
});

test("a second Knowledge demand for the same Reading waits for the active attempt", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	const input = {
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	};

	await schedule(t, { ...input, attemptKey: "resolution-request" });
	await schedule(t, { ...input, attemptKey: "coverage-request" });

	expect(await scheduledAttempts(t)).toEqual(queued("resolution-request"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "resolution-request",
			state: "Scheduled",
		}),
		expect.objectContaining({
			attemptKey: "coverage-request",
			state: "Waiting",
		}),
	]);
});

test("settling an active Knowledge attempt schedules the next waiting demand", async () => {
	const settle = async (failureCode: string) => {
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		await insertAttempt(t, occurrence, "resolution-request");
		await insertAttempt(t, occurrence, "coverage-request", {
			state: "Waiting",
			createdAt: 2,
		});
		await t.mutation(internal.knowledgeGeneration.fail, {
			attemptKey: "resolution-request",
			runNumber: 1,
			failureCode,
			failureMessage: "failed",
		});
		return t;
	};

	// An interrupted run never reached the model, so the next demand starts.
	const interrupted = await settle("interrupted");
	expect(await scheduledAttempts(interrupted)).toEqual(
		queued("coverage-request"),
	);
	expect(await attempts(interrupted)).toEqual([
		expect.objectContaining({
			attemptKey: "resolution-request",
			state: "Failed",
		}),
		expect.objectContaining({
			attemptKey: "coverage-request",
			state: "Scheduled",
		}),
	]);

	// Any other failure holds the next demand until the cooldown ends.
	const failed = await settle("generationFailed");
	expect(await scheduledAttempts(failed)).toEqual([]);
	expect((await attempts(failed))[1]).toMatchObject({ state: "Waiting" });
	const promotions = (
		await failed.run((ctx) =>
			ctx.db.system.query("_scheduled_functions").collect(),
		)
	).filter(({ name }) => name === "knowledgeGeneration:promoteWaiting");
	expect(promotions).toEqual([
		expect.objectContaining({
			args: [{ ownerReadingKey: BANK_READING_KEY }],
			scheduledTime: Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS,
		}),
	]);

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	await failed.mutation(internal.knowledgeGeneration.promoteWaiting, {
		ownerReadingKey: BANK_READING_KEY,
	});
	expect(await scheduledAttempts(failed)).toEqual(queued("coverage-request"));
	expect((await attempts(failed))[1]).toMatchObject({ state: "Scheduled" });
});

test("a Reading cooling down after a failure starts no run for a demand under any attemptKey", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAttempt(t, occurrence, "first-click", {
		state: "Failed",
		failureCode: "generationFailed",
		failureMessage: "Knowledge generation failed. Please retry.",
		createdAt: Date.now(),
	});
	const demand = (attemptKey: string) =>
		schedule(t, {
			attemptKey,
			visitorId: "visitor-2",
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
		});

	// A new click and a changed language set each bring a fresh key.
	await demand("second-click");
	await demand("coverage:click:en,ru");
	expect(await scheduledAttempts(t)).toEqual([]);
	expect((await attempts(t)).map(({ attemptKey }) => attemptKey)).toEqual([
		"first-click",
	]);

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	await demand("third-click");
	expect(await scheduledAttempts(t)).toEqual(queued("third-click"));
});

/** A second saved occurrence of the seeded Reading, in a Sentence of its own. */
async function seedSecondOccurrence(
	t: TestConvexDb,
	occurrence: Occurrence,
): Promise<Occurrence> {
	const { sentenceIds, segmentIds } = await submitText(t, [
		[
			{ kind: "ResolvableText", text: "Bank" },
			{ kind: "OpaqueText", text: " am See" },
		],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[0];
	if (!sentenceId || !segmentId) throw new Error("Expected a Segment.");
	return t.run(async (ctx) => {
		const first = await ctx.db.get(occurrence.attestationId);
		if (!first) throw new Error("Expected the first Attestation.");
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: first.surfaceId,
			readingId: occurrence.readingId,
			realizationCoverage: "Full",
			articleEvidence: null,
			valencyEvidence: [],
		});
		await ctx.db.patch(segmentId, {
			attestationMembership: { attestationId, orthography: "Standard" },
		});
		return { ...occurrence, attestationId, sentenceId, segmentId };
	});
}

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
