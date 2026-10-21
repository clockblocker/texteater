import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { KNOWLEDGE_RETRY_COOLDOWN_MS } from "../convex/model/knowledgeAttempts";
import { publishInRelationChunks } from "../convex/model/relationPublicationChunks";
import {
	answeredRelationKinds,
	knowledgeRequestComplete,
	missingKnowledgeRequest,
} from "../server/knowledgeCompletion";
import { createTestConvex } from "./support/convex";
import {
	attempts,
	insertAccumulatedKnowledge,
	insertAttempt,
	PRODUCTION_EVIDENCE,
	publish,
	publishArgs,
	publishSixtyPendingSynonyms,
	rows,
	schedule,
	seedDictionaryReading,
	seedOccurrence,
} from "./support/knowledge-generation";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("an answered relation kind covers the request even with no stored target", async () => {
	const request = {
		definition: null,
		semanticRelations: { synonym: null, antonym: null },
	};
	const knowledge = { definition: "Ein Geldinstitut." };
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: [] },
			request,
			[],
		),
	).toBe(false);
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: ["synonym", "antonym"] },
			request,
			[],
		),
	).toBe(true);
	expect(
		missingKnowledgeRequest(request, {
			knowledge,
			checkedRelationKinds: ["synonym"],
		}),
	).toEqual({ semanticRelations: { antonym: null } });

	expect(answeredRelationKinds(["synonym", "antonym"], false, [])).toEqual(
		[],
	);
	expect(
		answeredRelationKinds(["synonym", "antonym"], true, [
			{ aspect: "semanticRelations", leaf: "antonym" },
		]),
	).toEqual(["synonym"]);
	expect(
		answeredRelationKinds(["synonym"], true, [
			{ aspect: "semanticRelations" },
		]),
	).toEqual([]);
});

test("recorded relation evidence lets a Reading whose relations live as edges reach Full", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t, {
		knowledge: { definition: "Ein Geldinstitut." },
	});
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "Ein Geldinstitut." },
		status: "Partial",
	});
	await t.run(async (ctx) => {
		const row = await ctx.db.query("accumulatedKnowledge").first();
		if (row)
			await ctx.db.patch(row._id, { checkedRelationKinds: ["synonym"] });
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const evidence = {
		...PRODUCTION_EVIDENCE,
		request: { definition: null, semanticRelations: { synonym: null } },
	};

	await publish(
		t,
		publishArgs({ attemptKey: "attempt-1", productionEvidence: evidence }),
	);
	// Replacing the content keeps the evidence recorded beside it.
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		status: "Full",
		checkedRelationKinds: ["synonym"],
	});
});

test("a final publication skips what its run already published behind many earlier changes", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	// Earlier attempts left more changes than one index page for this Reading.
	await t.run(async (ctx) => {
		for (let index = 0; index < 520; index++)
			await ctx.db.insert("knowledgeChanges", {
				knowledgeChangeKey: `earlier:1:1:${index}`,
				ownerReadingKey: occurrence.readingKey,
				change: {
					kind: "Contribute",
					aspect: "notes",
					value: `${index}`,
				},
				createdAt: 1,
			});
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const definition = {
		kind: "Contribute",
		aspect: "definition",
		value: "Ein Geldinstitut.",
	};
	const transcription = {
		kind: "Contribute",
		aspect: "transcription",
		value: "baŋk",
	};
	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "attempt-1",
				final: false,
				changes: [definition],
			}),
		),
	).toEqual({ status: "Committed" });
	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "attempt-1",
				changes: [definition, transcription],
			}),
		),
	).toEqual({ status: "Committed" });

	const published = (await rows(t, "knowledgeChanges")).filter((row) =>
		row.knowledgeChangeKey.startsWith("attempt-1:"),
	);
	expect(
		published.map(({ knowledgeChangeKey, change }) => ({
			knowledgeChangeKey,
			change,
		})),
	).toEqual([
		{ knowledgeChangeKey: "attempt-1:1:1:0", change: definition },
		{ knowledgeChangeKey: "attempt-1:1:2:0", change: transcription },
	]);
	expect((await attempts(t))[0]).toMatchObject({ state: "Committed" });
});

