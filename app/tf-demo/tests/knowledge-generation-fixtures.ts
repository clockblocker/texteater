import { expect, spyOn } from "bun:test";
import {
	type DefaultFunctionArgs,
	type FunctionArgs,
	type FunctionReference,
	getFunctionName,
} from "convex/server";
import { internal } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import type { ActionCtx } from "../convex/_generated/server";
import { generateKnowledge } from "../convex/knowledgeGenerationActions";
import * as containment from "../convex/model/generatedKnowledgeContainment";
import { RELATION_PUBLICATION_FINGERPRINTS } from "../convex/model/generatedKnowledgeContainment";
import { scheduleKnowledgeGeneration } from "../convex/model/knowledgeScheduling";
import { publishInRelationChunks } from "../convex/model/relationPublicationChunks";
import type {
	KnowledgeProducer,
	KnowledgeProduction,
} from "../server/knowledgeProduction";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	actionContext,
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

export type KnowledgeChange = KnowledgeProduction["changes"][number];

export const PRODUCTION_EVIDENCE = {
	request: { definition: null },
	failures: [],
	operationTraces: [],
};

export const EMPTY_RELATION_RUN: PublishArgs["relationPublication"] = {
	runNumber: 1,
	requestedKinds: [],
	artifactPath: null,
	fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
	proposals: [],
};

export const BANK_LEMMA = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} as const;
export const BANK_READING = {
	unitKind: "Reading",
	lemma: BANK_LEMMA,
	emojiDescription: "🏦",
} as const;
export const BANK_READING_KEY = readingIdentityKey(BANK_READING);
export const HEBREW_READING = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { abbr: null, gender: "Masc" },
	},
	emojiDescription: "📖",
} as const;
export const ANGST_READING = {
	...BANK_READING,
	lemma: { ...BANK_LEMMA, canonicalForm: "Angst" },
} as const;

export const PIZZA_READING = {
	unitKind: "Reading",
	lemma: { ...BANK_LEMMA, canonicalForm: "Pizza" },
	emojiDescription: "🍕",
} as const;

export type SeededReading =
	| typeof BANK_READING
	| typeof HEBREW_READING
	| typeof ANGST_READING
	| typeof PIZZA_READING;
export type ReadingRecord = Record<string, unknown>;
export type Occurrence = {
	readonly readingId: Id<"readings">;
	readonly lemmaId: Id<"lemmas">;
	readonly attestationId: Id<"attestations">;
	readonly scrollId: Id<"scrolls">;
	readonly sentenceId: Id<"sentences">;
	readonly segmentId: Id<"segments">;
	readonly readingKey: string;
};

/**
 * Stores one saved occurrence of a Reading: its Sentence, Lemma, Surface,
 * Reading, and Attestation, with the first Segment as the only member.
 */
export async function seedOccurrence(
	t: TestConvexDb,
	reading: SeededReading = BANK_READING,
	/** The member's Surface; the Canonical Form with no features by default. */
	surface: {
		readonly normalizedSurface: string;
		readonly inflectionalFeatures: unknown;
	} = {
		normalizedSurface: reading.lemma.canonicalForm,
		inflectionalFeatures: null,
	},
): Promise<Occurrence> {
	const governed = reading.lemma.canonicalForm === "Angst";
	const { scrollId, sentenceIds, segmentIds } = await submitText(t, [
		[
			{ kind: "ResolvableText", text: surface.normalizedSurface },
			{
				kind: "OpaqueText",
				text: governed ? " vor Hunden" : " am Fluss",
			},
		],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[0];
	if (!sentenceId || !segmentId) throw new Error("Expected a Segment.");
	const readingKey = readingIdentityKey(reading);
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(reading.lemma),
			language: reading.lemma.language,
			family: reading.lemma.family,
			kind: reading.lemma.kind,
			canonicalForm: reading.lemma.canonicalForm,
			foldedCanonicalForm: foldedCanonicalForm(reading.lemma),
			coreFeatures: reading.lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: reading.emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: reading.lemma.language,
			...surface,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
			articleEvidence: null,
			valencyEvidence: [],
		});
		await ctx.db.patch(segmentId, {
			attestationMembership: { attestationId, orthography: "Standard" },
		});
		return {
			readingId,
			lemmaId,
			attestationId,
			scrollId,
			sentenceId,
			segmentId,
			readingKey,
		};
	});
}

/** Registers the Reading in the dictionary the publication planner patches. */
export async function addToDictionary(
	t: TestConvexDb,
	occurrence: Occurrence,
	record: ReadingRecord = {},
) {
	await t.run(async (ctx) => {
		await ctx.db.insert("dictionaryLemmas", {
			lemmaId: occurrence.lemmaId,
		});
		await ctx.db.insert("readingEntries", {
			readingId: occurrence.readingId,
			record: {
				attestedTranslations: [],
				attestations: [],
				notes: "",
				...record,
			},
		});
	});
}

export async function seedDictionaryReading(
	t: TestConvexDb,
	record: ReadingRecord = {},
) {
	const occurrence = await seedOccurrence(t);
	await addToDictionary(t, occurrence, record);
	return occurrence;
}

