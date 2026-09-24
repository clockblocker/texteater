import { expect, test } from "bun:test";
import { Effect, Fiber } from "effect";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import { choiceAnswers } from "../src/testing.js";
import type { OperationTrace, SegmentedSentence } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Counts requests in flight across both executors. */
function inFlight() {
	let current = 0;
	let peak = 0;
	return {
		get peak() {
			return peak;
		},
		async during<T>(work: () => Promise<T>): Promise<T> {
			current++;
			peak = Math.max(peak, current);
			try {
				return await work();
			} finally {
				current--;
			}
		},
	};
}

type Intake = {
	language: string;
	validity?: string;
	stitching?: string;
	delayMs?: number;
};
/** Answers intake by source text; the stitching repair joins split words. */
function intake(plan: Record<string, Intake>, counter = inFlight()) {
	const judge: TypeSafeExecutor = (request) =>
		counter.during(async () => {
			const { sourceText } = request.state as { sourceText: string };
			const item = plan[sourceText];
			if (!item) throw Error(`No plan for ${sourceText}`);
			await sleep(item.delayMs ?? 5);
			return choiceAnswers(request.questions, (id) =>
				id === "language"
					? item.language
					: id === "validity"
						? (item.validity ?? "Accepted")
						: (item.stitching ?? "Unchanged"),
			);
		});
	return { judge, counter };
}

function queuedEvents(trace: OperationTrace | undefined) {
	return (trace?.events ?? []).filter(
		(event) => event.kind === "RequestQueued",
	) as { kind: string; data: { callId: string; waitMs: number } }[];
}

function longSentence(id: string): SegmentedSentence<"de"> {
	const text = `${Array.from({ length: 30 }, (_, index) => `Wort${index}`).join(" ")}.`;
	return {
		id,
		language: "de",
		segments: segmentGerman(text).segments.map(({ kind, text }) => ({
			kind,
			text,
		})),
	};
}

test("one instance never has more than 16 requests in flight across segment and analyzeSentence", async () => {
	const counter = inFlight();
	const sentences = Array.from(
		{ length: 25 },
		(_, index) => `Satz ${index}.`,
	);
	let analysisCalls = 0;
	const dumgen = createDumgen({
		judge: (request) =>
			counter.during(async () => {
				await sleep(10);
				if ("sourceText" in (request.state as object))
					return choiceAnswers(request.questions, (id) =>
						id === "language"
							? "de"
							: id === "validity"
								? "Accepted"
								: "Unchanged",
					);
				analysisCalls++;
				throw Error("offline");
			}),
		execute: async () => {
			throw Error("Unexpected stitching");
		},
	});
	await Effect.runPromise(
		Effect.all(
			[
				dumgen.segment({
					sourceSentences: [
						sentences[0] ?? "",
						...sentences.slice(1),
					],
				}),
				...["a", "b", "c"].map((id) =>
					Effect.either(
						dumgen.analyzeSentence({ sentence: longSentence(id) }),
					),
				),
			],
			{ concurrency: "unbounded" },
		),
	);
	expect(analysisCalls).toBeGreaterThan(3);
	expect(counter.peak).toBe(16);
});

test("with a budget of 1, queue wait stays out of each call's duration and the waiting call records RequestQueued", async () => {
	const traces: OperationTrace[] = [];
	const { judge } = intake({
		"Eins.": { language: "de", delayMs: 40 },
		"Zwei.": { language: "de", delayMs: 40 },
	});
	const dumgen = createDumgen({
		judge,
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		requestBudget: 1,
		onOperation: (trace) => traces.push(trace),
	});
	await Effect.runPromise(
		dumgen.segment({ sourceSentences: ["Eins.", "Zwei."] }),
	);
	const calls = traces[0]?.calls ?? [];
	expect(calls).toHaveLength(2);
	for (const call of calls) {
		expect(call.durationMs).toBeGreaterThanOrEqual(35);
		expect(call.durationMs).toBeLessThan(100);
	}
	const queued = queuedEvents(traces[0]);
	expect(queued).toHaveLength(1);
	expect(queued[0]?.data.callId).toBe(calls[1]?.id ?? "missing");
	expect(queued[0]?.data.waitMs).toBeGreaterThanOrEqual(35);
	expect(
		(calls[1]?.startedAt ?? 0) - (calls[0]?.startedAt ?? 0),
	).toBeGreaterThanOrEqual(35);
});

