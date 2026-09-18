import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type { DumgenOptions, Encounter } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import {
	indexedContext,
	markedContext,
} from "../../../universal/validation.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
import { germanFusion } from "../fusions.js";
import { featureQuestion } from "./feature-questions.js";
import { grammarFeatureFields } from "./feature-schema.js";
import type { GrammarOutput } from "./project.js";

const definiteForms: Record<string, Record<string, string>> = {
	Masc: { Nom: "der", Acc: "den", Dat: "dem", Gen: "des" },
	Fem: { Nom: "die", Acc: "die", Dat: "der", Gen: "der" },
	Neut: { Nom: "das", Acc: "das", Dat: "dem", Gen: "des" },
	Plur: { Nom: "die", Acc: "die", Dat: "den", Gen: "der" },
};
const indefiniteForms: Record<string, Record<string, string>> = {
	Masc: { Nom: "ein", Acc: "einen", Dat: "einem", Gen: "eines" },
	Fem: { Nom: "eine", Acc: "eine", Dat: "einer", Gen: "einer" },
	Neut: { Nom: "ein", Acc: "ein", Dat: "einem", Gen: "eines" },
};

/** Exact reviewed identity plus contextual morphology, without any occurrence or database identity. */
export function nounArticleReference(input: {
	article: string;
	case: string;
	number: string;
	gender: string | null;
	spelled: string;
}) {
	const forms =
		input.article === "Definite" ? definiteForms : indefiniteForms;
	const expected =
		forms[input.number === "Plur" ? "Plur" : (input.gender ?? "")]?.[
			input.case
		];
	if (!expected || input.spelled !== expected)
		throw new DumgenFailure(
			"Unresolved",
			"resolveGrammar",
			"Article form and noun agreement are incompatible",
		);
	const canonical =
		input.article === "Indefinite"
			? "ein"
			: input.number === "Plur" || input.gender === "Fem"
					? "die"
					: input.gender === "Neut"
						? "das"
						: "der";
	const member = authoredMembers.find(
		({ lemma }) =>
			lemma.kind === "DET" &&
			lemma.canonicalForm === canonical &&
			"pronType" in lemma.coreFeatures &&
			lemma.coreFeatures.pronType === "Art",
	);
	if (!member || member.lemma.kind !== "DET")
		throw new DumgenFailure(
			"CatalogMiss",
			"resolveGrammar",
			`Missing reviewed article ${canonical}`,
			"de/Lexeme/DET",
		);
	const surface = {
		unitKind: "Surface",
		language: "de",
		lemma: member.lemma,
		normalizedSurface: expected,
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: {
			case: input.case,
			number: input.number,
			gender: input.gender,
			degree: null,
			"gender[psor]": null,
			"number[psor]": null,
		},
	};
	const parsed = parseUnit(surface);
	if (!parsed.success) throw parsed.error;
	if (parsed.chain.unitKind !== "Surface" || parsed.chain.language !== "de" || parsed.chain.family !== "Lexeme" || parsed.chain.kind !== "DET") throw new Error("Expected an article Surface");
	const reading: Dumling.Reading<"de", "Lexeme", "DET"> = { ...member.reading, lemma: member.lemma };
	return { surface: parsed.chain.value, reading };
}

/** The reviewed citation article for a German noun heading, independent of its encounters. */
export function selectNounHeadingArticle(lemma: {
	language: string;
	family: string;
	kind: string;
	coreFeatures: Readonly<Record<string, unknown>>;
}) {
	if (lemma.language !== "de" || lemma.family !== "Lexeme" || lemma.kind !== "NOUN") return null;
	const gender = lemma.coreFeatures.gender;
	const canonical = gender === "Masc" ? "der" : gender === "Fem" ? "die" : gender === "Neut" ? "das" : null;
	if (!canonical) return null;
	return authoredMembers.find(({ lemma: candidate }) => candidate.kind === "DET" && candidate.canonicalForm === canonical && "pronType" in candidate.coreFeatures && candidate.coreFeatures.pronType === "Art") ?? null;
}

type ArticleCandidate = {
	segmentIndex: number;
	attested: string;
	orthography: "Standard" | "Typo";
	realization: "Owned" | "Shared" | "Fusion";
	article: "Definite" | "Indefinite";
	form: string;
	case: "Dat" | "Acc" | null;
};

const definiteSpellings = new Set(
	Object.values(definiteForms).flatMap(Object.values),
);
const indefiniteSpellings = new Set(
	Object.values(indefiniteForms).flatMap(Object.values),
);

/** Candidate spelling establishes possible analyses; the judgment still decides contextual attachment. */
function articleCandidates(
	encounter: Encounter,
	output: Pick<GrammarOutput, "normalizedMembers" | "memberOrthographies">,
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
		const normalized = owned
			? output.normalizedMembers[position]
			: segment.text;
		const orthography = owned
			? output.memberOrthographies[position]
			: "Standard";
		if (normalized === undefined || orthography === undefined)
			throw new DumgenFailure(
				"Unresolved",
				"resolveGrammar",
				"Article member evidence is not aligned",
			);
		const form = normalized.normalize("NFC").toLocaleLowerCase("de");
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
			orthography,
			realization,
			article,
			form: fusion?.articleForm ?? form,
			case: fusion?.articleCase ?? null,
		});
	}
	return candidates;
}

