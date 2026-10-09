import type { Question } from "@typesafe-ai/sdk";
import { parseUnit, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";
import type {
	KnowledgeProduction,
	ProduceKnowledgeInput,
} from "../../src/knowledge/types.js";
import type { LunaAsk, LunaRequest } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import type { JevAsk, JevRequest } from "../../src/segment/jev.js";

/** What a fake jev answers one question: a choice, and how sure it is. */
export type JevPick =
	| string
	| { readonly choice: string; readonly confidence: number };

type SentJev = JevRequest & { readonly stage: string };

/**
 * A jev that answers each Choice by its question id from `answers`, a
 * function of the id and question, or with its first option.
 */
export function knowledgeJev(
	answers:
		| Readonly<Record<string, JevPick>>
		| ((id: string, question: Question) => JevPick | undefined) = {},
	options: { readonly fail?: (stage: string) => boolean } = {},
) {
	const sent: SentJev[] = [];
	const ask: JevAsk = async (request, { stage, signal }) => {
		sent.push({ ...request, stage });
		await new Promise((resolve) => setTimeout(resolve, 1));
		if (signal.aborted) throw Error("aborted");
		if (options.fail?.(stage)) throw Error("jev is down");
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.entries(request.questions).map(([id, question]) => {
					const configured =
						typeof answers === "function"
							? answers(id, question)
							: answers[id];
					const first =
						question.type === "choice"
							? (Object.keys(question.criteria ?? {})[0] ?? "")
							: "";
					const pick =
						typeof configured === "object"
							? configured
							: { choice: configured ?? first, confidence: 1 };
					return [
						id,
						{
							type: "choice",
							choice: pick.choice,
							confidence: pick.confidence,
							probabilities: { [pick.choice]: pick.confidence },
						},
					];
				}),
			),
			usage: { input_tokens: 100, output_tokens: 1 },
		};
	};
	return {
		ask,
		sent,
		stages: () => sent.map(({ stage }) => stage),
	};
}

/** The input a Knowledge Luna request carries. */
export type KnowledgeLunaInput = {
	readonly aspect: string;
	readonly reading: { readonly lemma: string; readonly kind: string };
	readonly language?: string;
	readonly markedSentence?: string;
};

/**
 * A Luna that answers each request by its input's `aspect` from `answers`
 * (a value, or a function of the input); a missing aspect, or one whose
 * answer is an Error, throws.
 */
export function knowledgeLuna(
	answers: Readonly<
		Record<string, unknown | ((input: KnowledgeLunaInput) => unknown)>
	>,
	options: {
		readonly delayMs?: number | ((aspect: string) => number);
	} = {},
) {
	const sent: LunaRequest[] = [];
	const aborted: string[] = [];
	const ask: LunaAsk = async (request, { signal }) => {
		sent.push(request);
		const input = request.input as KnowledgeLunaInput;
		const delay =
			typeof options.delayMs === "function"
				? options.delayMs(input.aspect)
				: (options.delayMs ?? 1);
		await new Promise((resolve) => setTimeout(resolve, delay));
		if (signal.aborted) {
			aborted.push(input.aspect);
			throw Error("aborted");
		}
		const answer = answers[input.aspect];
		const output =
			typeof answer === "function"
				? (answer as (input: KnowledgeLunaInput) => unknown)(input)
				: answer;
		if (output === undefined || output instanceof Error)
			throw output instanceof Error
				? output
				: Error(`No answer for ${input.aspect}`);
		return {
			output,
			metadata: { usage: { input_tokens: 50, output_tokens: 10 } },
		};
	};
	return {
		ask,
		sent,
		aborted,
		aspects: () =>
			sent.map((request) => (request.input as KnowledgeLunaInput).aspect),
	};
}

type LemmaShape = {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures?: Readonly<Record<string, unknown>>;
};

/**
 * What an Attestation records on each route these tests use, beside its
 * Surface and members: whether its Surface carries inflection, left empty,
 * and its evidence, none. Knowledge reads only the Lemma and
 * `valencyEvidence`.
 */
const routeFields: Readonly<
	Record<
		string,
		{
			readonly inflects: boolean;
			readonly fields: Readonly<Record<string, unknown>>;
		}
	>
