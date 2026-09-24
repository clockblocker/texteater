import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import type { TypeSafeExecutor } from "promptsmith/typesafe";
import { operationExperiment } from "../src/development.js";
import type {
	JudgmentRequest,
	LemmaCandidate,
	OperationTrace,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";
import { grammarFixture } from "./grammar-fixture.js";

type SentRequest = Parameters<TypeSafeExecutor>[0];
const route = "grammatical-resolution/de/lexeme/adjective";
const caseId = "grammar-de-adj-demo-attributive-klein";
const stored = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADJ",
	canonicalForm: "klein",
	coreFeatures: { abbr: null, foreign: null, numType: null, variant: null },
} as const satisfies Dumling.Lemma<"de">;

/** Runs the evaluator on one retained case with a recording fake executor. */
async function evaluate(extra: { lemmaCandidates?: LemmaCandidate[] } = {}) {
	const golden = operationExperiment(route, grammarFixture(null)).corpus
		.cases[caseId];
	if (!golden) throw Error(`Missing ${caseId}`);
	const fixture = grammarFixture(golden.idealOutput);
	const requests: SentRequest[] = [],
		traces: OperationTrace[] = [];
	const experiment = operationExperiment(route, {
		...fixture,
		judge: async (request) => {
			requests.push(request);
			return fixture.judge(request);
		},
	});
	const output = await experiment.run(
		{ ...(golden.input as object), ...extra },
		{
			signal: new AbortController().signal,
			recordTrace: (trace) => traces.push(trace as OperationTrace),
		},
	);
	return { output, requests, traces };
}
const canonicalOptions = (request: SentRequest | undefined) => {
	const question = request?.questions.canonical;
	if (question?.type !== "choice") throw Error("Expected canonical choice");
	return question.criteria;
};

test("an injected stored Lemma is offered as a canonical candidate and traced", async () => {
	const candidate = { lemma: stored, foundUnder: ["kleine"] };
	const { output, requests, traces } = await evaluate({
		lemmaCandidates: [candidate],
	});
	expect(canonicalOptions(requests[0])).toMatchObject({
		candidate_0: "klein",
	});
	const traced = traces[0]?.calls.find((call) => call.executor === "TypeSafe")
		?.request as JudgmentRequest | undefined;
	expect(traced?.input).toMatchObject({
		canonicalFormAlternatives: ["klein"],
		storedLemmas: [stored],
	});
	expect(traces[0]?.input).toMatchObject({ lemmaCandidates: [candidate] });
	expect(output).toMatchObject({ lemma: { canonicalForm: "klein" } });
});

test("a stored Lemma found under another word of the sentence is not offered", async () => {
	const { requests } = await evaluate({
		lemmaCandidates: [
			{ lemma: stored, foundUnder: ["Hund", "Der kleine"] },
		],
	});
	expect(
		Object.keys(canonicalOptions(requests[0])).filter((key) =>
			key.startsWith("candidate_"),
		),
	).toEqual([]);
	expect(requests[0]?.state).toMatchObject({
		canonicalFormAlternatives: [],
		storedLemmas: [],
	});
});

test("without injection the request is the one production sends with no candidates", async () => {
	const { requests } = await evaluate();
	expect(
		Object.keys(canonicalOptions(requests[0])).filter((key) =>
			key.startsWith("candidate_"),
		),
	).toEqual([]);
	const direct: SentRequest[] = [];
	const fixture = grammarFixture(
		operationExperiment(route, grammarFixture(null)).corpus.cases[caseId]
			?.idealOutput,
	);
	await Effect.runPromise(
		createDumgen({
			...fixture,
			judge: async (request) => {
				direct.push(request);
				return fixture.judge(request);
			},
		}).resolveGrammar(
			validateEncounter({
				sentence: {
					id: "evaluation",
					language: "de",
					segments: [
						{ kind: "ResolvableText", text: "Der" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "kleine" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "Hund" },
						{ kind: "Whitespace", text: " " },
						{ kind: "ResolvableText", text: "schläft" },
						{ kind: "Punctuation", text: "." },
					],
				},
				target: {
					family: "Lexeme",
					kind: "ADJ",
					memberSegmentIndices: [2],
				},
			}),
		),
	);
	expect(requests.length).toBeGreaterThan(0);
	expect(requests.map((request) => JSON.stringify(request))).toEqual(
		direct.map((request) => JSON.stringify(request)),
	);
});
