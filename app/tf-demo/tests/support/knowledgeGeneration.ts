import {
	type DefaultFunctionArgs,
	type FunctionArgs,
	type FunctionReference,
	getFunctionName,
} from "convex/server";
import { internal } from "../../convex/_generated/api";
import type { Id, TableNames } from "../../convex/_generated/dataModel";
import type { ActionCtx } from "../../convex/_generated/server";
import { generateKnowledge } from "../../convex/knowledgeGenerationActions";
import { RELATION_PUBLICATION_FINGERPRINTS } from "../../convex/model/generatedKnowledgeContainment";
import { scheduleKnowledgeGeneration } from "../../convex/model/knowledgeScheduling";
import type {
	KnowledgeProducer,
	KnowledgeProduction,
} from "../../server/knowledgeProduction";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../../server/linguisticIdentity";
import { actionContext, submitText, type TestConvexDb } from "./convex";

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

const BANK_LEMMA = {
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
export const ANGST_READING = {
	...BANK_READING,
	lemma: { ...BANK_LEMMA, canonicalForm: "Angst" },
} as const;

export const PIZZA_READING = {
	unitKind: "Reading",
	lemma: { ...BANK_LEMMA, canonicalForm: "Pizza" },
	emojiDescription: "🍕",
} as const;

type SeededReading =
	| typeof BANK_READING
	| typeof ANGST_READING
	| typeof PIZZA_READING;
type ReadingRecord = Record<string, unknown>;
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
			language: "de",
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
			language: "de",
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

const RUN_ACTION = "knowledgeGenerationActions:runKnowledgeGeneration";
const WATCHDOG = "knowledgeGeneration:recoverStaleRun";

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
