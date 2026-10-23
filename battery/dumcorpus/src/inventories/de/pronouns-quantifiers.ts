import { absent, description, plural, stemAdder } from "./pronoun-authoring.js";
import {
	form,
	type PronounTable,
	pronounMember,
	strongPronoun,
} from "./pronoun-paradigm.js";
import type { ReviewedMember } from "./stem-lemma.js";

const reviewed: ReviewedMember[] = [];
const add = stemAdder(reviewed);
// Indefinite is not total: several and some are partial quantities.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-manch3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-mehrere3.html?lang=de
add(
	strongPronoun("manch", "ˈmanç"),
	description(
		"Ind",
		"🔢",
		"Bezeichnet einzelne Mitglieder einer unbestimmten, oft beträchtlichen Gruppe.",
		["some; many a one"],
		["некоторые; иной"],
	),
);
add(
	{
		Plur: [
			form("mehrere", "ˈmeːʁəʁə"),
			form("mehrere", "ˈmeːʁəʁə"),
			form("mehreren", "ˈmeːʁəʁən"),
			form("mehrerer", "ˈmeːʁəʁɐ"),
		],
		Masc: absent,
		Neut: absent,
		Fem: absent,
	},
	description(
		"Ind",
		"🔢",
		"Bezeichnet eine unbestimmte Mehrzahl von Personen oder Sachen.",
		["several; multiple"],
		["несколько"],
	),
);

// Standalone quantifiers (ticket 503): a determiner form without a noun is PRON,
// resolved in the pronoun catalog; DET keeps the attributive identity. viel and
// wenig stand alone as neuter mass singular (vieles, bare viel) or plural; the
// genitive is adjectival -en. Masc/Fem singular has no standalone use. Like
// the DETs, both cite their usual bare form (de/canonical-form-is-the-headword).
// Bare viel and wenig (Er weiß viel) spell the Lemma without a cell, as DET
// viel's uninflected spelling does; vieles, vielem and weniges stay Canonical
// in their cells (decided by agents under the user's delegation, 2026-10-02).
for (const [stem, ipa, emoji, definition, en, ru] of [
	[
		"viel",
		"ˈfiːl",
		"🔢",
		"Bezeichnet eine große unbestimmte Menge oder Anzahl.",
		"much; many; a lot",
		"многое; многие",
	],
	[
		"wenig",
		"ˈveːnɪɡ",
		"➖",
		"Bezeichnet eine geringe unbestimmte Menge oder Anzahl.",
		"little; few",
		"немногое; немногие",
	],
] as const) {
	const t = strongPronoun(stem, ipa);
	const table: PronounTable = {
		Masc: absent,
		Fem: absent,
		Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
		Plur: t.Plur,
	};
	add(table, description("Ind", emoji, definition, [en], [ru]), {
		// Transcriptions reviewed with the bare headword, as on the DETs.
		canonicalForm: form(stem, stem === "viel" ? "fiːl" : "ˈveːnɪç"),
		uninflected: [stem],
	});
}
// meist has no PRON: standing alone it still follows its article (das meiste,
// die meisten), so it is ADJ viel with its noun elided (Rule
// de/quantifier-by-use).
// sämtlich is total; standalone as neuter mass singular or plural.
{
	const t = strongPronoun("sämtlich", "ˈzɛmtlɪç");
	const table: PronounTable = {
		Masc: absent,
		Fem: absent,
		Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
		Plur: t.Plur,
	};
	add(
		table,
		description(
			"Tot",
			"🌐",
			"Bezeichnet die Gesamtheit einer Menge ohne Ausnahme.",
			["all; the whole of"],
			["всё; все"],
		),
		plural(table),
	);
}

// Comparative quantifiers without a noun (Mehr als die Hälfte; Weniger ist mehr)
// are invariant PRON identities; case comes from the clause (ticket 503). PRON
// has no degree, so they are Lemmas of their own. The attributive comparatives
// are the Cmp of DET viel and wenig (mehr Zeit, weniger Besucher).
for (const [text, ipa, emoji, definition, en, ru] of [
	[
		"mehr",
		"ˈmeːɐ̯",
		"➕",
		"Bezeichnet eine größere Menge oder Anzahl als die verglichene.",
		"more",
		"больше; более",
	],
	[
		"weniger",
		"ˈveːnɪɡɐ",
		"➖",
		"Bezeichnet eine geringere Menge oder Anzahl als die verglichene.",
		"less; fewer",
		"меньше; менее",
	],
] as const) {
	reviewed.push(
		pronounMember(
			form(text, ipa),
			description("Ind", emoji, definition, [en], [ru]),
		),
	);
}

// Strong adjectival genitive -en, not pronominal -es.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-einige3.html?lang=de
for (const [stem, ipa, en, ru] of [
	["einig", "ˈaɪ̯nɪɡ", "some", "некоторые; немного"],
	["etlich", "ˈɛtlɪç", "several; quite a few", "несколько; немало"],
	["etwelch", "ˈɛtvɛlç", "some", "некоторые"],
] as const) {
	const t = strongPronoun(stem, ipa);
	const table: PronounTable = {
		...t,
		Masc: [t.Masc[0], t.Masc[1], t.Masc[2], t.Masc[1]],
		Neut: [t.Neut[0], t.Neut[1], t.Neut[2], t.Masc[1]],
	};
	add(
		table,
		description(
			"Ind",
			"🔢",
			`Bezeichnet eine unbestimmte Menge oder Anzahl.${stem === "etwelch" ? " Die Form ist selten und eher veraltet." : ""}`,
			[en],
			[ru],
		),
		plural(table),
	);
}

/** The standalone quantifiers, from manch and mehrere to einige. */
export const quantifierPronouns: readonly ReviewedMember[] = reviewed;
