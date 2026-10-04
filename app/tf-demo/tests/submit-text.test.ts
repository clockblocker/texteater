import { afterEach, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import {
	GERMAN_ONLY_MESSAGE,
	INTAKE_NOT_CONFIGURED_MESSAGE,
} from "../server/intake";
import type { TextLanguage } from "../shared/supported-target-language";
import { visitorErrorMessage } from "../src/lib/visitor-error";
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
	options: { submissionKey?: string; language?: TextLanguage } = {},
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

test("a Sentence jev cannot segment is stored with its written words, marked as not segmented and with no units", async () => {
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
	expect(failed).toMatchObject({ units: [], segmentationFailed: true });
	// `im` keeps its spelling: no jev answer split it.
	expect(
		(
			await t.run((ctx) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", failed?._id ?? ("" as never)),
					)
					.collect(),
			)
		).map(({ text }) => text),
	).toEqual(["Er", " ", "wohnt", " ", "im", " ", "Haus", "."]);
	expect((await intakeRuns(t))[0]).toMatchObject({
		outcome: "Accepted",
		sentences: [{ segmentation: "Segmented" }, { segmentation: "Failed" }],
		jev: { failed: expect.any(Number) },
	});
	expect((await intakeRuns(t))[0]?.jev.failed).toBeGreaterThan(0);
});

test("with jev unavailable the Text is still stored, every Sentence marked as not segmented", async () => {
	const providers = unavailableProviders();
	restore = providers.restore;
	const t = createTestConvex();
	expect(await submit(t, "Die Banken sind geschlossen.")).toMatchObject({
		status: "Accepted",
	});
	expect(providers.requests.length).toBeGreaterThan(0);
	const [sentence] = await sentences(t);
	expect(sentence).toMatchObject({ units: [], segmentationFailed: true });
});

test("without a TypeSafe key the submission fails with a NotConfigured error the Visitor sees, stores nothing and records a Failed run", async () => {
	const providers = typeSafe();
	delete process.env.TYPESAFE_API_KEY;
	const t = createTestConvex();
	const failure = await submit(t, "Die Banken sind geschlossen.").then(
		() => undefined,
		(error: unknown) => error,
	);
	expect(failure).toBeInstanceOf(ConvexError);
	expect(failure).toMatchObject({
		data: {
			code: "NotConfigured",
			message: INTAKE_NOT_CONFIGURED_MESSAGE,
		},
	});
	expect(visitorErrorMessage(failure)).toBe(INTAKE_NOT_CONFIGURED_MESSAGE);
	expect(providers.requests).toEqual([]);
	expect(await storedTexts(t)).toEqual([]);
	expect(await intakeRuns(t)).toEqual([
		expect.objectContaining({
			outcome: "Failed",
			failureTag: "ConvexError",
			sentences: [{ segmentation: "NotStarted" }],
		}),
	]);
});

test("with DEV inspection on, intake's segment.inUnits renders as inspection rows whose calls carry their prompts and answers; with it off nothing is captured (#885)", async () => {
	const providers = typeSafe();
	const previous = process.env.TF_INSPECTION;
	const submitInspected = (t: TestConvexDb) =>
		t.action(api.orchestration.submitText, {
			visitorId: "visitor-1",
			submissionKey: "inspected",
			sourceText: "Er gibt auf.",
			inspectionVisitorId: "visitor-1",
		});
	const inspection = (t: TestConvexDb) =>
		t.run(async (ctx) => ({
			steps: await ctx.db.query("inspectionSteps").collect(),
			payloads: await ctx.db.query("inspectionPayloads").collect(),
		}));
	try {
		// A hosted deployment leaves TF_INSPECTION unset: no rows, no payloads.
		delete process.env.TF_INSPECTION;
		const off = createTestConvex();
		await submitInspected(off);
		expect(await inspection(off)).toEqual({ steps: [], payloads: [] });

		process.env.TF_INSPECTION = "1";
		const on = createTestConvex();
		const sentBefore = providers.jev.sent.length;
		await submitInspected(on);
		const { steps, payloads } = await inspection(on);
		const root = steps.find((step) => step.parentId === undefined);
		expect(root?.name).toBe("Analyze submitted text");
		const operation = steps.find((step) => step.name === "segment.inUnits");
		expect(operation).toMatchObject({
			parentId: root?.id,
			owner: "battery/dumgen",
			status: "Success",
		});
		const calls = steps.filter(
			(step) =>
				step.parentId === operation?.id && step.kind === "TypeSafe",
		);
		expect(calls).toHaveLength(providers.jev.sent.length - sentBefore);
		expect(calls[0]).toMatchObject({ owner: "battery/dumgen · jev" });
		expect(calls[0]?.name).toEndWith("· Sentence 0");
		const payloadOf = (stepId: string) =>
			JSON.parse(
				payloads
					.filter((payload) => payload.stepId === stepId)
					.sort((a, b) => a.part - b.part)
					.map(({ text }) => text)
					.join(""),
			);
		for (const call of calls) {
			const payload = payloadOf(call._id);
			expect(payload.input.questions).toBeDefined();
			expect(payload.output.answers).toBeDefined();
			expect(payload.tokens.input).toBeGreaterThan(0);
		}
		// The payload carries no credential.
		expect(JSON.stringify(payloads)).not.toContain("fixture");
	} finally {
		if (previous === undefined) delete process.env.TF_INSPECTION;
		else process.env.TF_INSPECTION = previous;
	}
});
