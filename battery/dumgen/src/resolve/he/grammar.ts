/** Hebrew canonical grammar: Luna writes grammatical values; Dumling validates. */
import { isRecord } from "common-utils";
import { parseUnit } from "dumling";
import * as Effect from "effect/Effect";
import { CallLog } from "../../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../../errors.js";
import type { Jev } from "../../jev-call.js";
import { askLuna, type Luna } from "../../luna-call.js";
import type { GrammarResolution, ResolveGrammarInput } from "../types.js";
import { parsedHebrewDescription } from "./reading.js";
import { surfaceOutputSchema } from "./routes.js";
import { markedHebrewSentence, ownedArticle, targetMembers } from "./target.js";

export const hebrewGrammarPrompt = `Resolve the marked Hebrew learner unit in its actual sentence. Return JSON under the supplied Dumling schema, never a German identity. The source Segments and route are immutable. If genuinely impossible to identify, return surface:null and emojiDescription:null rather than inventing an identity.
Write emojiDescription FIRST, from emojiDescriptionInput and the contextual meaning of the target alone: a short stable emoji-only semantic label, not a translation, not an illustration of the surrounding scene. Distinguish clearly different homonym senses; fold subtle functional differences. Personal pronouns use 👈, possessives 🔐; do not encode gender/person/number as semantic identity. This draft must not depend on lemma hints, grammatical choices or stored Readings.
Then write surface: a complete Dumling Surface with its real Hebrew Lemma and contextual inflectional features. Use only the exact supplied schema fields and enumerations. Do not copy the encountered inflection into canonicalForm: nouns singular absolute, adjectives masculine singular, verbs dictionary past third-person masculine singular (not infinitive), unless genuinely lexically restricted. Cite Hebrew headwords without optional niqqud for dictionary reuse; keep consonantal spelling and lexical distinctions. Retain binyan in verb coreFeatures when determined. Every required nullable field must be written, not omitted: an ordinary verb has hebExistential:null (not No or false); reserve Yes for an existential lexeme. For הילדים אומרים תודה, אומרים is the present participle of אמר: hebBinyan:PAAL, hebExistential:null, verbForm:Part, tense:null, gender:Masc, number:Plur. Do not invent a Pres enum or change the contextual VERB route to avoid a required field. Noun grammatical gender is lexical, not the sex composition of its referents. A human group containing men and women does not imply both grammatical genders. In לכל עם יש מסורות משלו., noun עם has gender:Masc, not a gender set. Use a gender set only for a lexeme genuinely attested with both grammatical genders, in exact schema order ["Fem","Masc"]; use a scalar when only one applies. Do not guess missing features: use null.
The source-split article ה belongs to the noun/adjective Head, not to canonicalForm or normalizedSurface. Definite Hebrew forms use definite:Def; construct uses Cons where available. Construct state is contextual, not dependent on a spelling change: in ספר בישול, the head ספר has definite:Cons even though its singular spelling matches the absolute form; in ספר קטן, ספר is absolute and indefinite (definite:Ind). Keep canonicalForm ספר in both; do not merge the construct phrase into a Locution. A noun following a quantifier is not thereby construct: Cons belongs to the head that governs a following nominal complement, not automatically to that complement. Determine whether the target itself heads a construct chain in this sentence. An absolute indefinite NOUN has definite:Ind; a preceding quantifier alone is not evidence for Cons. In לכל עם יש מסורות משלו., עם has definite:Ind: יש is the existential predicate, not its nominal complement; in כל עם ישראל, עם has definite:Cons because ישראל is its nominal complement, despite preceding כל. normalizedSurface is the contextual lexical host's form, excluding the owned outer article and unrelated prefix pieces, without optional niqqud. A suffix pronoun is its own clicked unit: preserve its true written Hebrew pronoun piece as canonicalForm rather than inventing expanded source letters. Infinitival ל remains in normalizedSurface of the infinitive, not a preposition Lemma. Relative ה is SCONJ, not automatically an article. Detached ו/ש/ב/ל/כ/מ resolve as their own contextual syntactic words. Do not let routine article satellites turn a Lexeme into a Locution.
Determine construct state before choosing between absolute Ind and Def. In גַּג הַבַּיִת אָדֹם., target גַּג has definite:Cons, number:Sing, canonicalForm גג and normalizedSurface גג: it governs the nominal complement הַבַּיִת. The article on הַבַּיִת belongs to בית, not גג; the definite chain still has a construct head, not an Ind or Def head. Absence of an owned article is not enough to choose Ind. In גג אדום, גג is absolute Ind; in הגג אדום, גג is absolute Def with its own article. In גג של הבית, גג is absolute Ind: the separate genitive preposition של does not make the preceding noun construct.
For ADJ, unmarked definiteness is definite:null, not Ind (the supplied ADJ schema admits only Cons, Def, or null). A definite subject does not make a bare predicative adjective definite; decide the adjective's own morphology and syntactic role, not the subject's definiteness. An attributive adjective with its own definite article takes definite:Def; do not transfer that rule to a bare predicate.
For Hebrew ADP coreFeatures.case, use Acc only for the definite-direct-object marker את: את in קראתי את הספר has case:Acc. For the genitive marker של, use the supported Gen value: של in הספר של הילד has case:Gen. Other lexical prepositions have case:null in this schema: עם in הלכתי עם חבר has case:null; recipient ל in נתתי ספר לילד has case:null. A preposition's complement or a UD dependency named case does not by itself imply accusative case. Decide by contextual function, not the spelling את alone.
Lemma hints are grammatical suggestions only, not compulsory identities. Homographs may have different POS or coreFeatures. Keep route language/family/kind exactly as supplied. Never infer a hidden article from spelling alone: unpointed בבית does not prove definiteness. Do not invent unattested Fusion components or source graphemes.`;

