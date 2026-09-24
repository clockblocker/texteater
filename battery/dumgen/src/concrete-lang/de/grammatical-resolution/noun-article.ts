import { germanArticleForm } from "dumling";
import * as Effect from "effect/Effect";
import type { Questions } from "promptsmith/typesafe";
import type { DumgenOptions, Encounter } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { choice } from "../../../universal/questions.js";
import { type OperationScope, recordEvent } from "../../../universal/trace.js";
import {
	indexedContext,
	markedContext,
} from "../../../universal/validation.js";
import { germanFusion } from "../fusions.js";
import { featureQuestion } from "./feature-questions.js";
import { grammarFeatureFields } from "./feature-schema.js";
import { nounArticleReference } from "./noun-article-reference.js";
import type { GrammarOutput } from "./project.js";

type ArticleCandidate = {
	segmentIndex: number;
	attested: string;
	orthography: "Standard" | "Typo";
	realization: "Owned" | "Shared" | "Fusion";
	article: "Definite" | "Indefinite";
	form: string;
	case: "Dat" | "Acc" | null;
};

const definiteSpellings = new Set(["der", "die", "das", "den", "dem", "des"]);
const indefiniteSpellings = new Set([
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
]);

const casePath = "surface.inflectionalFeatures.case";

export const nounArticlePolicy =
	"Select one licensed article attachment for the supplied noun, using the whole sentence independently of previous clicks. Candidates are possible analyses of source occurrences, not proof of attachment. Owned means an overt true article in this noun's supplied members. Shared means a standalone article licensed by compatible nominal coordination: der Aufstieg und Abstieg gives Owned for Aufstieg and Shared for Abstieg. A Fusion candidate supplies its internal DET form to its nominal complement, including compatible coordinated complements: im Wald gives dem Wald, ins Haus gives das Haus, and im Wald und Feld permits dem Feld. The fused word never becomes a noun member. Distinguish actual governing Fusions from unrelated phrases, quoted words and nonnominal uses such as am besten. Standalone homographic pronouns are not articles. Sharing never crosses an explicit repeated article, clause boundary, nested nominal scope or incompatible agreement. Proximity alone does not license attachment; use grammatical scope. Ties or ambiguous attachment are Unresolved. mein/dieser/kein remain independent DETs and supply no article. None means no article is licensed, not uncertainty or a way to hide disagreement. If an article is required but no candidate represents it, including an unsupported spelling or Fusion, choose Unresolved.";

/**
 * Candidate spelling establishes possible analyses from raw source text, so the
 * attachment question can travel in the same round trip as the feature
 * questions; the judgment still decides contextual attachment. Owned
 * orthography is patched from the judged member orthography afterwards.
 */
export function nounArticleCandidates(
	encounter: Encounter,
): Map<string, ArticleCandidate> {
	const candidates = new Map<string, ArticleCandidate>();
	const members = encounter.target.memberSegmentIndices;
	const firstMember = members[0];
	if (firstMember === undefined) return candidates;
	for (const [index, segment] of encounter.sentence.segments.entries()) {
		if (segment.kind !== "ResolvableText") continue;
		const position = members.indexOf(index);
		const owned = position !== -1;
		if (owned ? position !== 0 || members.length < 2 : index >= firstMember)
			continue;
		const form = segment.text.normalize("NFC").toLocaleLowerCase("de");
		const fusion = germanFusion(form);
		// A Fusion's source Segment always remains outside the noun target.
		if (fusion && owned) continue;
		const article =
			fusion || definiteSpellings.has(form)
				? "Definite"
				: indefiniteSpellings.has(form)
					? "Indefinite"
					: undefined;
		if (!article) continue;
		const realization = fusion ? "Fusion" : owned ? "Owned" : "Shared";
		candidates.set(`${realization}_s${index}`, {
			segmentIndex: index,
			attested: segment.text,
			orthography: "Standard",
			realization,
			article,
			form: fusion?.articleForm ?? form,
			case: fusion?.articleCase ?? null,
		});
	}
	return candidates;
}

/** Speculative article questions asked together with the noun feature questions. */
export function nounArticleQuestions(
	encounter: Encounter,
	candidates: Map<string, ArticleCandidate>,
): Questions {
	const field = grammarFeatureFields("de/Lexeme/NOUN").get(casePath);
	if (!field) throw Error("Missing noun Case schema");
	const questions: Questions = {};
	if (
		encounter.sentence.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length > 1
	)
		questions.attachment = choice(
			"Under `articlePolicy`, which complete article attachment in `sentence` is licensed for the noun target marked in `markedContext` (its occurrences are `target.memberSegmentIndices`)? Judge agreement from the sentence itself.",
			{
				...Object.fromEntries(
					[...candidates].map(([key, candidate]) => [
						key,
						`${candidate.realization}: source <s${candidate.segmentIndex}> ${candidate.attested} supplies ${candidate.article} DET form ${candidate.form}. Select only if this source grammatically supplies this noun's article.`,
					]),
				),
				None: "No owned, shared, or Fusion-supplied article belongs to this noun",
				Unresolved:
					"Attachment is ambiguous, incompatible, or required evidence has no supported candidate",
			},
		);
	// Case is asked speculatively; code prefers the deterministic derivation
	// from the attached article and consumes this answer only when needed.
	questions[casePath] = featureQuestion("NOUN", casePath, field);
	return questions;
}

