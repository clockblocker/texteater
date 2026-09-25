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
import {
	attestedMember,
	type MemberOrthography,
	tableSpelling,
} from "./member-spelling.js";
import { nounArticleReference } from "./noun-article-reference.js";
import type { GrammarOutput } from "./project.js";

type ArticleCandidate = {
	segmentIndex: number;
	attested: string;
	orthography: MemberOrthography;
	realization: "Owned" | "Shared";
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

const attachmentRules =
	"Distinguish actual articles from unrelated phrases, quoted words and nonnominal uses such as am besten. Standalone homographic pronouns are not articles. Sharing never crosses an explicit repeated article, clause boundary, nested nominal scope or incompatible agreement. Proximity alone does not license attachment; use grammatical scope. Ties or ambiguous attachment are Unresolved. mein/dieser/kein remain independent DETs and supply no article. None means no article is licensed, not uncertainty or a way to hide disagreement. If an article is required but no candidate represents it, including an unsupported spelling, choose Unresolved.";

/** A noun's owned article is its first member, so only sharing is judged. */
const nounArticlePolicy = `Select one licensed article the supplied noun shares, using the whole sentence independently of previous clicks. The noun owns no article of its own: an owned article would be its first supplied member. Candidates are possible analyses of source occurrences, not proof of attachment. Shared means an article licensed by compatible nominal coordination: der Aufstieg und Abstieg gives Shared der for Abstieg, and im Wald und Feld gives Shared dem for Feld. ${attachmentRules}`;

/** A proper noun owns only the article it is canonically cited with (ADR 0035). */
const properNounArticlePolicy = `Select one licensed article attachment for the supplied noun, using the whole sentence independently of previous clicks. Candidates are possible analyses of source occurrences, not proof of attachment. Owned means a true article that is this noun's first supplied member: a standalone article (der Aufstieg), the article piece of a fused word (m in im Wald, s in aufs Ende) or a shortened article ('ne Frage). Shared means an article the noun does not own, licensed by compatible nominal coordination: der Aufstieg und Abstieg gives Owned for Aufstieg and Shared for Abstieg, and im Wald und Feld gives Shared dem for Feld. ${attachmentRules} A proper noun owns an article only when the name is canonically cited with the definite article (die Schweiz, der Rhein, the m in im Rhein). An article before a name cited bare (das alte Berlin, colloquial der Peter) is its own DET, and an article inside a title's own wording (Die Physiker) is part of the name: choose None for both.`;

/**
 * Candidate spelling establishes possible analyses from raw source text, so the
 * attachment question can travel in the same round trip as the feature
 * questions. An Owned candidate is the noun's first member, which membership
 * alone attaches (ADR 0035); the judgment decides only a Shared article. A
 * piece of a fused word or a shortened article stands for what the fusion
 * table says (m in im is dem, 'ne is eine); a Sentence never holds a fused
 * word whole (ADR 0035). Owned orthography is patched from the judged member
 * orthography afterwards.
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
		const spelling = tableSpelling(encounter, index);
		const forms = spelling ? spelling.surfaces : [form];
		const articleCase =
			spelling?.orthography === "Fused"
				? (germanFusion(
						spelling.piece.pieces
							.map((piece) => piece.span)
							.join(""),
					)?.articleCase ?? null)
				: null;
		const realization = owned ? "Owned" : "Shared";
		for (const surface of forms) {
			const article = definiteSpellings.has(surface)
				? "Definite"
				: indefiniteSpellings.has(surface)
					? "Indefinite"
					: undefined;
			if (!article) continue;
			candidates.set(
				forms.length > 1
					? `${realization}_s${index}_${surface}`
					: `${realization}_s${index}`,
				{
					segmentIndex: index,
					attested: segment.text,
					orthography: spelling?.orthography ?? "Standard",
					realization,
					article,
					form: surface,
					case: articleCase,
				},
			);
		}
	}
	return candidates;
}

/** A noun, or a proper noun canonically cited with its article (ADR 0035). */
type ArticleOwner = "NOUN" | "PROPN";
const ownerOf = (encounter: Encounter): ArticleOwner =>
	encounter.target.kind === "PROPN" ? "PROPN" : "NOUN";

/**
 * Whether membership alone attaches the target's article: a noun owns the
 * article that is its first member. A proper noun owns one only when cited
 * with it, so its attachment stays a judgment.
 */
function ownsArticle(
	encounter: Encounter,
	candidates: Map<string, ArticleCandidate>,
): boolean {
	return (
		ownerOf(encounter) === "NOUN" &&
		[...candidates.values()].some(
			(candidate) => candidate.realization === "Owned",
		)
	);
}

/** Speculative article questions asked together with the noun feature questions. */
export function nounArticleQuestions(
	encounter: Encounter,
	candidates: Map<string, ArticleCandidate>,
): Questions {
	const kind = ownerOf(encounter);
	const field = grammarFeatureFields(`de/Lexeme/${kind}`).get(casePath);
	if (!field) throw Error(`Missing ${kind} Case schema`);
	const questions: Questions = {};
	if (
		!ownsArticle(encounter, candidates) &&
		encounter.sentence.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length > 1
	)
		questions.attachment = choice(
			kind === "PROPN"
				? "Under `articlePolicy`, which complete article attachment in `sentence` is licensed for the proper noun target marked in `markedContext` (its occurrences are `target.memberSegmentIndices`)? Judge agreement from the sentence itself."
				: "Under `articlePolicy`, which article in `sentence` does the noun target marked in `markedContext` (its occurrences are `target.memberSegmentIndices`) share? Judge agreement from the sentence itself.",
			{
				...Object.fromEntries(
					[...candidates].map(([key, candidate]) => [
						key,
						`${candidate.realization}: source <s${candidate.segmentIndex}> ${candidate.attested} supplies ${candidate.article} DET form ${candidate.form}. Select only if this source grammatically supplies this noun's article.`,
					]),
				),
				None:
					kind === "PROPN"
						? "No owned or shared article belongs to this noun"
						: "No shared article belongs to this noun",
				Unresolved:
					"Attachment is ambiguous, incompatible, or required evidence has no supported candidate",
			},
		);
	// Case is asked speculatively; code prefers the deterministic derivation
	// from the attached article and consumes this answer only when needed.
	questions[casePath] = featureQuestion(kind, casePath, field);
	return questions;
}

/** What the attachment question reads, sent only when it is asked. */
export function nounArticleState(encounter: Encounter) {
	return {
		sentence: indexedContext(encounter.sentence),
		target: {
			...encounter.target,
			memberSegmentIndices: [...encounter.target.memberSegmentIndices],
		},
		articlePolicy:
			ownerOf(encounter) === "PROPN"
				? properNounArticlePolicy
				: nounArticlePolicy,
	};
}

/**
 * The article's evidence, if any, and the IDs of the calls that judged it. A
 * noun marks the attached article on its Surface; a proper noun owns one only
 * when its Core `article` says it is cited with it (ADR 0035).
 */
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
		const kind = ownerOf(encounter);
		const route = `de/Lexeme/${kind}`;
		const proper = kind === "PROPN";
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
				route,
			);
		};
		// Membership attaches a noun's owned article, standing for the form
		// its first member does.
		const owns = ownsArticle(encounter, judged.candidates);
		let candidate = owns
			? [...judged.candidates.values()].find(
					(owned) =>
						owned.realization === "Owned" &&
						owned.form === output.normalizedMembers[0],
				)
			: undefined;
		if (owns && !candidate)
			return fail("Article member evidence is not aligned");
		if (!owns && judged.attachment !== undefined) {
			if (judged.attachment === "Unresolved")
				return fail("Unresolved noun article attachment");
			if (judged.attachment !== "None") {
				candidate = judged.candidates.get(judged.attachment);
				if (!candidate)
					return fail(
						"Article attachment is not an eligible candidate",
					);
				if (
					proper &&
					(core.article !== "Definite" ||
						candidate.article !== "Definite")
				)
					return fail(
						"Only a name cited with its definite article owns one",
					);
			}
		}
		if (candidate?.realization === "Owned") {
			const orthography = output.memberOrthographies[0];
			if (orthography === undefined)
				return fail("Article member evidence is not aligned");
			candidate = { ...candidate, orthography };
		}
		// Attachment precedes Case. A selected article constrains its possible analyses;
		// a unique Case is determined by the morphology, not a separate model guess.
		const field = grammarFeatureFields(route).get(casePath);
		if (!field) throw Error(`Missing ${kind} Case schema`);
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
				`${route}/case`,
				{
					...markedContext(encounter),
					article: candidate
						? `${candidate.realization}: ${candidate.attested} supplies ${candidate.form}`
						: "No attached article",
				},
				{
					[casePath]: featureQuestion(kind, casePath, {
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
			if (!proper) bag.article = "None";
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
		if (!proper) bag.article = candidate.article;
		recordEvent(scope, "NounArticleEvidence", {
			segmentIndex: candidate.segmentIndex,
			realization: candidate.realization,
			attested: candidate.attested,
			orthography: candidate.orthography,
			articleForm: candidate.form,
			case: bag.case,
		});
		// An owned article is the noun's first member, normalized to the form
		// it stands for; the Surface is the noun's own letters (ADR 0035).
		if (candidate.realization === "Owned")
			output.normalizedMembers[0] = candidate.form;
		const evidence: NonNullable<GrammarOutput["articleEvidence"]> =
			candidate.realization === "Owned"
				? { kind: "Owned", member: 0 }
				: {
						kind: "Shared",
						article: attestedMember(
							encounter,
							candidate.segmentIndex,
							candidate.orthography,
							new Map([[candidate.segmentIndex, candidate.form]]),
						),
					};
		return {
			article: {
				reference,
				evidence,
				coverage:
					candidate.realization === "Owned"
						? ("Full" as const)
						: ("Partial" as const),
			},
			calls,
		};
	});
}
