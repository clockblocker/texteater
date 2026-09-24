import { expect, test } from "bun:test";
import { Effect, Exit, Fiber } from "effect";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import { choiceAnswers, rejectJudgment } from "../src/testing.js";
import type {
	CallTrace,
	DumgenOptions,
	KnowledgeInput,
	OperationTrace,
	SegmentedSentence,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A transport that notices the abort, then takes a moment to settle. */
function settleAfterAbort(signal: AbortSignal | undefined): Promise<never> {
	return new Promise<never>((_resolve, reject) =>
		signal?.addEventListener(
			"abort",
			() => setTimeout(() => reject(Error("Canceled")), 10),
			{ once: true },
		),
	);
}

/** Records each trace with its call count at emission, to catch late calls. */
function traced() {
	const traces: { trace: OperationTrace; callsAtEmission: number }[] = [];
	return {
		traces,
		onOperation: (trace: OperationTrace) =>
			traces.push({ trace, callsAtEmission: trace.calls.length }),
		/** Waits past every transport's settle delay, then checks nothing was recorded late. */
		async settled() {
			await sleep(40);
			for (const { trace, callsAtEmission } of traces)
				expect(trace.calls).toHaveLength(callsAtEmission);
			return traces.map(({ trace }) => trace);
		},
	};
}

const transports = (calls: readonly CallTrace[]): string[] =>
	calls.map((call) => call.transport).sort();

test("segment: one failed sentence interrupts its running siblings and records nothing after its trace", async () => {
	const recorder = traced();
	const dumgen = createDumgen({
		judge: async (request, options) => {
			const { sourceText } = request.state as { sourceText: string };
			if (sourceText !== "Eins.")
				return settleAfterAbort(options?.signal);
			await sleep(5);
			throw Error("offline");
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		onOperation: recorder.onOperation,
	});
	const result = await Effect.runPromise(
		Effect.either(
			dumgen.segment({ sourceSentences: ["Eins.", "Zwei.", "Drei."] }),
		),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "ProviderFailure" },
	});
	const [trace] = await recorder.settled();
	expect(trace?.outcome).toBe("Failure");
	expect(transports(trace?.calls ?? [])).toEqual([
		"Failure",
		"Interrupted",
		"Interrupted",
	]);
});

