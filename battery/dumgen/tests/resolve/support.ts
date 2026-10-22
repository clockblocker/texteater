import type { Question } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import type { LunaAsk, LunaRequest } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type {
	GrammarResolution,
	ResolveGrammarInput,
} from "../../src/resolve/types.js";
import type { Answer } from "../../src/segment/ask.js";
import { type RouteKey, routeForKey } from "../../src/segment/de/routes.js";
import type { JevAsk, JevRequest } from "../../src/segment/jev.js";
import type {
	ClosedClassIdentity,
	Route,
	Segment,
	SegmentedSentence,
	Unit,
} from "../../src/segment/segmented-sentence.js";
import { segmentsOf } from "../lab/evaluation/spec-corpus/fixtures.js";
import { type FakeDumgenOptions, liveOver } from "../live-over.js";

export const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

type Sent = JevRequest & { readonly stage: string };

/**
 * A jev that answers each Choice from `answers` by question id, and any
 * other with its first option. `fail` makes a stage's request throw.
 */
export function fakeJev(
	answers: Readonly<Record<string, string>> = {},
	options: { readonly fail?: (stage: string) => boolean } = {},
) {
	const sent: Sent[] = [];
	const ask: JevAsk = async (request, { stage, signal }) => {
		sent.push({ ...request, stage });
		await new Promise((resolve) => setTimeout(resolve, 1));
		if (signal.aborted) throw Error("aborted");
		if (options.fail?.(stage)) throw Error("jev is down");
		return {
			model: request.model,
			answers: Object.fromEntries(
				Object.entries(request.questions).map(
					([id, question]: [string, Question]) => [
						id,
						picked(
							answers[id] ??
								(question.type === "choice"
									? (Object.keys(question.criteria)[0] ?? "")
									: ""),
						),
					],
				),
			),
			usage: { input_tokens: 100, output_tokens: 1 },
		};
	};
	return {
		ask,
		sent,
		stages: () => sent.map(({ stage }) => stage),
		questions: (stage: string) =>
			Object.keys(
				sent.find((request) => request.stage === stage)?.questions ??
					{},
			),
	};
}

/** A Luna request's input as `fakeLuna` hands it to its writer. */
type WriteInput = {
	readonly members: readonly { readonly text: string }[];
};

const isMember = (member: unknown): member is { readonly text: string } =>
	isRecord(member) && typeof member.text === "string";

/**
 * `input` with its members checked; a request with no members, such as
 * a Reading's, gets none. Members of another shape throw.
 */
function writeInput(input: unknown): WriteInput {
	if (!isRecord(input)) throw Error(`Not a Luna input: ${String(input)}`);
	if (!("members" in input)) return { ...input, members: [] };
	const { members } = input;
	if (Array.isArray(members) && members.every(isMember))
		return { ...input, members };
	throw Error(`Not a Luna input's members: ${JSON.stringify(members)}`);
}

/** A Luna that writes what `write` returns for the request's input. */
export function fakeLuna(
	write: (input: WriteInput) => unknown = ({ members }) => ({
		canonicalForm: members.map(({ text }) => text).join(" "),
		members: members.map(({ text }) => text),
	}),
	options: { readonly delayMs?: number } = {},
) {
	const sent: LunaRequest[] = [];
	const aborted: string[] = [];
	const ask: LunaAsk = async (request, { stage, signal }) => {
		sent.push(request);
		await new Promise((resolve) =>
			setTimeout(resolve, options.delayMs ?? 1),
		);
		if (signal.aborted) {
			aborted.push(stage);
			throw Error("aborted");
		}
		return {
			output: write(writeInput(request.input)),
			metadata: { usage: { input_tokens: 50, output_tokens: 10 } },
		};
	};
	return { ask, sent, aborted };
}

/** Segments of `text`, the way dumcorpus records split them, with no units yet. */
export function sentenceOf(
	text: string,
	segments: readonly Segment[] = segmentsOf(text),
): SegmentedSentence {
	return {
		text: segments.map((segment) => segment.text).join(""),
		segments,
		units: [],
	};
}

/** A unit over `segments` on the German route `key` names (`Lexeme/VERB`). */
export function unitOf(
	segments: number[],
	key: RouteKey,
	identity?: ClosedClassIdentity,
): Unit & { route: Route } {
	const route = routeForKey(key);
	if (route === "Unresolved") throw Error("Expected a routed unit");
	return { segments, route, ...(identity ? { identity } : {}) };
}

/** Resolves one click and keeps the trace it reported. */
export async function resolveOnce(
	options: FakeDumgenOptions,
	input: Omit<
		ResolveGrammarInput,
		"language" | "neighbours" | "lemmaCandidates"
	> &
		Partial<ResolveGrammarInput>,
): Promise<{ result: GrammarResolution; trace: OperationTrace | undefined }> {
	const traces: OperationTrace[] = [];
	const result = await Effect.runPromise(
		operations.resolve
			.grammar({
				language: "de",
				neighbours: {},
				lemmaCandidates: [],
				...input,
			})
			.pipe(
				Effect.provide(
					liveOver({
						...options,
						onOperation: (trace) => traces.push(trace),
					}),
				),
			),
	);
	return { result, trace: traces[0] };
}

/** The Attestation of a Resolved click; anything else fails the test. */
export function attested(result: GrammarResolution): Dumling.Attestation<"de"> {
	if (result._tag !== "Resolved")
		throw Error(`Expected a Resolved click, got ${result._tag}`);
	return result.attestation;
}

export const word = (text: string, surface?: string): Segment => ({
	kind: "ResolvableText",
	text,
	...(surface === undefined ? {} : { surface }),
});
export const space: Segment = { kind: "Whitespace", text: " " };
export const stop: Segment = { kind: "Punctuation", text: "." };

/**
 * Luna writing `canonicalForm` and the members as attested. For a
 * Locution or Saying it ties each word of the form to the member, or run
 * of members, that spells it, a finite verb citing its infinitive last.
 */
export const writes = (canonicalForm: string, members?: readonly string[]) =>
	fakeLuna(({ members: sent }) => {
		const spelled = members ?? sent.map(({ text }) => text);
		const used = new Set<number>();
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
		const words = canonicalForm.split(" ").flatMap((word) => {
			for (let start = 0; start < spelled.length; start++) {
				let joined = "";
				for (let end = start; end < spelled.length; end++) {
					if (used.has(end)) break;
					joined += spelled[end];
					if (joined.toLowerCase() === word.toLowerCase()) {
						const run = Array.from(
							{ length: end - start + 1 },
							(_, offset) => start + offset,
						);
						for (const position of run) used.add(position);
						return run.map((position) => ({
							member: `m${position}`,
							text: "",
							comma: false,
						}));
					}
				}
			}
			const spare = spelled.findIndex(
				(_, position) => !used.has(position),
			);
			if (spare >= 0) used.add(spare);
			return [
				{
					member: spare >= 0 ? `m${spare}` : "",
					text: word,
					comma: false,
				},
			];
		});
		return { canonicalForm, words, members: spelled };
	});
