/**
 * Semantic Relations (Dumgen ADR 0003): Luna lists flat candidate
 * Canonical Forms for the requested relations, and jev judges each
 * candidate's relation and Kind in one request whose state states the
 * policy, the relations and the Kinds once (#697). Code supplies Language
 * and Family: a Saying relates to Sayings, and a word or Locution to words
 * and Locutions, a candidate of one word (a reflexive's `sich` aside) being
 * a Lexeme and a longer one a Locution (ADR 0039). A relation keeps at
 * most three claims, the judge's most confident (`de/relations-need-a-
 * dictionary`). Candidate discovery never establishes absence.
 */

import type { EntryType, Question } from "@typesafe-ai/sdk";
import { foldCase, normalizeForm } from "dumling";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { choice, choiceOf } from "../../segment/ask.js";
import type { GermanPendingRelation } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	judgeState,
	textsOf,
	write,
} from "./context.js";
import {
	kindDefinitions,
	relationCandidates,
	relationDefinitions,
	relationJudgment,
	shared,
} from "./prompts.js";

/** The one candidate prompt (#697). */
export const candidatePrompt = [
	shared.reading,
	shared.evidence,
	relationCandidates.task,
	relationCandidates.whole,
	relationCandidates.output,
].join("\n");

/** Candidates Luna may list per Reading. */
const maxCandidates = 12;
/** Claims a relation keeps (`de/relations-need-a-dictionary`). */
const maxPerRelation = 3;

type KindName = keyof typeof kindDefinitions;

/** The Kinds a candidate of each Family may take; no AUX, PUNCT or SYM (#669). */
const kindsByFamily: Readonly<Record<string, readonly KindName[]>> = {
	Lexeme: [
		"NOUN",
		"PROPN",
		"VERB",
		"ADJ",
		"ADV",
		"ADP",
		"CCONJ",
		"SCONJ",
		"INTJ",
		"NUM",
		"PRON",
		"DET",
	],
	Locution: [
		"NOUN",
		"VERB",
		"ADJ",
		"ADV",
		"ADP",
		"CCONJ",
		"SCONJ",
		"INTJ",
		"NUM",
		"PRON",
		"DET",
	],
};

/** A candidate's Family, from the source's and its words (ADR 0039). */
function candidateFamily(
	sourceFamily: string,
	candidate: string,
): "Lexeme" | "Locution" | "Saying" {
	if (sourceFamily === "Saying") return "Saying";
	const words = candidate.replace(/^sich\s+/u, "").split(/\s+/u);
	return words.length === 1 ? "Lexeme" : "Locution";
}

/** The relation question of one candidate; the policy stays in the state. */
function relationQuestion(
	candidate: string,
	relations: readonly Dumrel.DirectSemanticRelation[],
): Question {
	return choice(
		{ question: relationJudgment.relation, candidate },
		{
			...Object.fromEntries(
				relations.map((relation) => [relation, null]),
			),
			None: relationJudgment.none,
			Unsure: relationJudgment.unsure,
		},
	);
}

/** The Kind question of one candidate of a word or Locution Family. */
function kindQuestion(
	candidate: string,
	family: "Lexeme" | "Locution",
): Question {
	return choice(
		{ question: relationJudgment.kind, candidate, family },
		{
			...Object.fromEntries(
				(kindsByFamily[family] ?? []).map((kind) => [kind, null]),
			),
			OtherFamily: relationJudgment.otherFamily,
		},
	);
}

/** The judge's state: the Reading, the policy and every definition, once. */
function judgmentState(
	context: AspectContext,
	candidates: readonly string[],
	relations: readonly Dumrel.DirectSemanticRelation[],
	families: ReadonlySet<string>,
): Readonly<Record<string, EntryType>> {
	const kinds = [
		...new Set(
			[...families].flatMap((family) => kindsByFamily[family] ?? []),
		),
	];
	return judgeState(context, {
		policy: relationJudgment.policy,
		candidates: [...candidates],
		relations: Object.fromEntries(
			relations.map((relation) => [
				relation,
				relationDefinitions[
					relation as keyof typeof relationDefinitions
				],
			]),
		),
		...(kinds.length > 0
			? {
					kinds: Object.fromEntries(
						kinds.map((kind) => [kind, kindDefinitions[kind]]),
					),
				}
			: {}),
	});
}

/** One claim the judge made, with the confidence it ranks by. */
type Claim = {
	readonly relation: Dumrel.DirectSemanticRelation;
	readonly target: GermanPendingRelation["target"];
	readonly confidence: number;
};

/**
 * The requested relations' Pending Semantic Relations: Luna's candidates
 * the judge kept, at most three per relation.
 */
export const produceRelations = (
	context: AspectContext,
	relations: readonly Dumrel.DirectSemanticRelation[],
): Effect.Effect<GermanPendingRelation[], AspectError> =>
	Effect.gen(function* () {
		const source = context.lemma;
		const written = yield* write(
			context,
			"relationCandidates",
			candidatePrompt,
			{ relations: [...relations] },
			{
				type: "array",
				items: { type: "string", minLength: 1 },
				maxItems: maxCandidates,
			},
			(output) => textsOf("relationCandidates", output, maxCandidates),
		);
		const candidates = [
			...new Map(
				written
					.map(normalizeForm)
					.filter(
						(candidate) =>
							candidate !== "" &&
							foldCase(candidate, "de") !==
								foldCase(source.canonicalForm, "de"),
					)
					.map((candidate) => [foldCase(candidate, "de"), candidate]),
			).values(),
		];
		if (candidates.length === 0) return [];
		const families = candidates.map((candidate) =>
			candidateFamily(source.family, candidate),
		);
		const questions: Record<string, Question> = {};
		for (const [index, candidate] of candidates.entries()) {
			questions[`relation_${index}`] = relationQuestion(
				candidate,
				relations,
			);
			const family = families[index];
			if (family === "Lexeme" || family === "Locution")
				questions[`kind_${index}`] = kindQuestion(candidate, family);
		}
		const answers = yield* context.ask({
			stage: "relationJudgment",
			state: judgmentState(
				context,
				candidates,
				relations,
				new Set(families.filter((family) => family !== "Saying")),
			),
			questions,
		});
		const claims: Claim[] = [];
		const rejected: {
			candidate: string;
			relation: string;
			kind?: string;
		}[] = [];
		for (const [index, candidate] of candidates.entries()) {
			const answer = choiceOf(answers, `relation_${index}`);
			const family = families[index] ?? "Lexeme";
			const kind =
				family === "Saying"
					? "Saying"
					: choiceOf(answers, `kind_${index}`).choice;
			const relation = answer.choice as Dumrel.DirectSemanticRelation;
			const self =
				family === source.family &&
				kind === source.kind &&
				foldCase(candidate, "de") ===
					foldCase(source.canonicalForm, "de");
			if (
				!relations.includes(relation) ||
				kind === "OtherFamily" ||
				self
			) {
				rejected.push({ candidate, relation: answer.choice, kind });
				continue;
			}
			claims.push({
				relation,
				target: {
					language: "de",
					family,
					kind,
					canonicalForm: candidate,
				} as GermanPendingRelation["target"],
				confidence: answer.confidence,
			});
		}
		if (rejected.length > 0)
			context.scope.event({
				name: "RejectedRelationCandidates",
				data: { rejected },
			});
		return relations.flatMap((relation) =>
			claims
				.filter((claim) => claim.relation === relation)
				.sort((left, right) => right.confidence - left.confidence)
				.slice(0, maxPerRelation)
				.map(
					({ target }): GermanPendingRelation => ({
						relation,
						target,
					}),
				),
		);
	});
