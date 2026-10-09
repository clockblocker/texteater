/**
 * Answers `knowledge.produce`'s calls as gold would (#887): the judges pick
 * gold's plurality, participle meaning, types and relations, and Luna
 * writes gold's plural forms, frame, source verb, attribution and relation
 * targets. Where a case has no gold (dev, text aspects), it answers with
 * stand-ins of a typical size, so a pricing pass finds every request a run
 * would send and sizes its answers. It reads gold only; no model.
 */

import type { Question, Questions } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import { foldCase } from "dumling";
import type * as Dumrel from "dumrel/types";
import type { Answer, Answers } from "../../../src/segment/ask.js";
import type { GoldOracle } from "../resolve-grammar/models.js";
import type { KnowledgeCase, KnowledgeScope } from "./cases.js";
import { goldRelationTargets } from "./scoring.js";

/** One attempt's case and scope: what the cache's oracle answers for. */
export type KnowledgeAttempt = {
	readonly goldCase: KnowledgeCase;
	readonly scope: KnowledgeScope;
};

const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

const goldOf = (goldCase: KnowledgeCase): Dumrel.ReadingKnowledge =>
	goldCase.gold?.knowledge ?? {};

/** Every gold relation target, with its relation. */
const goldClaims = (goldCase: KnowledgeCase) =>
	[...goldRelationTargets(goldOf(goldCase))].flatMap(([relation, targets]) =>
		targets.map((target) => ({ relation, target })),
	);

const candidateOf = ({ instructions }: Question) =>
	String((isRecord(instructions) ? instructions.candidate : "") ?? "");

/** Gold's choice for one question, else a plausible option. */
function goldChoice(
	goldCase: KnowledgeCase,
	id: string,
	question: Question,
): string {
	if (question.type !== "choice") return "";
	const options = Object.keys(question.criteria ?? {});
	const offer = (choice: string | undefined): string =>
		choice !== undefined && options.includes(choice)
			? choice
			: (options[0] ?? "");
	const gold = goldOf(goldCase);
	if (id === "plurality")
		return offer(
			gold.plural === "NoPlural" || gold.plural === "PluralOnly"
				? gold.plural
				: "HasPlural",
		);
	if (id === "form") return offer("Participle");
	if (id === "meaning")
		return offer(gold.participleSource?.meaning ?? "Verbal");
	if (id === "locutionType") return offer(gold.locutionType ?? "Neither");
	if (id === "formulaRole") return offer(gold.formulaRole ?? "None");
	if (id === "sayingType") return offer(gold.sayingType?.type ?? "Proverb");
	const candidate = foldCase(candidateOf(question), "de");
	const claim = goldClaims(goldCase).find(
		({ target }) => foldCase(target.canonicalForm, "de") === candidate,
	);
	if (id.startsWith("relation_")) return offer(claim?.relation ?? "None");
	if (id.startsWith("kind_")) return offer(claim?.target.kind);
	return options[0] ?? "";
}

function goldKnowledgeAnswers(
	{ goldCase }: KnowledgeAttempt,
	questions: Questions,
): Answers {
	return Object.fromEntries(
		Object.entries(questions).map(([id, question]) => [
			id,
			picked(goldChoice(goldCase, id, question)),
		]),
	);
}

/** Candidates the writer lists when gold holds fewer: a typical count. */
const typicalCandidates = 8;

/** What gold writes for one Luna request, by the aspect its input names. */
export function goldKnowledgeWritten(
	{ goldCase }: KnowledgeAttempt,
	input: unknown,
): unknown {
	const aspect = isRecord(input) ? input.aspect : undefined;
	const gold = goldOf(goldCase);
	const lemma = goldCase.reading.lemma.canonicalForm;
	switch (aspect) {
		case "transcription":
			return `ˈ${lemma.toLowerCase()}`;
		case "definition":
			return `Eine kurze Erklärung der Bedeutung von ${lemma} in einem Satz.`;
		case "translations":
			return ["a translation"];
		case "plural":
			return Array.isArray(gold.plural) ? gold.plural : [`${lemma}en`];
		case "conjugationClass": {
			// Präterita the stem test reads as gold's classes (ADR 0038).
			const stem = lemma.replace(/^sich\s+/u, "").replace(/e?n$/u, "");
			const forms: Readonly<Record<string, string>> = {
				Strong: "stand",
				Weak: `${stem}te`,
				Mixed: "qqte",
			};
			return (gold.conjugationClass ?? ["Weak"]).map(
				(value) => forms[value] ?? `${stem}te`,
			);
		}
		case "valency":
			return {
				valency: (gold.valency ?? []).map((slot) => ({
					status: slot.status,
					complements: slot.complements.map((complement) =>
						complement.kind === "Preposition"
							? {
									...complement,
									preposition:
										complement.preposition.canonicalForm,
								}
							: complement,
					),
				})),
			};
		case "participleSource": {
			const source = gold.participleSource;
			if (!source) return { verb: null };
			const { verb } = source;
			const core: Readonly<Record<string, unknown>> = verb.coreFeatures;
			return {
				verb: verb.canonicalForm.replace(/^sich\s+/u, ""),
				reflexive: core.lexicallyReflexive ?? null,
				separablePrefix: core.hasSepPrefix ?? null,
				preterite: `${verb.canonicalForm}te`,
				participle: lemma,
			};
		}
		case "attribution":
			return gold.sayingType?.attribution ?? null;
		case "relationCandidates": {
			const targets = goldClaims(goldCase).map(
				({ target }) => target.canonicalForm,
			);
			const padding = Array.from(
				{ length: Math.max(0, typicalCandidates - targets.length) },
				(_, index) => `Kandidat${index + 1}`,
			);
			return [...new Set([...targets, ...padding])].slice(0, 12);
		}
		default:
			return null;
	}
}

export const knowledgeOracle: GoldOracle<KnowledgeAttempt> = {
	answers: goldKnowledgeAnswers,
	written: goldKnowledgeWritten,
};