test("with a budget of 1, a sentence waiting for its stitching call cannot deadlock the budget", async () => {
	const { judge } = intake({
		"Hal lo.": { language: "de", stitching: "Needed" },
		"Wie geht es?": { language: "de" },
	});
	const dumgen = createDumgen({
		judge,
		execute: async () => ({ output: { stitchedText: "Hallo." } }),
		requestBudget: 1,
	});
	const decisions = await Effect.runPromise(
		dumgen.segment({ sourceSentences: ["Hal lo.", "Wie geht es?"] }),
	);
	expect(decisions.map((decision) => decision.decision)).toEqual([
		"Accepted",
		"Accepted",
	]);
});

test("mixed languages, clean and stitched sentences and terminal rejections keep order and links under a small budget", async () => {
	const traces: { trace: OperationTrace; calls: number }[] = [];
	const plan: Record<string, Intake> = {
		"Hal lo Welt.": { language: "de", stitching: "Needed", delayMs: 30 },
		"The house.": { language: "en", delayMs: 5 },
		"Ghjk qwrt.": {
			language: "Unresolved",
			validity: "Unintelligible",
			delayMs: 20,
		},
		"Bonjour tout le monde.": {
			language: "UnsupportedLanguage",
			delayMs: 1,
		},
		"שלום עולם.": { language: "he", delayMs: 10 },
		"Gu ten Tag.": { language: "de", stitching: "Needed", delayMs: 2 },
	};
	const { judge, counter } = intake(plan);
	const dumgen = createDumgen({
		judge,
		execute: (request) =>
			counter.during(async () => {
				const { sourceText } = request.input as { sourceText: string };
				// Stitching finishes in the reverse of its judgments' order.
				await sleep(sourceText === "Gu ten Tag." ? 30 : 2);
				return {
					output: {
						stitchedText:
							sourceText === "Gu ten Tag."
								? "Guten Tag."
								: "Hallo Welt.",
					},
				};
			}),
		requestBudget: 2,
		onOperation: (trace) =>
			traces.push({ trace, calls: trace.calls.length }),
	});
	const sources = Object.keys(plan);
	const decisions = await Effect.runPromise(
		dumgen.segment({
			sourceSentences: [sources[0] ?? "", ...sources.slice(1)],
		}),
	);
	expect(
		decisions.map((decision) =>
			decision.decision === "Accepted"
				? `${decision.language}:${decision.sentence.segments.map(({ text }) => text).join("")}`
				: decision.decision,
		),
	).toEqual([
		"de:Hallo Welt.",
		"en:The house.",
		"Unintelligible",
		"UnsupportedLanguage",
		"he:שלום עולם.",
		"de:Guten Tag.",
	]);
	expect(counter.peak).toBe(2);
	const [{ trace, calls: atEmission } = { trace: undefined, calls: 0 }] =
		traces;
	const calls = trace?.calls ?? [];
	for (const stitching of calls.filter((call) => call.executor === "Luna")) {
		const { sourceText } = stitching.request.input as {
			sourceText: string;
		};
		const judgment = calls.find(
			(call) =>
				call.executor === "TypeSafe" &&
				(call.request.input as { sourceText: string }).sourceText ===
					sourceText,
		);
		expect(stitching.dependsOn).toEqual([judgment?.id ?? "missing"]);
	}
	expect(queuedEvents(trace).length).toBeGreaterThan(0);
	await sleep(40);
	expect(calls).toHaveLength(atEmission);
});

