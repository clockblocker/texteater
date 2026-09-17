import type { DumgenOptions, Encounter } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import { indexedContext } from "../../../universal/validation.js";
import { authoredMembers } from "../authored-closed-sets/inventory.js";
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
			: ["der", "die", "das"].includes(expected)
				? expected
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
	return { surface, reading: member.reading };
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
	if (
		!bag ||
		encounter.sentence.segments.filter(
			(segment) => segment.kind === "ResolvableText",
		).length < 2
	)
		return null;
	const core = output.lemma.coreFeatures as Record<string, string | null>;
	const fail = (message: string): never => {
		throw new DumgenFailure(
			"Unresolved",
			"resolveGrammar",
			message,
			"de/Lexeme/NOUN",
		);
	};
	const result = await judgmentCaller(options)(
		"resolveGrammar",
		"de/Lexeme/NOUN/article",
		{
			sentence: indexedContext(encounter.sentence),
			target: JSON.stringify(encounter.target),
			noun: JSON.stringify(output.lemma),
			features: {
				case: bag.case ?? null,
				number: bag.number ?? null,
				gender: core.gender ?? null,
			},
			policy: "Decide the article of the complete noun Surface, including licensed sharing, independently of whether the source article is a supplied member. In `der Aufstieg und Abstieg`, both nouns have Definite article: Aufstieg owns der and Abstieg shares that same der. `der Aufstieg und Abstieg und Umstieg` licenses it for all three. A singleton target Abstieg is not bare merely because der is owned by Aufstieg. In `der Aufstieg und der Abstieg`, each noun owns its own article. Select the overt article occurrence licensed by this noun. Owned means it belongs to supplied members and this is the closest eligible noun head by Segment distance within the nominal scope. Shared means it belongs to another closest noun in the same compatible coordination. Do not cross an explicit repeated article, clause boundary, nested nominal scope or incompatible agreement. Longer coordination is allowed. Ties or ambiguous attachment are Unresolved. No article may be invented for bare nouns, separate mein/dieser/kein or a noun following Fusion. Use the full Sentence, never previous clicks. A selected article must be a true definite/indefinite article, not a homographic pronoun.",
		},
		{
			article: choice(
				"Which article belongs to this noun Surface under the sharing policy?",
				{
					Definite: "Definite article owned or shared",
					Indefinite: "Indefinite article owned or shared",
					Bare: "No licensed article (including mein/dieser/kein or Fusion)",
					Unresolved: null,
				},
			),
			source: choice(
				"Which source occurrence supplies this noun's article?",
				{
					...Object.fromEntries(
						encounter.sentence.segments.flatMap((segment, index) =>
							segment.kind === "ResolvableText"
								? [[`s${index}`, segment.text]]
								: [],
						),
					),
					NoArticle: "This noun has no owned or shared article",
					Unresolved: "No defensible article source",
				},
			),
			orthography: choice(
				"Is the article's source spelling standard or a spelling/casing typo? Grammar disagreement is Unresolved, not a typo.",
				{ Standard: null, Typo: null, Unresolved: null },
			),
		},
		signal,
	);
	const selected = (key: keyof typeof result.answers) => {
		const answer = result.answers[key];
		if (!answer || answer.choice === "Unresolved")
			return fail(`Unresolved article ${key}`);
		return String(answer.choice);
	};
	const article = selected("article");
	const source = selected("source");
	if (article === "Bare") {
		if (source !== "NoArticle")
			return fail("Bare noun contradicts selected article evidence");
		bag.article = null;
		return null;
	}
	if (source === "NoArticle")
		return fail("Marked noun article requires source evidence");
	if (!bag.case || !bag.number || (bag.number !== "Plur" && !core.gender))
		return fail("Article requires known noun agreement");
	bag.article = article;
	const index = Number(source.slice(1));
	const segment = encounter.sentence.segments[index];
	if (!segment || segment.kind !== "ResolvableText")
		return fail("Article source is not selectable");
	const position = encounter.target.memberSegmentIndices.indexOf(index);
	const owned = position !== -1;
	if (
		owned &&
		(position !== 0 || encounter.target.memberSegmentIndices.length < 2)
	)
		return fail("Owned article must precede its noun members");
	if (!owned && index >= encounter.target.memberSegmentIndices[0]!)
		return fail("Shared article must precede the coordinated noun");
	const orthography = selected("orthography") as "Standard" | "Typo";
	if (owned && output.memberOrthographies[position] !== orthography)
		return fail("Article orthography contradicts member evidence");
	const expected = (
		bag.article === "Definite" ? definiteForms : indefiniteForms
	)[bag.number === "Plur" ? "Plur" : (core.gender ?? "")]?.[bag.case];
	const spelled = owned
		? output.normalizedMembers[position]!.toLocaleLowerCase("de")
		: orthography === "Typo"
			? expected
			: segment.text.toLocaleLowerCase("de");
	if (!spelled) return fail("Article agreement has no form");
	const reference = nounArticleReference({
		article: bag.article,
		case: bag.case,
		number: bag.number,
		gender: core.gender ?? null,
		spelled,
	});
	recordEvent(signal, "NounArticleEvidence", {
		segmentIndex: index,
		realization: owned ? "Owned" : "Shared",
		attested: segment.text,
		orthography,
	});
	return {
		reference,
		evidence: { attested: segment.text, orthography },
		coverage: owned ? ("Full" as const) : ("Partial" as const),
	};
}
