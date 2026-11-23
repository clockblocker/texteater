import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { syncDefinitionText } from "../convex/model/definitionTexts";
import { createTestConvex } from "./support/convex";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test("materialization segments and persists a Hebrew definition in its Reading's language", async () => {
	const t = createTestConvex();
	const ownerReadingKey = "he-definition-action";
	await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: "he-definition-lemma",
			language: "he",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "בית",
			foldedCanonicalForm: "בית",
			coreFeatures: { abbr: null, gender: "Masc" },
		});
		await ctx.db.insert("readings", {
			readingKey: ownerReadingKey,
			lemmaId,
			emojiDescription: "🏠",
		});
		await syncDefinitionText(ctx, ownerReadingKey, { definition: "בית" });
		for (const job of await ctx.db.system
			.query("_scheduled_functions")
			.collect()) {
			if (job.state.kind === "pending")
				await ctx.scheduler.cancel(job._id);
		}
	});
	const previousFetch = globalThis.fetch;
	const previousKey = process.env.TYPESAFE_API_KEY;
	process.env.TYPESAFE_API_KEY = "fixture";
	globalThis.fetch = (async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		return Response.json({
			model: body.model,
			answers: Object.fromEntries(
				Object.keys(body.questions).map((id) => {
					const choice = id.startsWith("route_")
						? "Unresolved"
						: "AsWritten";
					return [
						id,
						{
							type: "choice",
							choice,
							confidence: 1,
							probabilities: { [choice]: 1 },
						},
					];
				}),
			),
			usage: { input_tokens: 10, output_tokens: 1 },
		});
	}) as typeof fetch;
	try {
		await t.action(internal.definitionTextActions.materialize, {
			ownerReadingKey,
		});
	} finally {
		globalThis.fetch = previousFetch;
		if (previousKey === undefined) delete process.env.TYPESAFE_API_KEY;
		else process.env.TYPESAFE_API_KEY = previousKey;
	}
	const stored = await t.run(async (ctx) => ({
		state: await ctx.db.query("definitionTexts").unique(),
		scroll: await ctx.db.query("scrolls").unique(),
		sentence: await ctx.db.query("sentences").unique(),
		segments: await ctx.db.query("segments").collect(),
	}));
	expect(stored.state?.state).toBe("Ready");
	expect(stored.scroll?.origin).toEqual({
		kind: "Definition",
		readingKey: ownerReadingKey,
	});
	expect(stored.sentence?.language).toBe("he");
	expect(stored.sentence?.segmentationFailed).not.toBe(true);
	expect(stored.segments.map(({ text }) => text).join("")).toBe("בית");
	expect(stored.segments.some(({ kind }) => kind === "ResolvableText")).toBe(
		true,
	);
});