test("a top-up that partly fails keeps a Full Reading Full for the next top-up", async () => {
	const t = createTestConvex();
	const knowledge = {
		definition: "Ein Geldinstitut.",
		translations: { en: ["bank"] },
	};
	const occurrence = await seedDictionaryReading(t, { knowledge });
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge,
		status: "Full",
		coveredTranslationLanguages: ["en"],
	});
	await insertAttempt(t, occurrence, "russian-top-up", {
		translationLanguages: ["ru"],
	});

	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "russian-top-up",
				productionEvidence: {
					request: { translations: { ru: null } },
					failures: [
						{
							aspect: "translations",
							leaf: "ru",
							code: "ProviderFailure",
							message: "offline",
						},
					],
					operationTraces: [],
				},
			}),
		),
	).toEqual({ status: "Committed" });
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge,
		status: "Full",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "partialKnowledge",
	});

	jest.setSystemTime(Date.now() + KNOWLEDGE_RETRY_COOLDOWN_MS);
	await schedule(t, {
		attemptKey: "next-demand",
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "next-demand",
		}),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			topUpOnly: true,
			translationLanguages: ["ru"],
		}),
	);
});

test("relation chunks split a Contribute by target and keep the rest of the Knowledge for the final one", async () => {
	const definition = { kind: "Contribute", aspect: "definition", value: "x" };
	const synonyms = {
		kind: "Contribute",
		aspect: "semanticRelations",
		relation: "synonym",
		value: ["a", "b", "c", "d", "e"],
	};
	const chunks: unknown[] = [];
	await publishInRelationChunks(
		{ changes: [definition, synonyms], pendingRelations: ["p", "q"] },
		async (chunk) => {
			chunks.push(chunk);
			return "Committed";
		},
		3,
	);
	expect(chunks).toEqual([
		{
			final: false,
			changes: [{ ...synonyms, value: ["a", "b", "c"] }],
			pendingRelations: [],
			proposed: [],
		},
		{
			final: false,
			changes: [{ ...synonyms, value: ["d", "e"] }],
			pendingRelations: ["p"],
			proposed: ["p"],
		},
		{
			final: true,
			changes: [definition],
			pendingRelations: ["q"],
			proposed: ["p", "q"],
		},
	]);

	// Within the budget the publication stays whole.
	const whole: unknown[] = [];
	await publishInRelationChunks(
		{ changes: [definition, synonyms], pendingRelations: [] },
		async (chunk) => {
			whole.push(chunk);
			return "Committed";
		},
	);
	expect(whole).toEqual([
		{
			final: true,
			changes: [definition, synonyms],
			pendingRelations: [],
			proposed: [],
		},
	]);
});

test("a final publication with more relations than one plan commits them all in chunks", async () => {
	const statuses = await publishSixtyPendingSynonyms();
	expect(statuses.every((status) => status === "Committed")).toBe(true);
});

test("a chunk whose plan exceeds the cap writes nothing and is split until every part commits", async () => {
	// An estimate loose enough to send all 60 proposals at once.
	const statuses = await publishSixtyPendingSynonyms(1_000);
	expect(statuses[0]).toBe("OverBudget");
});

test("relation chunks halve an OverBudget chunk and keep the rest of the Knowledge for the last part", async () => {
	const definition = { kind: "Contribute", aspect: "definition", value: "x" };
	const synonyms = {
		kind: "Contribute",
		aspect: "semanticRelations",
		relation: "synonym",
		value: ["a", "b", "c"],
	};
	const sent: unknown[] = [];
	await publishInRelationChunks(
		{ changes: [definition, synonyms], pendingRelations: ["p"] },
		async (chunk) => {
			const units =
				chunk.pendingRelations.length +
				chunk.changes.reduce(
					(total: number, change) =>
						total +
						(change === definition
							? 0
							: (change as typeof synonyms).value.length),
					0,
				);
			// This planner fits two relation units in one commit.
			if (units > 2) return "OverBudget";
			sent.push(chunk);
			return "Committed";
		},
		10,
	);
	expect(sent).toEqual([
		{
			final: false,
			changes: [{ ...synonyms, value: ["a", "b"] }],
			pendingRelations: [],
			proposed: [],
		},
		{
			final: false,
			changes: [{ ...synonyms, value: ["c"] }],
			pendingRelations: [],
			proposed: [],
		},
		{
			final: true,
			changes: [definition],
			pendingRelations: ["p"],
			proposed: ["p"],
		},
	]);

	await expect(
		publishInRelationChunks(
			{ changes: [synonyms], pendingRelations: [] },
			async () => "OverBudget",
		),
	).rejects.toThrow("cannot be split");
});

test("a rejected dictionary plan fails the final publication without recording changes", async () => {
	const t = createTestConvex();
	// The attempt's Reading is not in the dictionary, so planning is rejected.
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "partial" },
		status: "Partial",
	});
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
			],
		}),
	);
	expect(result).toMatchObject({ status: "Rejected" });
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "generationFailed",
	});
	expect(await rows(t, "knowledgeChanges")).toEqual([]);
	expect(await publish(t, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Ignored",
	});
});