test("segment: cancellation interrupts every sentence and records nothing after its trace", async () => {
	const recorder = traced();
	let started = 0;
	const dumgen = createDumgen({
		judge: (_request, options) => {
			started++;
			return settleAfterAbort(options?.signal);
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		onOperation: recorder.onOperation,
	});
	const fiber = Effect.runFork(
		dumgen.segment({ sourceSentences: ["Eins.", "Zwei.", "Drei."] }),
	);
	while (started < 3) await sleep(1);
	const exit = await Effect.runPromise(Fiber.interrupt(fiber));
	expect(Exit.isInterrupted(exit)).toBe(true);
	const [trace] = await recorder.settled();
	expect(trace?.outcome).toBe("Interrupted");
	expect(transports(trace?.calls ?? [])).toEqual([
		"Interrupted",
		"Interrupted",
		"Interrupted",
	]);
});

test("interruption waits for an executor that is still running, and its call says Interrupted", async () => {
	const recorder = traced();
	let entered: () => void = () => {};
	const running = new Promise<void>((resolve) => (entered = resolve));
	let settled = false;
	const dumgen = createDumgen({
		judge: async () => {
			entered();
			// Ignores the abort for a while, like a transport mid-response.
			await sleep(30);
			settled = true;
			throw Error("late");
		},
		execute: async () => {
			throw Error("Unexpected stitching");
		},
		onOperation: recorder.onOperation,
	});
	const fiber = Effect.runFork(
		dumgen.segment({ sourceSentences: ["Eins."] }),
	);
	await running;
	await Effect.runPromise(Fiber.interrupt(fiber));
	expect(settled).toBe(true);
	expect(recorder.traces).toHaveLength(1);
	const [trace] = await recorder.settled();
	expect(trace?.calls.map((call) => call.transport)).toEqual(["Interrupted"]);
});

/** A sentence long enough that its questions need more than one judgment. */
function longSentence(): SegmentedSentence<"de"> {
	const text = `${Array.from({ length: 30 }, (_, index) => `Wort${index}`).join(" ")}.`;
	return {
		id: "long",
		language: "de",
		segments: segmentGerman(text).segments.map(({ kind, text }) => ({
			kind,
			text,
		})),
	};
}

test("analyzeSentence: a failed chunk fails the analysis and interrupts its sibling chunks", async () => {
	const recorder = traced();
	let calls = 0;
	const dumgen = createDumgen({
		judge: async (_request, options) => {
			if (calls++ > 0) return settleAfterAbort(options?.signal);
			await sleep(5);
			throw Error("offline");
		},
		execute: async () => {
			throw Error("Unexpected generation");
		},
		onOperation: recorder.onOperation,
	});
	const result = await Effect.runPromise(
		Effect.either(dumgen.analyzeSentence({ sentence: longSentence() })),
	);
	expect(result).toMatchObject({
		_tag: "Left",
		left: { _tag: "ProviderFailure" },
	});
	const [trace] = await recorder.settled();
	expect(calls).toBeGreaterThan(1);
	expect(transports(trace?.calls ?? [])).toEqual([
		"Failure",
		...Array.from({ length: calls - 1 }, () => "Interrupted"),
	]);
});

test("analyzeSentence: cancellation interrupts every chunk and records nothing after its trace", async () => {
	const recorder = traced();
	let started = 0;
	const dumgen = createDumgen({
		judge: (_request, options) => {
			started++;
			return settleAfterAbort(options?.signal);
		},
		execute: async () => {
			throw Error("Unexpected generation");
		},
		onOperation: recorder.onOperation,
	});
	const fiber = Effect.runFork(
		dumgen.analyzeSentence({ sentence: longSentence() }),
	);
	while (started < 2) await sleep(1);
	await sleep(5);
	await Effect.runPromise(Fiber.interrupt(fiber));
	const [trace] = await recorder.settled();
	expect(trace?.outcome).toBe("Interrupted");
	expect(trace?.calls.length).toBe(started);
	expect(trace?.calls.every((call) => call.transport === "Interrupted")).toBe(
		true,
	);
});

test("out-of-order completion links each stitching call to its own sentence's judgment", async () => {
	const recorder = traced();
	const sourceSentences = ["Hal lo.", "Gu ten Tag.", "Wie geht es?"] as const;
	/** Later sentences answer first. */
	const delay = (sourceText: string) =>
		(sourceSentences.length -
			sourceSentences.indexOf(sourceText as never)) *
		10;
	const dumgen = createDumgen({
		judge: async (request) => {
			const { sourceText } = request.state as { sourceText: string };
			await sleep(delay(sourceText));
			return choiceAnswers(request.questions, (id) =>
				id === "language"
					? "de"
					: id === "validity"
						? "Accepted"
						: sourceText === "Wie geht es?"
							? "Unchanged"
							: "Needed",
			);
		},
		execute: async (request) => {
			const { sourceText } = request.input as { sourceText: string };
			await sleep(delay(sourceText));
			return {
				output: { stitchedText: sourceText.replace(" ", "") },
			};
		},
		onOperation: recorder.onOperation,
	});
	await Effect.runPromise(
		dumgen.segment({ sourceSentences: [...sourceSentences] }),
	);
	const [trace] = await recorder.settled();
	const calls = trace?.calls ?? [];
	const stitching = calls.filter((call) => call.executor === "Luna");
	expect(stitching).toHaveLength(2);
	for (const call of stitching) {
		const { sourceText } = call.request.input as { sourceText: string };
		const judgment = calls.find(
			(candidate) =>
				candidate.executor === "TypeSafe" &&
				(candidate.request.input as { sourceText: string })
					.sourceText === sourceText,
		);
		expect(call.dependsOn).toEqual([judgment?.id ?? "missing"]);
	}
	// Recorded in completion order, not issue order.
	expect(
		calls
			.filter((call) => call.executor === "TypeSafe")
			.map(
				(call) =>
					(call.request.input as { sourceText: string }).sourceText,
			),
	).toEqual([...sourceSentences].reverse());
});

const knowledgeInput = {
	encounter: {
		sentence: {
			id: "knowledge",
			language: "de",
			segments: [{ kind: "ResolvableText", text: "Bank" }],
		},
		target: { family: "Lexeme", kind: "NOUN", memberSegmentIndices: [0] },
	},
	reading: {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		},
		emojiDescription: "💰",
	},
	request: {
		definition: null,
		translations: { en: null, ru: null },
		semanticRelations: { synonym: null },
	},
} as const satisfies KnowledgeInput<"de">;

