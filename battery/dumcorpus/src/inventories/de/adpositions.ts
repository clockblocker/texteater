import type * as Dumling from "dumling/types";
import { type AuthoredMember, textTranslations } from "../member.js";
import { prepositions } from "./prepositions.js";

/**
 * The authored ADP Readings: a Fixed Population on the Open ADP route
 * (system ADR 0021). Each preposition that forms pronominal adverbs has one
 * generic Reading labelled with the emoji its pronominal adverbs carry
 * (`prepositions.ts`), so `an` is 📌 as `daran` is. A sense gold names
 * apart is a Reading of its own (`extraSenses`). A sense none of them covers
 * gets a New, generated Reading beside them (#877 R4), and an adposition
 * outside the table stays wholly generated.
 */

/** A German Lexeme ADP Lemma; German adpositions have no Core Features. */
const adpositionLemma = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm,
		coreFeatures: {},
	}) satisfies Dumling.Lemma<"de", "Lexeme", "ADP">;

type Sense = {
	readonly text: string;
	readonly emoji: string;
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
	/** Antonym Lemmas, the one relation a preposition here claims. */
	readonly antonym?: readonly string[];
};

/** Senses gold names with their own Emoji Description. */
const extraSenses: readonly Sense[] = [
	// Temporal an, `am Montag`, `am nächsten Morgen`: gold names it 📅 apart
	// from local an 📌, as Duden lists the zeitlich use apart.
	{
		text: "an",
		emoji: "📅",
		definition:
			"Bezeichnet den Zeitpunkt, besonders den Tag, das Datum oder den Tagesabschnitt, an dem etwas geschieht: Am Montag habe ich frei. Sie kam am 3. Mai. Am Abend regnete es.",
		en: ["on", "in"],
		ru: ["в"],
	},
	// zu with a number, `zu zweien`, `zu Hunderten`: gold names it 👥, as
	// Duden lists the use that gives a number or amount apart.
	{
		text: "zu",
		emoji: "👥",
		definition:
			"Bezeichnet, in welcher Anzahl oder Menge Personen oder Dinge zusammen auftreten: Sie kamen zu zweit. Die Vögel zogen zu Hunderten vorbei.",
		en: ["in", "by"],
		ru: ["по"],
	},
];

/**
 * The antonyms DWDS lists that fit these Readings' senses: with and
 * without, above and below, earlier and later, behind and in front.
 */
const antonyms: Readonly<Record<string, readonly string[]>> = {
	mit: ["ohne"],
	über: ["unter"],
	unter: ["über"],
	vor: ["nach"],
	nach: ["vor"],
	hinter: ["vor"],
};

function adpositionMember(sense: Sense, ipa: string): AuthoredMember {
	const lemma = adpositionLemma(sense.text);
	const antonym = sense.antonym ?? [];
	return {
		lemma,
		reading: { unitKind: "Reading", emojiDescription: sense.emoji, lemma },
		knowledge: {
			transcription: ipa,
			definition: sense.definition,
			translations: {
				en: textTranslations(sense.en),
				ru: textTranslations(sense.ru),
			},
			...(antonym.length
				? {
						semanticRelations: {
							antonym: antonym.map(adpositionLemma),
						},
					}
				: {}),
		},
		coverage: {
			transcription: "Authored",
			definition: "Authored",
			translations: { en: "Authored", ru: "Authored" },
			semanticRelationTargetKind: "lemma",
			semanticRelations: {
				synonym: "ReviewedEmpty",
				nearSynonym: "ReviewedEmpty",
				antonym: antonym.length ? "Authored" : "ReviewedEmpty",
				nearAntonym: "ReviewedEmpty",
			},
		},
	};
}

/**
 * Every authored German ADP Reading: each table preposition's generic one,
 * then the senses gold names apart. The transcription drops the linking r a
 * vowel-initial preposition takes after da and wo (daran: an).
 */
export const adpositions: readonly AuthoredMember[] = [
	...prepositions.map((preposition) => ({
		text: preposition.text,
		emoji: preposition.emoji,
		...preposition.adposition,
		...(antonyms[preposition.text]
			? { antonym: antonyms[preposition.text] }
			: {}),
	})),
	...extraSenses,
].map((sense) => {
	const preposition = prepositions.find(({ text }) => text === sense.text);
	if (!preposition) throw Error(`No preposition ${sense.text}`);
	const ipa = preposition.ipa.replace(/^ʁ/u, "");
	// A two-syllable preposition is stressed on its first syllable (über: ˈyːbɐ).
	return adpositionMember(sense, /(ɐ|n̩)$/u.test(ipa) ? `ˈ${ipa}` : ipa);
});