export async function insertAttempt(
	t: TestConvexDb,
	occurrence: Occurrence,
	attemptKey: string,
	overrides: {
		state?: "Waiting" | "Scheduled" | "Running" | "Failed";
		runNumber?: number;
		failureCode?: string;
		failureMessage?: string;
		createdAt?: number;
		translationLanguages?: ("en" | "ru")[];
	} = {},
) {
	const createdAt = overrides.createdAt ?? 1;
	await t.run((ctx) =>
		ctx.db.insert("knowledgeGenerationAttempts", {
			attemptKey,
			visitorId: "visitor-1",
			ownerReadingKey: occurrence.readingKey,
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
			state: "Running",
			...overrides,
			createdAt,
			updatedAt: createdAt,
		}),
	);
}

export async function insertAccumulatedKnowledge(
	t: TestConvexDb,
	occurrence: Occurrence,
	value: {
		knowledge: unknown;
		status: "Partial" | "Full";
		coveredTranslationLanguages?: ("en" | "ru")[];
	},
) {
	await t.run((ctx) =>
		ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: occurrence.readingKey,
			...value,
			updatedAt: 1,
		}),
	);
}

export function schedule(
	t: TestConvexDb,
	input: Parameters<typeof scheduleKnowledgeGeneration>[1],
) {
	return t.run((ctx) => scheduleKnowledgeGeneration(ctx, input));
}

export const RUN_ACTION = "knowledgeGenerationActions:runKnowledgeGeneration";
export const WATCHDOG = "knowledgeGeneration:recoverStaleRun";

/** The attempts whose Knowledge action has been queued, in order. */
export async function scheduledAttempts(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter(({ name }) => name === RUN_ACTION)
		.map(({ name, args }) => ({ name, args: args[0] }));
}

/** The watchdog runs queued, in order. */
export async function scheduledWatchdogs(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter(({ name }) => name === WATCHDOG)
		.map(({ args }) => args[0]);
}

export function queued(...attemptKeys: string[]) {
	return attemptKeys.map((attemptKey) => ({
		name: RUN_ACTION,
		args: { attemptKey },
	}));
}

export function attempts(t: TestConvexDb) {
	return t.run((ctx) =>
		ctx.db.query("knowledgeGenerationAttempts").collect(),
	);
}

export function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

export type PublishArgs = FunctionArgs<
	typeof internal.knowledgeGeneration.publish
>;

export function publishArgs(
	overrides: Partial<PublishArgs> & { attemptKey: string },
): PublishArgs {
	return {
		final: true,
		reading: BANK_READING,
		changes: [],
		pendingRelations: [],
		productionEvidence: PRODUCTION_EVIDENCE,
		relationPublication: EMPTY_RELATION_RUN,
		...overrides,
	};
}

export function publish(t: TestConvexDb, args: PublishArgs) {
	return t.mutation(internal.knowledgeGeneration.publish, args);
}

/** Runs one attempt's Knowledge action body with `produce` as its producer. */
export function generateWith(
	t: TestConvexDb,
	attemptKey: string,
	produce: KnowledgeProducer,
	ctx: object = actionContext(t),
) {
	return generateKnowledge(
		ctx as unknown as ActionCtx,
		{ attemptKey },
		produce,
	);
}

/** An action context whose `knowledgeGeneration.publish` calls go to `publish`. */
export function interceptPublish(
	t: TestConvexDb,
	publish: (args: PublishArgs, commit: () => Promise<unknown>) => unknown,
) {
	const context = actionContext(t);
	return {
		...context,
		runMutation: (
			reference: FunctionReference<"mutation", "internal">,
			args: DefaultFunctionArgs,
		) =>
			getFunctionName(reference) ===
			getFunctionName(internal.knowledgeGeneration.publish)
				? publish(args as PublishArgs, () =>
						context.runMutation(reference, args),
					)
				: context.runMutation(reference, args),
	};
}

/** The event of a structured log line, if `message` is one. */
export function logEvent(
	message: unknown,
): { readonly event?: unknown } | undefined {
	if (typeof message !== "string" || !message.startsWith("{")) return;
	return JSON.parse(message);
}

/**
 * Stubs the model provider and restores it with the fixture API key. A
 * Valency Frame request gets `frame`; every other request gets text.
 */
export function stubProvider(
	respond: (modelInput: ModelInput) => Promise<string>,
	frame: readonly unknown[] = [],
	plural: unknown = { plurality: "NoPlural", plurals: [] },
) {
	const previousFetch = globalThis.fetch;
	const previousKey = process.env.OPENAI_API_KEY;
	const requests: ModelInput[] = [];
	process.env.OPENAI_API_KEY = "fixture";
	globalThis.fetch = (async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		const modelInput: ModelInput = JSON.parse(body.input[1].content);
		requests.push(modelInput);
		return Response.json({
			status: "completed",
			output: [
				{
					content: [
						{
							type: "output_text",
							text: JSON.stringify({
								value:
									modelInput.aspect === "valency"
										? { valency: frame }
										: modelInput.aspect === "pluralPattern"
											? plural
											: {
													text:
														await respond(
															modelInput,
														),
												},
							}),
						},
					],
				},
			],
		});
	}) as typeof fetch;
	return {
		requests,
		restore() {
			globalThis.fetch = previousFetch;
			if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
			else process.env.OPENAI_API_KEY = previousKey;
		},
	};
}

export type ModelInput = {
	readonly aspect?: string;
	readonly language?: string;
};

/**
 * Publishes a definition and 60 synonym proposals, each planning its own
 * pending record, through `publishInRelationChunks` against the real
 * `publish` mutation, and checks that all of it committed.
 */
export async function publishSixtyPendingSynonyms(unitsPerChunk?: number) {
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

/** A second saved occurrence of the seeded Reading, in a Sentence of its own. */
export async function seedSecondOccurrence(
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