// The generated JSON Schema does not retain Dumling's marked-bag refinement.
// Normalize only the known all-null optional bag; keep unknown/marked values
// for strict validation, and never mutate the provider response.
function normalizedSurfaceBag(surface: unknown): unknown {
	if (!isRecord(surface)) return surface;
	const bag = surface.surfaceFeatures;
	return isRecord(bag) &&
		Object.keys(bag).length === 1 &&
		bag.historicalStatus === null
		? { ...surface, surfaceFeatures: null }
		: surface;
}

export const resolveHebrewGrammar = Effect.fnUntraced(function* (
	input: ResolveGrammarInput<"he">,
): Effect.fn.Return<
	GrammarResolution<"he">,
	ProviderFailure | InvalidModelOutput,
	Jev | Luna | CallLog
> {
	const scope = yield* CallLog;

	if (input.language !== "he") throw Error("Hebrew grammar resolves he only");
	const members = targetMembers(input.sentence, input.unit);
	if (input.unit.route === "Unresolved") {
		scope.resolution({ outcome: "Unresolved", reason: "UnresolvedUnit" });
		return { _tag: "Unresolved" };
	}
	const route = input.unit.route;
	if (route.language !== "he") throw Error("Hebrew unit has a foreign route");
	const markedSentence = markedHebrewSentence(input.sentence, input.unit);
	const article = ownedArticle(input.sentence, input.unit);
	// Hint lookup is sentence-wide; only this target's lexical host may suggest
	// its identity. Vocalization is ignored for lookup, never for Attestation.
	const hintKey = (text: string) =>
		text.normalize("NFD").replace(/\p{M}/gu, "");
	const hostWords = new Set(
		members.flatMap((member, index) =>
			index === article ? [] : [hintKey(member.attested)],
		),
	);
	const lemmaHints = input.lemmaCandidates
		.filter(
			({ lemma, foundUnder }) =>
				lemma.language === "he" &&
				lemma.family === route.family &&
				lemma.kind === route.kind &&
				foundUnder.some((text) =>
					text
						.split(/\s+/u)
						.some((word) => hostWords.has(hintKey(word))),
				),
		)
		.map(({ lemma }) => ({
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		}));
	const result = yield* askLuna(
		"hebrewCanonical",
		{
			systemPrompt: hebrewGrammarPrompt,
			input: {
				emojiDescriptionInput: { markedSentence },
				sentence: input.sentence.text,
				markedSentence,
				route,
				members: members.map((member) => ({ text: member.attested })),
				neighbours: input.neighbours,
				lemmaHints,
			},
			outputFormat: "json",
			outputSchema: surfaceOutputSchema(route),
		},
		(output) => {
			const invalid = (message: string) =>
				new InvalidModelOutput({ stage: "hebrewCanonical", message });
			if (!isRecord(output))
				return invalid("Luna returned no Hebrew grammatical object");
			if (output.surface === null && output.emojiDescription === null)
				return { _tag: "Unresolved" } as const;
			const parsed = parseUnit(normalizedSurfaceBag(output.surface));
			if (!parsed.success)
				return invalid(
					`Invalid Hebrew Surface: ${parsed.error.message}`,
				);
			if (
				parsed.chain.unitKind !== "Surface" ||
				parsed.chain.language !== "he" ||
				parsed.chain.family !== route.family ||
				parsed.chain.kind !== route.kind
			)
				return invalid("Luna's Hebrew Surface left the stored route");
			const articleEvidence =
				article !== undefined && article >= 0
					? { kind: "Owned", member: article }
					: undefined;
			const attestation = parseUnit({
				unitKind: "Attestation",
				surface: parsed.chain.value,
				members,
				realizationCoverage: "Full",
				...(route.family === "Lexeme" &&
				["NOUN", "PROPN", "ADJ"].includes(route.kind)
					? { articleEvidence: articleEvidence ?? null }
					: {}),
			});
			if (!attestation.success)
				return invalid(
					`Invalid Hebrew Attestation: ${attestation.error.message}`,
				);
			if (
				attestation.chain.unitKind !== "Attestation" ||
				attestation.chain.language !== "he"
			)
				return invalid("No Hebrew Attestation");
			const drafted = parsedHebrewDescription(
				attestation.chain.value.surface.lemma,
				output.emojiDescription,
			);
			return {
				_tag: "Resolved",
				attestation: attestation.chain.value,
				...(drafted === undefined ? {} : { drafted }),
			} as const;
		},
	);
	scope.resolution({ outcome: result._tag });
	return result;
});
