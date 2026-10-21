/** Hebrew canonical grammar: Luna writes grammatical values; Dumling validates. */
import { isRecord } from "common-utils";
import { parseUnit } from "dumling";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../../errors.js";
import { askLuna } from "../../luna-call.js";
import type { GrammarModels } from "../de/grammar.js";
import type { GrammarResolution, ResolveGrammarInput } from "../types.js";
import { parsedHebrewDescription } from "./reading.js";
import { surfaceOutputSchema } from "./routes.js";
import { markedHebrewSentence, ownedArticle, targetMembers } from "./target.js";

export const hebrewGrammarPrompt = `Resolve the marked Hebrew learner unit in its actual sentence. Return JSON under the supplied Dumling schema, never a German identity. The source Segments and route are immutable. If genuinely impossible to identify, return surface:null and emojiDescription:null rather than inventing an identity.
Write emojiDescription FIRST, from emojiDescriptionInput and the contextual meaning of the target alone: a short stable emoji-only semantic label, not a translation, not an illustration of the surrounding scene. Distinguish clearly different homonym senses; fold subtle functional differences. Personal pronouns use 👈, possessives 🔐; do not encode gender/person/number as semantic identity. This draft must not depend on lemma hints, grammatical choices or stored Readings.
Then write surface: a complete Dumling Surface with its real Hebrew Lemma and contextual inflectional features. Use only the exact supplied schema fields and enumerations. Do not copy the encountered inflection into canonicalForm: nouns singular absolute, adjectives masculine singular, verbs dictionary past third-person masculine singular (not infinitive), unless genuinely lexically restricted. Cite Hebrew headwords without optional niqqud for dictionary reuse; keep consonantal spelling and lexical distinctions. Retain binyan in verb coreFeatures when determined. Every required nullable field must be written, not omitted: an ordinary verb has hebExistential:null (not No or false); reserve Yes for an existential lexeme. For הילדים אומרים תודה, אומרים is the present participle of אמר: hebBinyan:PAAL, hebExistential:null, verbForm:Part, tense:null, gender:Masc, number:Plur. Do not invent a Pres enum or change the contextual VERB route to avoid a required field. Hebrew gender can be a set when the lexeme admits both; do not guess missing features: use null.
The source-split article ה belongs to the noun/adjective Head, not to canonicalForm or normalizedSurface. Definite Hebrew forms use definite:Def; construct uses Cons where available. Construct state is contextual, not dependent on a spelling change: in ספר בישול, the head ספר has definite:Cons even though its singular spelling matches the absolute form; in ספר קטן, ספר is absolute and indefinite (definite:Ind). Keep canonicalForm ספר in both; do not merge the construct phrase into a Locution. normalizedSurface is the contextual lexical host's form, excluding the owned outer article and unrelated prefix pieces, without optional niqqud. A suffix pronoun is its own clicked unit: preserve its true written Hebrew pronoun piece as canonicalForm rather than inventing expanded source letters. Infinitival ל remains in normalizedSurface of the infinitive, not a preposition Lemma. Relative ה is SCONJ, not automatically an article. Detached ו/ש/ב/ל/כ/מ resolve as their own contextual syntactic words. Do not let routine article satellites turn a Lexeme into a Locution.
For Hebrew ADP coreFeatures.case, use Acc only for the definite-direct-object marker את: את in קראתי את הספר has case:Acc. Other lexical prepositions have case:null in this schema: עם in הלכתי עם חבר has case:null; recipient ל in נתתי ספר לילד has case:null. A preposition's complement or a UD dependency named case does not by itself imply accusative case. Decide by contextual function, not the spelling את alone.
Lemma hints are grammatical suggestions only, not compulsory identities. Homographs may have different POS or coreFeatures. Keep route language/family/kind exactly as supplied. Never infer a hidden article from spelling alone: unpointed בבית does not prove definiteness. Do not invent unattested Fusion components or source graphemes.`;

export const resolveHebrewGrammar = Effect.fnUntraced(function* (
	scope: OperationScope,
	models: GrammarModels,
	input: ResolveGrammarInput<"he">,
): Effect.fn.Return<
	GrammarResolution<"he">,
	ProviderFailure | InvalidModelOutput
> {
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
		scope,
		models.luna,
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
			const parsed = parseUnit(output.surface);
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
