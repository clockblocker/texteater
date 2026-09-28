import type * as Dumling from "dumling/types";
import { type AuthoredMember, defineAuthoredMember } from "./member.js";

type Lemma = Dumling.Lemma<"de", "Lexeme", "ADV">;
type Use = "Int" | "Rel";

/** One use of a w-adverb: its Reading's emoji, definition and glosses. */
type Meaning = {
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};
/**
 * One w-adverb with its interrogative and relative use. `synonymOf` names the
 * adverb this one is a synonym of in both uses; only that direct claim is
 * stored, and the rest is projected (ADR 0012).
 */
type WhAdverb = {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
	readonly Int: Meaning;
	readonly Rel: Meaning;
};

// Duden lists each of these as an interrogative and a relative adverb. Their
// other uses are other Kinds and are not authored here: comparative wie is
// CCONJ (so groß wie sie) or SCONJ (so leise, wie er versprach), and causal
// or concessive wo (wo er doch krank ist) is SCONJ.
const adverbs: readonly WhAdverb[] = [
	{
		text: "wo",
		ipa: "voː",
		emoji: "📍",
		Int: {
			definition:
				"Fragt nach dem Ort, an dem sich etwas befindet oder geschieht.",
			en: ["where"],
			ru: ["где"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein und bezeichnet den Ort, an dem etwas ist oder geschieht: die Stadt, wo sie wohnt.",
			en: ["where; in which"],
			ru: ["где; в котором"],
		},
	},
	{
		text: "wohin",
		ipa: "voˈhɪn",
		emoji: "🛬",
		Int: {
			definition: "Fragt nach dem Ziel oder der Richtung einer Bewegung.",
			en: ["where to"],
			ru: ["куда"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein und bezeichnet das Ziel einer Bewegung: der Ort, wohin sie fährt.",
			en: ["where; to which"],
			ru: ["куда"],
		},
	},
	{
		text: "woher",
		ipa: "voˈheːɐ̯",
		emoji: "🛫",
		Int: {
			definition: "Fragt nach der Herkunft oder dem Ausgangspunkt.",
			en: ["where from"],
			ru: ["откуда"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein und bezeichnet die Herkunft oder den Ausgangspunkt: die Stadt, woher er kommt.",
			en: ["where from; from which"],
			ru: ["откуда"],
		},
	},
	{
		text: "wann",
		ipa: "van",
		emoji: "⏰",
		Int: {
			definition: "Fragt nach dem Zeitpunkt.",
			en: ["when"],
			ru: ["когда"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz ein, meist ohne Bezugswort, und bezeichnet einen Zeitpunkt: Komm, wann du willst.",
			en: ["whenever; when"],
			ru: ["когда"],
		},
	},
	{
		text: "wie",
		ipa: "viː",
		emoji: "🔧",
		Int: {
			definition:
				"Fragt nach der Art und Weise, dem Grad oder der Beschaffenheit: Wie geht das? Wie alt bist du?",
			en: ["how"],
			ru: ["как"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Art“, „Weise“ oder „Maß“ ein und bezeichnet die Art und Weise: die Art, wie er spricht.",
			en: ["how; the way in which"],
			ru: ["как; каким образом"],
		},
	},
	{
		text: "warum",
		ipa: "vaˈʁʊm",
		emoji: "🤔",
		Int: {
			definition: "Fragt nach dem Grund.",
			en: ["why"],
			ru: ["почему"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder ohne Bezugswort ein und bezeichnet den Grund: der Grund, warum sie geht.",
			en: ["why; for which"],
			ru: ["почему; по которой причине"],
		},
	},
	{
		text: "wieso",
		ipa: "viˈzoː",
		emoji: "🤔",
		synonymOf: "warum",
		Int: {
			definition:
				"Fragt nach dem Grund, oft umgangssprachlich oder erstaunt.",
			en: ["why; how come"],
			ru: ["почему; с чего"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder ohne Bezugswort ein und bezeichnet den Grund, eher umgangssprachlich: der Grund, wieso sie geht.",
			en: ["why; for which"],
			ru: ["почему; по которой причине"],
		},
	},
	{
		text: "weshalb",
		ipa: "vɛsˈhalp",
		emoji: "🤔",
		synonymOf: "warum",
		Int: {
			definition: "Fragt nach dem Grund.",
			en: ["why"],
			ru: ["почему"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder nach einem ganzen Satz ein und bezeichnet den Grund: Es regnete, weshalb wir blieben.",
			en: ["why; which is why"],
			ru: ["почему; поэтому"],
		},
	},
	{
		text: "weswegen",
		ipa: "vɛsˈveːɡn̩",
		emoji: "🤔",
		synonymOf: "warum",
		Int: {
			definition: "Fragt nach dem Grund.",
			en: ["why"],
			ru: ["почему"],
		},
		Rel: {
			definition:
				"Leitet einen Relativsatz nach „Grund“ oder nach einem ganzen Satz ein und bezeichnet den Grund: Es regnete, weswegen wir blieben.",
			en: ["why; which is why"],
			ru: ["почему; поэтому"],
		},
	},
];

const marker: Readonly<Record<Use, string>> = { Int: "❓", Rel: "🧩" };

/** A w-adverb has no comparison forms (ADR 0042); pronType is Core. */
function lemmaOf(text: string, use: Use): Lemma {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADV",
		canonicalForm: text,
		coreFeatures: {
			comparable: null,
			foreign: null,
			numType: null,
			pronType: use,
		},
	};
}

function whAdverb(adverb: WhAdverb, use: Use): AuthoredMember {
	const lemma = lemmaOf(adverb.text, use);
	const meaning = adverb[use];
	const synonym = adverb.synonymOf
		? [lemmaOf(adverb.synonymOf, use)]
		: undefined;
	return defineAuthoredMember({
		lemma,
		reading: {
			unitKind: "Reading",
			emojiDescription: `${marker[use]}${adverb.emoji}`,
			lemma,
		},
		knowledge: {
			transcription: adverb.ipa,
			definition: meaning.definition,
			translations: { en: [...meaning.en], ru: [...meaning.ru] },
			...(synonym ? { semanticRelations: { synonym } } : {}),
		},
		coverage: {
			transcription: "Authored",
			definition: "Authored",
			translations: { en: "Authored", ru: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: synonym ? "Authored" : "ReviewedEmpty",
				nearSynonym: "ReviewedEmpty",
				antonym: "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		},
	});
}

/**
 * The German interrogative and relative w-adverbs (wo, wohin, woher, wann,
 * wie, warum, wieso, weshalb, weswegen): one Int and one Rel Lemma each,
 * since pronType is Core, with one Reading. The wo(r)- pronominal adverbs are
 * in pronominal-adverbs.ts.
 */
export const whAdverbs: readonly AuthoredMember[] = (
	["Int", "Rel"] as const
).flatMap((use) => adverbs.map((adverb) => whAdverb(adverb, use)));