type KnowledgeRequestInput = {
	aspect?: string;
	language?: string;
	requestedRelations?: string[];
};

test("a relation judgment links to its own candidate generation when text jobs finish in reverse order", async () => {
	const recorder = traced();
	const order = ["definition", "en", "ru"];
	const dumgen = createDumgen({
		execute: async (request) => {
			const input = request.input as KnowledgeRequestInput;
			if (input.requestedRelations)
				return { output: { candidates: ["Geldinstitut"] } };
			const key = input.language ?? input.aspect ?? "";
			await sleep((order.length - order.indexOf(key)) * 10);
			return { output: { text: `${key} text` } };
		},
		judge: async (request) =>
			choiceAnswers(request.questions, (id) =>
				id.startsWith("kind_") ? "NOUN" : "synonym",
			),
		onOperation: recorder.onOperation,
	});
	const result = await Effect.runPromise(
		dumgen.produceKnowledge(knowledgeInput),
	);
	expect(result.failures).toEqual([]);
	const [trace] = await recorder.settled();
	const calls = trace?.calls ?? [];
	const generation = calls.find(
		(call) =>
			(call.request.input as KnowledgeRequestInput).requestedRelations,
	);
	const judgment = calls.find((call) => call.executor === "TypeSafe");
	expect(judgment?.dependsOn).toEqual([generation?.id ?? "missing"]);
	for (const call of calls.filter((call) => call !== judgment))
		expect(call.dependsOn).toEqual([]);
});

test("produceKnowledge: one aspect's ProviderFailure leaves its siblings' contributions and shows the failure", async () => {
	const delivered: unknown[] = [];
	const dumgen = createDumgen({
		execute: async (request) => {
			const input = request.input as KnowledgeRequestInput;
			if (input.aspect === "definition") throw Error("offline");
			return { output: { text: `${input.language} text` } };
		},
		judge: rejectJudgment,
		onKnowledgeContribution: (changes) => delivered.push(...changes),
	});
	const result = await Effect.runPromise(
		dumgen.produceKnowledge({
			...knowledgeInput,
			request: { definition: null, translations: { en: null, ru: null } },
		}),
	);
	expect(result.failures).toMatchObject([
		{ aspect: "definition", code: "ProviderFailure" },
	]);
	expect(result.changes).toHaveLength(2);
	expect(delivered).toHaveLength(2);
});

test("produceKnowledge: no contribution is delivered after interruption", async () => {
	const recorder = traced();
	const delivered: unknown[] = [];
	let entered: () => void = () => {};
	const waiting = new Promise<void>((resolve) => (entered = resolve));
	const options: DumgenOptions = {
		execute: async (request) => {
			const input = request.input as KnowledgeRequestInput;
			if (input.aspect === "definition")
				return { output: { text: "Ein Geldinstitut." } };
			entered();
			// Answers with valid text even after the abort.
			await new Promise((resolve) =>
				request.signal.addEventListener("abort", resolve, {
					once: true,
				}),
			);
			await sleep(5);
			return { output: { text: "bank" } };
		},
		judge: rejectJudgment,
		onKnowledgeContribution: (changes) => delivered.push(...changes),
		onOperation: recorder.onOperation,
	};
	const fiber = Effect.runFork(
		createDumgen(options).produceKnowledge({
			...knowledgeInput,
			request: { definition: null, translations: { en: null } },
		}),
	);
	await waiting;
	while (!delivered.length) await sleep(1);
	await Effect.runPromise(Fiber.interrupt(fiber));
	const [trace] = await recorder.settled();
	expect(delivered).toMatchObject([{ aspect: "definition" }]);
	expect(trace?.outcome).toBe("Interrupted");
	expect(transports(trace?.calls ?? [])).toEqual(["Interrupted", "Success"]);
});
