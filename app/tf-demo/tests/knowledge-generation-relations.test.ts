import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import * as containment from "../convex/model/generatedKnowledgeContainment";
import {
	effectiveRelationPublicationPolicy,
	generatedKnowledgeAllowedForPublication,
	RELATION_PUBLICATION_FINGERPRINTS,
} from "../convex/model/generatedKnowledgeContainment";
import { publishInRelationChunks } from "../convex/model/relationPublicationChunks";
import { createTestConvex } from "./support/convex";
import {
	attempts,
	EMPTY_RELATION_RUN,
	insertAttempt,
	PRODUCTION_EVIDENCE,
	publish,
	publishArgs,
	rows,
	seedDictionaryReading,
} from "./support/knowledgeGeneration";

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
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

/**
 * Publishes a definition and 60 synonym proposals, each planning its own
 * pending record, through `publishInRelationChunks` against the real
 * `publish` mutation, and checks that all of it committed.
 */
async function publishSixtyPendingSynonyms(unitsPerChunk?: number) {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "attempt-1");
	const artifactPath = "gate/verdict.json";
	const policy = spyOn(
		containment,
		"effectiveRelationPublicationPolicy",
	).mockReturnValue({
		artifactPath,
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		qualifiedKinds: ["synonym"],
		invalidationReasons: [],
	});
	// Each proposal plans its own pending record: 60 in all, over the cap.
	const pendingRelations = Array.from({ length: 60 }, (_, index) => ({
		relation: "synonym" as const,
		target: {
			language: "de" as const,
			family: "Lexeme" as const,
			kind: "NOUN" as const,
			canonicalForm: `Geldinstitut${index}`,
		},
	}));
	const statuses: string[] = [];
	try {
		await publishInRelationChunks(
			{
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
				pendingRelations,
			},
			async ({ final, proposed, changes, pendingRelations }) => {
				const { status } = await publish(
					t,
					publishArgs({
						attemptKey: "attempt-1",
						final,
						changes,
						pendingRelations,
						productionEvidence: {
							...PRODUCTION_EVIDENCE,
							request: {
								definition: null,
								semanticRelations: { synonym: null },
							},
						},
						relationPublication: {
							...EMPTY_RELATION_RUN,
							requestedKinds: ["synonym"],
							artifactPath,
							proposals: proposed.map(({ relation, target }) => ({
								relation,
								targetShadow: target,
							})),
						},
					}),
				);
				statuses.push(status);
				return status;
			},
			unitsPerChunk,
		);
	} finally {
		policy.mockRestore();
	}

	const committed = statuses.filter((status) => status === "Committed");
	expect(committed.length).toBeGreaterThan(1);
	expect(statuses.at(-1)).toBe("Committed");
	expect(await rows(t, "pendingSemanticRelations")).toHaveLength(60);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Committed",
		publicationSequence: committed.length,
	});
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "Ein Geldinstitut." },
		status: "Full",
		checkedRelationKinds: ["synonym"],
	});
	expect(await rows(t, "generatedRelationRuns")).toEqual([
		expect.objectContaining({
			relation: "synonym",
			generatedTargets: 60,
			pendingShadows: 60,
			publicationFailures: 0,
		}),
	]);
	return statuses;
}

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
