import { afterEach, expect, test } from "bun:test";
import { api } from "../convex/_generated/api";
import { GERMAN_ONLY_MESSAGE } from "../server/intake";
import { createTestConvex, type TestConvexDb } from "./support/convex";
import { asksAbout, fakeJev, germanAnswers } from "./support/jev";
import { fakeTypeSafe, unavailableProviders } from "./support/providers";

/**
 * The intake action end to end: `submitText` with the real TypeSafe ask
 * answered by a fake jev over `fetch`, so no test reaches a live model.
 */

let restore: (() => void) | undefined;
afterEach(() => {
	restore?.();
	restore = undefined;
});

function typeSafe(jev = fakeJev({ answers: germanAnswers })) {
	const providers = fakeTypeSafe(jev);
	restore = providers.restore;
	return providers;
}

/** Rows the submission wrote; a Rejected or failed one writes none. */
async function storedTexts(t: TestConvexDb) {
	return t.run(async (ctx) => [
		...(await ctx.db.query("texts").collect()),
		...(await ctx.db.query("sentences").collect()),
	]);
}

function sentences(t: TestConvexDb) {
	return t.run((ctx) => ctx.db.query("sentences").collect());
}

function intakeRuns(t: TestConvexDb) {
	return t.run((ctx) => ctx.db.query("intakeRuns").collect());
}

const submit = (
	t: TestConvexDb,
	sourceText: string,
	options: { submissionKey?: string; language?: "de" | "en" | "he" } = {},
) =>
	t.action(api.orchestration.submitText, {
		visitorId: "visitor-1",
		submissionKey: options.submissionKey ?? sourceText,
		sourceText,
		...(options.language ? { language: options.language } : {}),
	});

test("a submitted German Text is split, segmented and stored with each Sentence's units, and its run records the jev tokens", async () => {
	const providers = typeSafe();
	const t = createTestConvex();
	const result = await submit(t, "Er gibt auf.\n\nEr wohnt im Haus.", {
		submissionKey: "key-1",
	});
	expect(result).toMatchObject({ status: "Accepted" });
	const stored = await sentences(t);
	expect(
		stored.map(({ position, paragraph, stitchedText }) => ({
			position,
			paragraph,
			stitchedText,
		})),
	).toEqual([
		{ position: 0, paragraph: 0, stitchedText: "Er gibt auf." },
		{ position: 1, paragraph: 1, stitchedText: "Er wohnt im Haus." },
	]);
	expect(stored[0]?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "PRON" },
		},
		{
			segments: [2, 4],
			route: { language: "de", family: "Lexeme", kind: "VERB" },
		},
	]);
	const [run] = await intakeRuns(t);
	const sent = providers.jev.sent;
	expect(run).toMatchObject({
		outcome: "Accepted",
		textId: result.status === "Accepted" ? result.textId : undefined,
		sentenceCount: 2,
		sentences: [
			{ segmentation: "Segmented" },
			{ segmentation: "Segmented" },
		],
		jev: {
			calls: sent.length,
			failed: 0,
			inputTokens: sent.reduce(
				(sum, { questions }) =>
					sum + 10 * Object.keys(questions).length,
				0,
			),
			outputTokens: sent.length,
		},
	});
	// The run keeps no Text, prompt or answer.
	expect(JSON.stringify(run)).not.toContain("gibt");

	// Re-submitting a stored Text asks nothing and returns the same Text.
	const asked = sent.length;
	expect(
		await submit(t, "Er gibt auf.\n\nEr wohnt im Haus.", {
			submissionKey: "key-1",
		}),
	).toEqual(result);
	expect(sent.length).toBe(asked);
});

test("a Text in another language is Rejected with the German-only message before any work", async () => {
	const providers = typeSafe();
	const t = createTestConvex();
	expect(await submit(t, "The way is the goal.", { language: "en" })).toEqual(
		{ status: "Rejected", message: GERMAN_ONLY_MESSAGE },
	);
	expect(providers.requests).toEqual([]);
	expect(await storedTexts(t)).toEqual([]);
	expect(await intakeRuns(t)).toEqual([]);
});

test("a text over the sentence limit is Rejected with its reason before any work", async () => {
	const providers = typeSafe();
	const sourceText = Array.from(
		{ length: 26 },
		(_, index) => `Satz ${index + 1} ist hier.`,
	).join(" ");
	const t = createTestConvex();
	await expect(submit(t, sourceText)).resolves.toEqual({
		status: "Rejected",
		message: "At most 25 sentences are allowed.",
	});
	expect(await storedTexts(t)).toEqual([]);
	expect(providers.requests).toEqual([]);
});

test("a Sentence jev cannot segment is stored with its written words, each word its own Unresolved unit", async () => {
	typeSafe(
		fakeJev({
			answers: germanAnswers,
			fail: (request) => asksAbout(request, "im Haus"),
		}),
	);
	const t = createTestConvex();
	expect(await submit(t, "Er gibt auf. Er wohnt im Haus.")).toMatchObject({
		status: "Accepted",
	});
	const [, failed] = await sentences(t);
	expect(failed?.stitchedText).toBe("Er wohnt im Haus.");
	// `im` keeps its spelling: no jev answer split it.
	expect(failed?.units).toEqual(
		[0, 2, 4, 6].map((index) => ({
			segments: [index],
			route: "Unresolved",
		})),
	);
	expect((await intakeRuns(t))[0]).toMatchObject({
		outcome: "Accepted",
		sentences: [{ segmentation: "Segmented" }, { segmentation: "Failed" }],
		jev: { failed: expect.any(Number) },
	});
	expect((await intakeRuns(t))[0]?.jev.failed).toBeGreaterThan(0);
});

test("with jev unavailable the Text is still stored, every Sentence unresolved", async () => {
	const providers = unavailableProviders();
	restore = providers.restore;
	const t = createTestConvex();
	expect(await submit(t, "Die Banken sind geschlossen.")).toMatchObject({
		status: "Accepted",
	});
	expect(providers.requests.length).toBeGreaterThan(0);
	const [sentence] = await sentences(t);
	expect(sentence?.units?.every(({ route }) => route === "Unresolved")).toBe(
		true,
	);
});

test("without a TypeSafe key the submission throws, stores nothing and records a Failed run", async () => {
	const providers = typeSafe();
	delete process.env.TYPESAFE_API_KEY;
	const t = createTestConvex();
	await expect(submit(t, "Die Banken sind geschlossen.")).rejects.toThrow(
		"TYPESAFE_API_KEY",
	);
	expect(providers.requests).toEqual([]);
	expect(await storedTexts(t)).toEqual([]);
	expect(await intakeRuns(t)).toEqual([
		expect.objectContaining({
			outcome: "Failed",
			failureTag: "Error",
			sentences: [{ segmentation: "NotStarted" }],
		}),
	]);
});