export function nounArticleState(encounter: Encounter) {
	return {
		sentence: indexedContext(encounter.sentence),
		target: {
			...encounter.target,
			memberSegmentIndices: [...encounter.target.memberSegmentIndices],
		},
		articlePolicy: nounArticlePolicy,
	};
}

/** The article's evidence, if any, and the IDs of the calls that judged it. */
export function resolveNounArticle(
	options: DumgenOptions,
	encounter: Encounter,
	output: Pick<
		GrammarOutput,
		"lemma" | "surface" | "normalizedMembers" | "memberOrthographies"
	>,
	judged: {
		candidates: Map<string, ArticleCandidate>;
		/** Undefined when the attachment question was not applicable. */
		attachment: string | undefined;
		/** The speculative Case answer, if any. */
		case: string | undefined;
	},
	scope: OperationScope,
	dependsOn: readonly string[],
) {
	return Effect.gen(function* () {
		const calls: string[] = [];
		const bag = output.surface.inflectionalFeatures as Record<
			string,
			string | null
		> | null;
		if (!bag) return { article: null, calls };
		const core = output.lemma.coreFeatures as Record<string, string | null>;
		const fail = (message: string): never => {
			throw new DumgenFailure(
				"Unresolved",
				"resolveGrammar",
				message,
				"de/Lexeme/NOUN",
			);
		};
		let candidate: ArticleCandidate | undefined;
		if (judged.attachment !== undefined) {
			if (judged.attachment === "Unresolved")
				return fail("Unresolved noun article attachment");
			if (judged.attachment !== "None") {
				candidate = judged.candidates.get(judged.attachment);
				if (!candidate)
					return fail(
						"Article attachment is not an eligible candidate",
					);
				if (candidate.realization === "Owned") {
					const orthography = output.memberOrthographies[0];
					if (orthography === undefined)
						return fail("Article member evidence is not aligned");
					candidate = { ...candidate, orthography };
				}
			}
		}
		// Attachment precedes Case. A selected article constrains its possible analyses;
		// a unique Case is determined by the morphology, not a separate model guess.
		const field = grammarFeatureFields("de/Lexeme/NOUN").get(casePath);
		if (!field) throw Error("Missing noun Case schema");
		let cases = field.values;
		if (candidate) {
			if (!bag.number || (bag.number !== "Plur" && !core.gender))
				return fail("Article requires known noun agreement");
			const selectedArticle = candidate;
			cases = ["Nom", "Acc", "Dat", "Gen"].filter(
				(caseValue) =>
					germanArticleForm({
						article: selectedArticle.article,
						case: caseValue,
						number: bag.number ?? null,
						gender: core.gender ?? null,
					}) === selectedArticle.form &&
					(selectedArticle.case === null ||
						caseValue === selectedArticle.case),
			);
			if (!cases.length)
				return fail("Article form and noun agreement are incompatible");
		}
		const speculative =
			judged.case === undefined || judged.case === "Unresolved"
				? undefined
				: judged.case === "Unmarked"
					? null
					: judged.case;
		if (cases.length === 1) bag.case = String(cases[0]);
		else if (speculative !== undefined && cases.includes(speculative))
			bag.case = speculative;
		else {
			// The speculative answer is incompatible with the attached article:
			// ask again over the compatible values only.
			const { id, output: result } = yield* judgmentCaller(options)(
				"resolveGrammar",
				"de/Lexeme/NOUN/case",
				{
					...markedContext(encounter),
					article: candidate
						? `${candidate.realization}: ${candidate.attested} supplies ${candidate.form}`
						: "No attached article",
				},
				{
					[casePath]: featureQuestion("NOUN", casePath, {
						values: cases,
						open: false,
					}),
				},
				scope,
				dependsOn,
			);
			calls.push(id);
			const selected = result.answers[casePath].choice;
			if (selected === "Unresolved") return fail("Unresolved noun Case");
			bag.case = selected === "Unmarked" ? null : selected;
		}
		if (!candidate) {
			bag.article = null;
			return { article: null, calls };
		}
		if (!bag.case || !bag.number)
			return fail("Article requires known noun agreement");
		const reference = nounArticleReference({
			article: candidate.article,
			case: bag.case,
			number: bag.number,
			gender: core.gender ?? null,
			spelled: candidate.form,
		});
		bag.article = candidate.article;
		recordEvent(scope, "NounArticleEvidence", {
			segmentIndex: candidate.segmentIndex,
			realization: candidate.realization,
			attested: candidate.attested,
			orthography: candidate.orthography,
			articleForm: candidate.form,
			case: bag.case,
		});
		return {
			article: {
				reference,
				evidence: {
					attested: candidate.attested,
					orthography: candidate.orthography,
				},
				coverage:
					candidate.realization === "Owned"
						? ("Full" as const)
						: ("Partial" as const),
			},
			calls,
		};
	});
}