> = {
	"Lexeme/NOUN": {
		inflects: true,
		fields: { articleEvidence: null, valencyEvidence: [] },
	},
	"Lexeme/VERB": {
		inflects: true,
		fields: { expletiveEvidence: null, valencyEvidence: [] },
	},
	"Lexeme/ADJ": {
		inflects: true,
		fields: { articleEvidence: null, valencyEvidence: [] },
	},
	"Lexeme/PRON": { inflects: true, fields: { articleEvidence: null } },
	"Locution/VERB": {
		inflects: true,
		fields: { expletiveEvidence: null, valencyEvidence: [] },
	},
	"Locution/ADV": { inflects: true, fields: {} },
	"Locution/INTJ": { inflects: false, fields: {} },
	"Saying/Saying": { inflects: false, fields: {} },
};

/** `value` as Dumling parses it on `lemma`'s route, or a thrown error. */
function parsedOn<U extends "Reading" | "Attestation">(
	unitKind: U,
	lemma: Dumling.Lemma<"de">,
	value: unknown,
) {
	const parsed = parseUnit(value, { unitKind, ...routeOf(lemma) });
	if (!parsed.success) throw parsed.error;
	return parsed.chain.value;
}

/**
 * A Knowledge input for `lemma`'s Reading `emoji` in `sentence`, the
 * target the words `target` marks, with whatever the test overrides.
 * Dumling parses the Lemma, the Reading and the Attestation on the
 * Lemma's route.
 */
export function knowledgeInput<E = never>(
	shape: LemmaShape,
	emoji: string,
	sentence: string,
	target: readonly string[],
	overrides: Partial<ProduceKnowledgeInput<E>> & {
		readonly valencyEvidence?: readonly unknown[];
	} = {},
): ProduceKnowledgeInput<E> {
	const words = sentence.split(/(\s+|[.,!?])/u).filter((piece) => piece);
	const segments = words.map((text) => ({ text }));
	const indices = target.map((word) => {
		const index = words.indexOf(word);
		if (index < 0) throw Error(`${word} is no word of ${sentence}`);
		return index;
	});
	const parsedLemma = parseUnit({
		unitKind: "Lemma",
		language: "de",
		coreFeatures: {},
		...shape,
	});
	if (!parsedLemma.success) throw parsedLemma.error;
	const { chain } = parsedLemma;
	if (chain.unitKind !== "Lemma" || chain.language !== "de")
		throw Error(`${shape.canonicalForm} is no German Lemma`);
	const lemma = chain.value;
	const route = routeFields[`${lemma.family}/${lemma.kind}`];
	if (!route)
		throw Error(`No Attestation fields for ${lemma.family}/${lemma.kind}`);
	const { valencyEvidence, ...rest } = overrides;
	return {
		language: "de",
		reading: parsedOn("Reading", lemma, {
			unitKind: "Reading",
			lemma,
			emojiDescription: emoji,
		}),
		attestation: parsedOn("Attestation", lemma, {
			unitKind: "Attestation",
			members: target.map((attested) => ({
				attested,
				orthography: "Standard",
			})),
			realizationCoverage: "Full",
			...route.fields,
			...(valencyEvidence ? { valencyEvidence } : {}),
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: target.join(" "),
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
				...(route.inflects ? { inflectionalFeatures: null } : {}),
				lemma,
			},
		}),
		sentence: { segments, target: indices },
		origin: "New",
		request: {},
		...rest,
	};
}

/** Runs one `knowledge.produce` and keeps its trace. */
export async function produceOnce<E = never>(
	models: { readonly jev: JevAsk; readonly luna: LunaAsk },
	input: ProduceKnowledgeInput<E>,
): Promise<{
	readonly result: KnowledgeProduction;
	readonly trace: OperationTrace | undefined;
}> {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		createDumgen({
			...models,
			onOperation: (trace) => traces.push(trace),
		}).knowledge.produce(input),
	);
	return { result, trace: traces[0] };
}

/** A German ADP Lemma, as `valencyEvidence` and frames name it. */
export const adp = (canonicalForm: string) => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

/** One governed preposition an occurrence attests. */
export const attestedPreposition = (
	preposition: string,
	governedCase: string,
	member = 1,
) => ({
	member,
	complement: {
		kind: "Preposition",
		preposition: adp(preposition),
		governedCase,
		referent: "Something",
	},
	realizedCase: governedCase,
});
