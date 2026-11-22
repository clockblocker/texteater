/**
 * The German body of `knowledge.accumulateValency` (ADR 0034): a Reading's
 * concrete Valency Patterns grow click by click, mirroring translation
 * accumulation (ADR 0047).
 *
 * - Routes whose Knowledge Policy lacks `valency` (or routes with no allowed
 *   complement kinds) return immediately with zero model calls.
 * - Bare nouns with no attested `valencyEvidence` and no clause cues in the
 *   sentence also return immediately with zero model calls.
 * - When stored patterns exist, jev judges first: it sees the stored
 *   patterns beside the marked Sentence and picks the one realized here, or
 *   answers NoMatch. A match returns `realizedPattern` with no Luna call and
 *   no Knowledge Change.
 * - On NoMatch (or when no patterns are stored yet), Luna extracts the
 *   concrete pattern realized in this sentence without seeing the stored
 *   patterns. If it matches a stored pattern canonically, `realizedPattern`
 *   is returned with no Knowledge Change; otherwise a `Contribute` change
 *   adds `[pattern]` to the Reading's valency.
 * - Model failures are values, never thrown; bad input is a Defect.
 */

import { isRecord } from "common-utils";
import { routeOf } from "dumling";
import { allowedComplementKinds, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { CallLog } from "../../call.js";
import { InvalidModelOutput } from "../../errors.js";
import type { Jev } from "../../jev-call.js";
import type { Luna } from "../../luna-call.js";
import { markedSentence } from "../../resolve/reading.js";
import { choice, choiceOf } from "../../segment/ask.js";
import type {
	AccumulateValencyInput,
	KnowledgeFailure,
	ValencyAccumulation,
} from "../types.js";
import {
	type AspectContext,
	type AspectError,
	aspectContext,
	checkedChanges,
	judgeState,
	validateOccurrenceTarget,
} from "./context.js";
import { extractGermanValencyPattern } from "./valency.js";
import {
	valencyCoveragePolicy,
	valencyCoverageQuestion,
} from "./valency-accumulation-prompts.js";
import {
	germanPatternKey,
	printStoredGermanPattern,
} from "./valency-notation.js";

const judgeStage = "valencyCoverage";
const writerStage = "valencyAccumulation";

const optionId = (index: number) => `p${index}`;

/** Deduplicates stored patterns by canonical complement-set key, keeping first order. */
function distinctPatterns(
	stored: readonly Dumrel.ValencyPattern[],
): Dumrel.ValencyPattern[] {
	const seen = new Set<string>();
	return stored.filter((pattern) => {
		const key = germanPatternKey(pattern);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Fast-path skip for German NOUN occurrences with no attested governed
 * preposition and no clause cues (comma/semicolon or infinitive `zu`) in the
 * sentence: a German noun governs only Preposition and Clause.
 */
function canFastSkipNoun(input: AccumulateValencyInput): boolean {
	if (input.reading.lemma.kind !== "NOUN") return false;
	const evidence =
		"valencyEvidence" in input.attestation
			? input.attestation.valencyEvidence
			: [];
	if (evidence.length > 0) return false;
	const text = input.sentence.segments.map(({ text }) => text).join("");
	return !/[,;:]|\bzu\b/u.test(text);
}

/** Summarizes the occurrence's `valencyEvidence` for the jev coverage judge. */
function evidenceSummary(attestation: AccumulateValencyInput["attestation"]) {
	const evidence =
		"valencyEvidence" in attestation ? attestation.valencyEvidence : [];
	return evidence.map(({ complement }) => {
		if (complement.kind === "Preposition")
			return `${complement.preposition.canonicalForm}+${complement.governedCase}`;
		if (complement.kind === "Reflexive")
			return "governedCase" in complement
				? `Reflexive(${complement.governedCase})`
				: "Reflexive";
		return complement.kind;
	});
}

function badInput(input: AccumulateValencyInput): string | undefined {
	const occurrenceError = validateOccurrenceTarget(input);
	if (occurrenceError !== undefined) return occurrenceError;
	if (
		!Array.isArray(input.valency) ||
		input.valency.some(
			(pattern) =>
				!Array.isArray(pattern) ||
				pattern.length === 0 ||
				pattern.some(
					(complement) =>
						!isRecord(complement) ||
						typeof complement.kind !== "string",
				),
		)
	)
		return "valency is no list of Valency Patterns";
	return undefined;
}

const runAccumulation = Effect.fnUntraced(function* (
	context: AspectContext,
	stored: readonly Dumrel.ValencyPattern[],
): Effect.fn.Return<ValencyAccumulation, AspectError> {
	const options = distinctPatterns(stored);
	const isVerb = context.lemma.kind === "VERB";
	if (options.length > 0) {
		const renderedOptions = options.map((pattern) =>
			printStoredGermanPattern(pattern, { verb: isVerb }),
		);
		const answers = yield* context.ask({
			stage: judgeStage,
			state: judgeState(context, {
				valencyEvidence: evidenceSummary(context.attestation),
				policy: { ...valencyCoveragePolicy },
			}),
			questions: {
				pattern: choice(valencyCoverageQuestion.question, {
					...Object.fromEntries(
						renderedOptions.map((text, index) => [
							optionId(index),
							text,
						]),
					),
					NoMatch: valencyCoverageQuestion.noMatch,
				}),
			},
		});
		const answer = choiceOf(answers, "pattern").choice;
		if (answer !== "NoMatch") {
			const matchedIndex = options.findIndex(
				(_, index) => optionId(index) === answer,
			);
			const matched = options[matchedIndex];
			if (matched === undefined)
				return yield* new InvalidModelOutput({
					stage: judgeStage,
					message: `jev answered the valency pattern with ${answer}, no option of it`,
				});
			context.log.event({
				name: "ValencyAccumulation",
				data: {
					outcome: "Covered",
					by: renderedOptions[matchedIndex],
				},
			});
			return {
				changes: [],
				realizedPattern: matched,
				failures: [],
			};
		}
	}

	const { pattern, failures } = yield* extractGermanValencyPattern(context, {
		anchorEvidence: true,
		stage: writerStage,
	});
	if (pattern === null) {
		context.log.event({
			name: "ValencyAccumulation",
			data: { outcome: "Empty" },
		});
		return { changes: [], realizedPattern: null, failures };
	}

	const key = germanPatternKey(pattern);
	const existing = options.find((item) => germanPatternKey(item) === key);
	const printed = printStoredGermanPattern(pattern, { verb: isVerb });
	if (existing !== undefined) {
		context.log.event({
			name: "ValencyAccumulation",
			data: { outcome: "Contained", written: printed },
		});
		return {
			changes: [],
			realizedPattern: existing,
			failures,
		};
	}

	const changes = checkedChanges(context, "valency", [
		{ kind: "Contribute", aspect: "valency", value: [pattern] },
	]);
	if (changes instanceof InvalidModelOutput) return yield* changes;
	context.log.event({
		name: "ValencyAccumulation",
		data: { outcome: "Added", written: printed },
	});
	return {
		changes,
		realizedPattern: pattern,
		failures,
	};
});

export const accumulateGermanValency = (
	input: AccumulateValencyInput,
): Effect.Effect<ValencyAccumulation, never, Jev | Luna | CallLog> =>
	Effect.gen(function* () {
		const problem = badInput(input);
		if (problem) return yield* Effect.die(Error(problem));
		const { reading, attestation, valency } = input;
		const selected = selectKnowledge({ route: routeOf(reading.lemma) });
		const applies =
			selected.success &&
			"valency" in selected.value &&
			allowedComplementKinds(reading.lemma).length > 0;
		if (!applies || canFastSkipNoun(input))
			return {
				changes: [],
				realizedPattern: null,
				failures: [],
			} satisfies ValencyAccumulation;

		const context = yield* aspectContext(
			reading,
			attestation,
			markedSentence(input.sentence.segments, input.sentence.target),
		);
		return yield* runAccumulation(context, valency).pipe(
			Effect.catch((error: AspectError) =>
				Effect.succeed<ValencyAccumulation>({
					changes: [],
					realizedPattern: null,
					failures: [
						{
							aspect: "valency",
							...(error._tag === "KnowledgeUnresolved" &&
							error.leaf !== undefined
								? { leaf: error.leaf }
								: {}),
							code:
								error._tag === "KnowledgeUnresolved"
									? "Unresolved"
									: error._tag,
							message: error.message,
						} satisfies KnowledgeFailure,
					],
				}),
			),
		);
	});