export async function resolveNounArticle(
	options: DumgenOptions,
	encounter: Encounter,
	output: Pick<
		GrammarOutput,
		"lemma" | "surface" | "normalizedMembers" | "memberOrthographies"
	>,
	signal: AbortSignal,
) {
	const bag = output.surface.inflectionalFeatures as Record<
		string,
		string | null
	> | null;
	if (!bag) return null;
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
	if (
		encounter.sentence.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length > 1
	) {
		const candidates = articleCandidates(encounter, output);
		const result = await judgmentCaller(options)(
			"resolveGrammar",
			"de/Lexeme/NOUN/article",
			{
				sentence: indexedContext(encounter.sentence),
				target: {
					...encounter.target,
					memberSegmentIndices: [
						...encounter.target.memberSegmentIndices,
					],
				},
				noun: {
					canonicalForm: String(output.lemma.canonicalForm),
					coreFeatures: core,
				},
				features: {
					number: bag.number ?? null,
					gender: core.gender ?? null,
				},
				policy: "Select one licensed article attachment for the supplied noun, using the whole sentence independently of previous clicks. Candidates are possible analyses of source occurrences, not proof of attachment. Owned means an overt true article in this noun's supplied members. Shared means a standalone article licensed by compatible nominal coordination: der Aufstieg und Abstieg gives Owned for Aufstieg and Shared for Abstieg. A Fusion candidate supplies its internal DET form to its nominal complement, including compatible coordinated complements: im Wald gives dem Wald, ins Haus gives das Haus, and im Wald und Feld permits dem Feld. The fused word stays a separate Construction/Fusion target and never becomes a noun member. Distinguish actual governing Fusions from unrelated phrases, quoted words and nonnominal uses such as am besten. Standalone homographic pronouns are not articles. Sharing never crosses an explicit repeated article, clause boundary, nested nominal scope or incompatible agreement. Proximity alone does not license attachment; use grammatical scope. Ties or ambiguous attachment are Unresolved. mein/dieser/kein remain independent DETs and supply no article. None means no article is licensed, not uncertainty or a way to hide disagreement. If an article is required but no candidate represents it, including an unsupported spelling or Fusion, choose Unresolved.",
			},
			{
				attachment: choice(
					"Under `policy`, which complete article attachment in `sentence` is licensed for `target`, given `noun` and `features`?",
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
				),
			},
			signal,
		);
		const attachment = result.answers.attachment.choice;
		if (attachment === "Unresolved")
			return fail("Unresolved noun article attachment");
		if (attachment !== "None") {
			candidate = candidates.get(attachment);
			if (!candidate)
				return fail("Article attachment is not an eligible candidate");
		}
	}
	// Attachment precedes Case. A selected article constrains its possible analyses;
	// a unique Case is determined by the morphology, not a separate model guess.
	const casePath = "surface.inflectionalFeatures.case";
	const field = grammarFeatureFields("de/Lexeme/NOUN").get(casePath);
	if (!field) throw Error("Missing noun Case schema");
	let cases = field.values;
	if (candidate) {
		if (!bag.number || (bag.number !== "Plur" && !core.gender))
			return fail("Article requires known noun agreement");
		const forms =
			candidate.article === "Definite" ? definiteForms : indefiniteForms;
		cases = Object.entries(
			forms[bag.number === "Plur" ? "Plur" : (core.gender ?? "")] ?? {},
		)
			.filter(
				([caseValue, form]) =>
					form === candidate.form &&
					(candidate.case === null || caseValue === candidate.case),
			)
			.map(([caseValue]) => caseValue);
		if (!cases.length)
			return fail("Article form and noun agreement are incompatible");
	}
	if (cases.length === 1) bag.case = String(cases[0]);
	else {
		const result = await judgmentCaller(options)(
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
			signal,
		);
		const selected = result.answers[casePath].choice;
		if (selected === "Unresolved") return fail("Unresolved noun Case");
		bag.case = selected === "Unmarked" ? null : selected;
	}
	if (!candidate) {
		bag.article = null;
		return null;
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
	recordEvent(signal, "NounArticleEvidence", {
		segmentIndex: candidate.segmentIndex,
		realization: candidate.realization,
		attested: candidate.attested,
		orthography: candidate.orthography,
		articleForm: candidate.form,
		case: bag.case,
	});
	return {
		reference,
		evidence: {
			attested: candidate.attested,
			orthography: candidate.orthography,
		},
		coverage:
			candidate.realization === "Owned"
				? ("Full" as const)
				: ("Partial" as const),
	};
}
