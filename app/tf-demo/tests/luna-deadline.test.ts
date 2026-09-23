import { expect, test } from "bun:test";
import type { OperationTrace } from "dumgen/types";
import * as Effect from "effect/Effect";
import { createInspectionCapture } from "../server/inspectionCapture";
import {
	createProductionDumgen,
	createProductionKnowledgeDraft,
} from "../server/modelExecution";

const deadlineMs = 50;
const encounter = {
	sentence: {
		id: "deadline",
		language: "de",
		segments: [{ kind: "ResolvableText", text: "Bank" }],
	},
	target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
} as const;
const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;

/** Stalls every request whose system prompt matches `stalls` until its signal aborts; answers the rest. */
function stallingFetch(stalls: (systemPrompt: string) => boolean) {
	return async (_url: string | URL | Request, init?: RequestInit) => {
		const body = JSON.parse(String(init?.body));
		if (stalls(JSON.stringify(body.input[0])))
			return await new Promise<Response>((_resolve, reject) => {
				init?.signal?.addEventListener("abort", () =>
					reject(init.signal?.reason),
				);
			});
		return Response.json({
			status: "completed",
			output: [{ content: [{ type: "output_text", text: "answer" }] }],
		});
	};
}

test("a stalled draft leaf settles at the deadline while sibling leaves keep their texts", async () => {
	const inspection = createInspectionCapture();
	const started = performance.now();
	const draft = await Effect.runPromise(
		createProductionKnowledgeDraft(
			{
				encounter,
				lemma,
				request: {
					definition: null,
					transcription: null,
					translations: { en: null },
				},
			},
			inspection,
			{
				apiKey: "fixture",
				deadlineMs,
				fetch: stallingFetch((prompt) =>
					prompt.includes("German definition"),
				),
			},
		),
	);
	expect(performance.now() - started).toBeLessThan(deadlineMs + 1_000);
	expect(draft.texts.map((text) => text.aspect).sort()).toEqual([
		"transcription",
		"translations",
	]);
	const operation = JSON.parse(
		inspection.steps.find((step) => step.name === "draftKnowledge")
			?.payloadJson ?? "null",
	);
	expect(operation.generationConfiguration.settings.deadlineMs).toBe(
		deadlineMs,
	);
	expect(operation.events).toEqual([
		{
			kind: "KnowledgeDraftFailed",
			data: expect.objectContaining({ aspect: "definition" }),
		},
	]);
	const failed = inspection.steps
		.filter((step) => step.status === "Failure")
		.map((step) => JSON.parse(step.payloadJson).failure);
	expect(failed).toEqual([
		`LunaDeadlineExceeded: no response within ${deadlineMs} ms`,
	]);
});

test("settling a draft ends its stalled leaf and keeps the finished siblings", async () => {
	const inspection = createInspectionCapture();
	const settle = new AbortController();
	const pending = Effect.runPromise(
		createProductionKnowledgeDraft(
			{
				encounter,
				lemma,
				request: {
					definition: null,
					transcription: null,
					translations: { en: null },
				},
			},
			inspection,
			{
				apiKey: "fixture",
				settle: settle.signal,
				fetch: stallingFetch((prompt) =>
					prompt.includes("German definition"),
				),
			},
		),
	);
	await Bun.sleep(20);
	settle.abort();
	const draft = await pending;
	expect(draft.texts.map((text) => text.aspect).sort()).toEqual([
		"transcription",
		"translations",
	]);
	const failed = inspection.steps
		.filter((step) => step.status === "Failure")
		.map((step) => JSON.parse(step.payloadJson).failure);
	expect(failed).toEqual([
		"DraftSettled: the Reading committed without this leaf",
	]);
});

test("a stalled Emoji Description call fails the operation as ProviderFailure", async () => {
	const traces: OperationTrace[] = [];
	const started = performance.now();
	const result = await Effect.runPromise(
		Effect.either(
			createProductionDumgen(
				(event) => {
					if (event.kind === "TraceRecorded")
						traces.push(JSON.parse(event.traceJson));
				},
				{},
				undefined,
				{
					apiKey: "fixture",
					deadlineMs,
					fetch: stallingFetch(() => true),
				},
			).resolveOrGenerateReadingEmojiDescription({
				encounter,
				lemma,
				candidates: [],
			}),
		),
	);
	expect(performance.now() - started).toBeLessThan(deadlineMs + 1_000);
	expect(result._tag).toBe("Left");
	if (result._tag === "Left")
		expect<unknown>(result.left._tag).toBe("ProviderFailure");
	expect(traces).toHaveLength(1);
	expect(traces[0]?.generationConfiguration.settings.deadlineMs).toBe(
		deadlineMs,
	);
	expect(traces[0]?.calls.map((call) => call.failure)).toEqual([
		`LunaDeadlineExceeded: no response within ${deadlineMs} ms`,
	]);
});
