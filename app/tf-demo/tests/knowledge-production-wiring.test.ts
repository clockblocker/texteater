import { expect, test } from "bun:test";
import { isRecord } from "common-utils";
import { type JevAsk, JevTransport, type LunaAsk, LunaTransport } from "dumgen";
import { internal } from "../convex/_generated/api";
import type { TableNames } from "../convex/_generated/dataModel";
import { replaceModelTransports } from "../convex/model/deploymentDumgen";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

/**
 * The production Knowledge action end to end with no network (#887): its
 * Dumgen `knowledge.produce` reaches jev and Luna through the deployment's
 * transports, faked here as TypeSafe and OpenAI answer. It lives in a file
 * of its own so nothing another test scheduled can run while the fakes are
 * in place, and it cancels what its own publication schedules.
 */

const BANK_LEMMA = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
} as const;
const BANK_READING = {
	unitKind: "Reading",
	lemma: BANK_LEMMA,
	emojiDescription: "🏦",
} as const;

/** One saved occurrence of Bank 🏦 in the dictionary, and a Scheduled attempt for it. */
async function seedAttempt(t: TestConvexDb, attemptKey: string) {
	const { scrollId, sentenceIds, segmentIds } = await submitText(t, [
		[
			{ kind: "ResolvableText", text: "Bank" },
			{ kind: "OpaqueText", text: " am Fluss" },
		],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[0];
	if (!sentenceId || !segmentId) throw new Error("Expected a Segment.");
	const readingKey = readingIdentityKey(BANK_READING);
	await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(BANK_LEMMA),
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			foldedCanonicalForm: foldedCanonicalForm(BANK_LEMMA),
			coreFeatures: BANK_LEMMA.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: "🏦",
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: "Bank",
			inflectionalFeatures: null,
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
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		await ctx.db.insert("readingEntries", {
			readingId,
			record: { attestedTranslations: [], attestations: [], notes: "" },
		});
		await ctx.db.insert("knowledgeGenerationAttempts", {
			attemptKey,
			visitorId: "visitor-1",
			ownerReadingKey: readingKey,
			readingId,
			attestationId,
			state: "Scheduled",
			translationLanguages: ["en", "ru"],
			createdAt: 1,
			updatedAt: 1,
		});
	});
	return { scrollId, sentenceId };
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

/**
 * Runs the production Knowledge action for `attemptKey` with the
 * deployment's transports faked (`fromAsk`), and cancels what its
 * publication scheduled. The fakes answer as TypeSafe and OpenAI do.
 */
async function runProductionAction(
	t: TestConvexDb,
	attemptKey: string,
	inspect?: boolean,
) {
	const flag = process.env.TF_KNOWLEDGE_PRODUCTION;
	process.env.TF_KNOWLEDGE_PRODUCTION = "1";
	const aspects: string[] = [];
	const lunaAnswers: Record<string, unknown> = {
		transcription: "baŋk",
		definition: "Ein Geldinstitut.",
		translations: ["bank"],
		valency: { valency: [] },
	};
	// `Bank` has a plural, and it was formed from no other word, so it has
	// no Source.
	const pick = (question: unknown) => {
		const criteria = isRecord(question) ? question.criteria : undefined;
		return isRecord(criteria) && "None" in criteria ? "None" : "HasPlural";
	};
	const jev: JevAsk = async (request) => ({
		model: request.model,
		answers: Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => [
				id,
				{
					type: "choice",
					choice: pick(question),
					confidence: 1,
					probabilities: { [pick(question)]: 1 },
				},
			]),
		),
		usage: { input_tokens: 10, output_tokens: 1 },
	});
	const luna: LunaAsk = async (request) => {
		const input = request.input as { aspect: string; language?: string };
		aspects.push(input.aspect);
		return {
			output:
				input.aspect === "translations" && input.language === "ru"
					? ["банк"]
					: lunaAnswers[input.aspect],
			metadata: {
				model: null,
				usage: { input_tokens: 50, output_tokens: 5 },
			},
		};
	};
	const restore = replaceModelTransports({
		jev: () => JevTransport.fromAsk(jev),
		luna: () => LunaTransport.fromAsk(luna),
	});
	try {
		await t.action(
			internal.knowledgeGenerationActions.runKnowledgeGeneration,
			{ attemptKey, ...(inspect ? { inspect } : {}) },
		);
	} finally {
		// What the publication scheduled (the definition's segmentation)
		// never runs once the fake transports are gone.
		await t.run(async (ctx) => {
			for (const job of await ctx.db.system
				.query("_scheduled_functions")
				.collect())
				if (job.state.kind === "pending")
					await ctx.scheduler.cancel(job._id);
		});
		restore();
		if (flag === undefined) delete process.env.TF_KNOWLEDGE_PRODUCTION;
		else process.env.TF_KNOWLEDGE_PRODUCTION = flag;
	}
	return { aspects };
}