test("a failed sentence interrupts active work, and queued requests never start or record a call", async () => {
	for (const mode of ["provider", "malformed"] as const) {
		const traces: OperationTrace[] = [];
		const started: string[] = [];
		const dumgen = createDumgen({
			judge: async (request, options) => {
				const { sourceText } = request.state as { sourceText: string };
				started.push(sourceText);
				if (sourceText !== "Eins.")
					return new Promise((_resolve, reject) =>
						options?.signal?.addEventListener("abort", () =>
							reject(Error("Canceled")),
						),
					);
				await sleep(5);
				if (mode === "provider") throw Error("offline");
				return { answers: {} } as never;
			},
			execute: async () => {
				throw Error("Unexpected stitching");
			},
			requestBudget: 2,
			onOperation: (trace) => traces.push(trace),
		});
		const result = await Effect.runPromise(
			Effect.either(
				dumgen.segment({
					sourceSentences: ["Eins.", "Zwei.", "Drei.", "Vier."],
				}),
			),
		);
		expect(result).toMatchObject({
			_tag: "Left",
			left: {
				_tag:
					mode === "provider"
						? "ProviderFailure"
						: "InvalidModelOutput",
			},
		});
		expect(started).toEqual(["Eins.", "Zwei."]);
		expect(
			traces[0]?.calls.map((call): string => call.transport).sort(),
		).toEqual(
			[mode === "provider" ? "Failure" : "Success", "Interrupted"].sort(),
		);
	}
});

test("cancellation interrupts active requests; queued ones never start or record a call", async () => {
	const traces: OperationTrace[] = [];
	let started = 0;
	const dumgen = createDumgen({
		judge: (_request, options) => {
			started++;
			return new Promise((_resolve, reject) =>
				options?.signal?.addEventListener("abort", () =>
					reject(Error("Canceled")),
				),
			);
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		requestBudget: 1,
		onOperation: (trace) => traces.push(trace),
	});
	const fiber = Effect.runFork(
		dumgen.segment({ sourceSentences: ["Eins.", "Zwei.", "Drei."] }),
	);
	while (!started) await sleep(1);
	await Effect.runPromise(Fiber.interrupt(fiber));
	await sleep(10);
	expect(started).toBe(1);
	expect(traces[0]?.outcome).toBe("Interrupted");
	expect(traces[0]?.calls.map((call) => call.transport)).toEqual([
		"Interrupted",
	]);
	expect(queuedEvents(traces[0])).toEqual([]);
});

test("every sentence gets a SentenceOutcome: finished ones keep theirs, running ones are Interrupted and queued ones NotStarted", async () => {
	const traces: OperationTrace[] = [];
	const dumgen = createDumgen({
		judge: async (request, options) => {
			const { sourceText } = request.state as { sourceText: string };
			if (sourceText === "Bonjour.")
				return choiceAnswers(request.questions, (id) =>
					id === "language"
						? "UnsupportedLanguage"
						: id === "validity"
							? "Accepted"
							: "Unchanged",
				);
			if (sourceText === "Hallo.")
				return choiceAnswers(request.questions, (id) =>
					id === "language"
						? "de"
						: id === "validity"
							? "Accepted"
							: "Unchanged",
				);
			if (sourceText === "Kaputt.") {
				await sleep(10);
				throw Error("offline");
			}
			return new Promise((_resolve, reject) =>
				options?.signal?.addEventListener("abort", () =>
					reject(Error("Canceled")),
				),
			);
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		requestBudget: 3,
		onOperation: (trace) => traces.push(trace),
	});
	const result = await Effect.runPromise(
		Effect.either(
			dumgen.segment({
				sourceSentences: [
					"Hallo.",
					"Bonjour.",
					"Kaputt.",
					"Läuft noch.",
					"Wartet.",
					"Wartet auch.",
				],
			}),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "ProviderFailure" },
	});
	expect(
		traces[0]?.events
			.filter((event) => event.kind === "SentenceOutcome")
			.map((event) => event.data),
	).toEqual([
		{ index: 0, outcome: "Accepted", language: "de" },
		{ index: 1, outcome: "UnsupportedLanguage" },
		{ index: 2, outcome: "Failed", tag: "ProviderFailure" },
		{ index: 3, outcome: "Interrupted" },
		{ index: 4, outcome: "Interrupted" },
		{ index: 5, outcome: "NotStarted" },
	]);
});
