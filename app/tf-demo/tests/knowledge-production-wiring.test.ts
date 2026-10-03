import { expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import type { TableNames } from "../convex/_generated/dataModel";
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
 * Dumgen `knowledge.produce` reaches jev and Luna through the real
 * TypeSafe and OpenAI transports, whose `fetch` answers here. It lives in
 * a file of its own so nothing another test scheduled can run while the
 * fixture keys are set, and it cancels what its own publication schedules.
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
	const { textId, sentenceIds, segmentIds } = await submitText(t, [
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
	return { textId, sentenceId };
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

test("the production producer runs Dumgen's knowledge.produce through the deployment's transports; structural changes publish with the final batch (#887)", async () => {
	const t = createTestConvex();
	await seedAttempt(t, "live");
	const previous = {
		fetch: globalThis.fetch,
		flag: process.env.TF_KNOWLEDGE_PRODUCTION,
		typesafe: process.env.TYPESAFE_API_KEY,
		openai: process.env.OPENAI_API_KEY,
	};
	process.env.TF_KNOWLEDGE_PRODUCTION = "1";
	process.env.TYPESAFE_API_KEY = "fixture";
	process.env.OPENAI_API_KEY = "fixture";
	const urls: string[] = [];
	const aspects: string[] = [];
	const lunaAnswers: Record<string, unknown> = {
		transcription: "baŋk",
		definition: "Ein Geldinstitut.",
		translations: ["bank"],
		plural: ["Banken"],
		valency: { valency: [] },
	};
	globalThis.fetch = (async (url: string | URL | Request, init) => {
		urls.push(String(url));
		const body = JSON.parse(String(init?.body));
		if (String(url).endsWith("/v1/systemone"))
			return Response.json({
				model: body.model,
				answers: Object.fromEntries(
					Object.keys(body.questions).map((id) => [
						id,
						{
							type: "choice",
							choice: "HasPlural",
							confidence: 1,
							probabilities: { HasPlural: 1 },
						},
					]),
				),
				usage: { input_tokens: 10, output_tokens: 1 },
			});
		const input = JSON.parse(body.input[1].content) as {
			aspect: string;
			language?: string;
		};
		aspects.push(input.aspect);
		const value =
			input.aspect === "translations" && input.language === "ru"
				? ["банк"]
				: lunaAnswers[input.aspect];
		return Response.json({
			status: "completed",
			output: [
				{
					content: [
						{
							type: "output_text",
							text: JSON.stringify({ value }),
						},
					],
				},
			],
			usage: { input_tokens: 50, output_tokens: 5 },
		});
	}) as typeof fetch;
	try {
		await t.action(
			internal.knowledgeGenerationActions.runKnowledgeGeneration,
			{ attemptKey: "live" },
		);
	} finally {
		// What the publication scheduled (the definition's segmentation)
		// never runs once the fixture keys and transports are gone.
		await t.run(async (ctx) => {
			for (const job of await ctx.db.system
				.query("_scheduled_functions")
				.collect())
				if (job.state.kind === "pending")
					await ctx.scheduler.cancel(job._id);
		});
		globalThis.fetch = previous.fetch;
		for (const [name, value] of [
			["TF_KNOWLEDGE_PRODUCTION", previous.flag],
			["TYPESAFE_API_KEY", previous.typesafe],
			["OPENAI_API_KEY", previous.openai],
		] as const)
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
	}
	expect(
		urls.every(
			(url) =>
				url === "https://api.typesafe.ai/v1/systemone" ||
				url === "https://api.openai.com/v1/responses",
		),
	).toBe(true);
	// The base request of a NOUN: its text, its frame and its plural.
	expect(aspects.sort()).toEqual(
		[
			"definition",
			"plural",
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
		plural: ["Banken"],
	});
	// The empty frame stores nothing and still completes the Reading.
	expect(accumulated?.status).toBe("Full");
	// The run's Dumgen trace is its evidence.
	const [run] = await rows(t, "knowledgeProductionRuns");
	const evidence = run?.evidence as
		| { readonly operationTraces: readonly string[] }
		| undefined;
	expect(
		evidence?.operationTraces.some((trace) =>
			trace.includes('"operation":"knowledge.produce"'),
		),
	).toBe(true);
});