/** The run's evidence: one serialized Dumgen trace per operation. */
async function evidenceTraces(t: TestConvexDb) {
	const [run] = await rows(t, "knowledgeProductionRuns");
	const evidence = run?.evidence as
		| { readonly operationTraces: readonly string[] }
		| undefined;
	return evidence?.operationTraces ?? [];
}

test("the production producer runs Dumgen's knowledge.produce through the deployment's transports; structural changes publish with the final batch (#887)", async () => {
	const t = createTestConvex();
	await seedAttempt(t, "live");
	const { aspects } = await runProductionAction(t, "live");
	// The base request of a NOUN: its text and its frame. Its plural is the
	// Lemma Paradigm's, which tf-demo doesn't request until it stores one
	// (#1232).
	expect(aspects.sort()).toEqual(
		[
			"definition",
			"transcription",
			"translations",
			"translations",
			"valency",
		].sort(),
	);
	expect((await rows(t, "knowledgeGenerationAttempts"))[0]).toMatchObject({
		state: "Committed",
	});
	const [accumulated] = await rows(t, "accumulatedKnowledge");
	expect(accumulated?.knowledge).toMatchObject({
		definition: "Ein Geldinstitut.",
		transcription: "baŋk",
		translations: { en: ["bank"], ru: ["банк"] },
	});
	// The empty frame stores nothing and still completes the Reading.
	expect(accumulated?.status).toBe("Full");
	// The run's Dumgen trace is its evidence, with no prompt or answer:
	// without DEV inspection, Dumgen keeps no payloads.
	const traces = await evidenceTraces(t);
	expect(
		traces.some((trace) =>
			trace.includes('"operation":"knowledge.produce"'),
		),
	).toBe(true);
	expect(traces.some((trace) => trace.includes('"payload"'))).toBe(false);
	expect(await rows(t, "inspectionSteps")).toEqual([]);
});

test("under DEV inspection the run's Dumgen calls render as inspection rows with their prompts and answers, and the evidence still keeps none (#885)", async () => {
	const t = createTestConvex();
	await seedAttempt(t, "inspected");
	await t.run((ctx) =>
		ctx.db.insert("inspectionClicks", {
			requestId: "inspected",
			visitorId: "visitor-1",
			selectedSegment: "Bank",
			sentence: "Bank am Fluss",
			selectionKind: "Available",
			startedAt: 1,
			resolutionState: "Complete",
		}),
	);
	await runProductionAction(t, "inspected", true);

	const steps = await rows(t, "inspectionSteps");
	const root = steps.find((step) => step.parentId === undefined);
	expect(root?.name).toBe("Generate and publish Knowledge");
	const operation = steps.find((step) => step.name === "knowledge.produce");
	expect(operation).toMatchObject({
		parentId: root?.id,
		owner: "battery/dumgen",
		kind: "Code",
	});
	const calls = steps.filter((step) => step.parentId === operation?.id);
	expect(calls.length).toBeGreaterThan(0);
	// A NOUN's base request asks Luna for its text and frame, and jev whether
	// it was formed from another word (its Source, ADR 0050).
	expect(new Set(calls.map((step) => step.kind))).toEqual(
		new Set(["LLM", "TypeSafe"]),
	);
	const payloads = await t.run(async (ctx) =>
		Promise.all(
			calls.map(async (step) =>
				JSON.parse(
					(
						await ctx.db
							.query("inspectionPayloads")
							.withIndex("by_step_id_and_part", (q) =>
								q.eq("stepId", step._id),
							)
							.collect()
					)
						.map(({ text }) => text)
						.join(""),
				),
			),
		),
	);
	// Every call shows what was sent and what came back.
	for (const payload of payloads) {
		expect(payload.input).toBeDefined();
		expect(payload.output).toBeDefined();
	}
	expect(JSON.stringify(payloads)).toContain("Ein Geldinstitut.");
	const traces = await evidenceTraces(t);
	expect(traces.length).toBeGreaterThan(0);
	expect(traces.some((trace) => trace.includes('"payload"'))).toBe(false);
});
