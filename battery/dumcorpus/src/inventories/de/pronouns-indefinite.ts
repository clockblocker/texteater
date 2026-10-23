import { absent, description, plural, stemAdder } from "./pronoun-authoring.js";
import {
	form,
	type PronounTable,
	pronounMember,
	pronounParadigm,
	pronounStemOf,
	strongPronoun,
} from "./pronoun-paradigm.js";
import {
	type AuthoredSpelling,
	canonical,
	licensed,
	type ReviewedMember,
	type SurfaceCell,
} from "./stem-lemma.js";

const reviewed: ReviewedMember[] = [];
const add = stemAdder(reviewed);
// Singular keiner/einer vs plural keine; eins/keins only in Nom/Acc Neut.
// einer is the pronominal use of the ein article table and, like it, a pillar
// with one Lemma per cell, a masculine and a neuter one for einem and for
// eines (mit einem der Kinder, eines der Häuser), whose Syncretism an open
// referent attests (system ADR 0046); irgendeiner and keiner are stems.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-einer3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-irgendein3.html?lang=de
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/e-Tilgung.html?lang=de
for (const [stem, ipa, pronType, definition, en, ru] of [
	[
		"ein",
		"ˈaɪ̯n",
		"Ind",
		"Bezeichnet eine unbestimmte einzelne Person oder Sache.",
		"one; someone",
		"один; кто-то",
	],
	[
		"irgendein",
		"ˈɪʁɡəntˌaɪ̯n",
		"Ind",
		"Bezeichnet eine beliebige, nicht näher bestimmte Person oder Sache.",
		"any one; someone",
		"какой-нибудь; кто-нибудь",
	],
	[
		"kein",
		"ˈkaɪ̯n",
		"Neg",
		"Verneint das Vorhandensein einer Person oder Sache aus der betreffenden Menge.",
		"none; no one",
		"никто; ни один",
	],
] as const) {
	const t = strongPronoun(stem, ipa),
		short = form(`${stem}es`, `${ipa}əs`, `${stem}s`);
	const table: PronounTable = {
		...t,
		Neut: [short, short, t.Neut[2], t.Neut[3]],
		Plur: stem === "kein" ? t.Plur : absent,
	};
	const meaning = description(
		pronType,
		stem === "kein" ? "🚫" : stem === "ein" ? "1⃣" : "❔",
		definition,
		[en],
		[ru],
	);
	if (stem === "ein") reviewed.push(...pronounParadigm(table, meaning));
	else add(table, meaning);
}
// Irgendwelche supplies the plural of irgendeiner, and also singular mass reference.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/index.html?lang=de
add(
	strongPronoun("irgendwelch", "ˈɪʁɡəntˌvɛlç"),
	description(
		"Ind",
		"❔",
		"Bezeichnet beliebige, nicht näher bestimmte Personen, Sachen oder Mengen.",
		["any; some"],
		["какие-нибудь; какой-нибудь"],
	),
);

// Indefinite welcher stands for an indefinite amount of a noun named before
// (Hast du Geld? Ich habe welches.), and is the PRON after a standalone was
// für (was für welche). It declines like irgendwelche. DWDS: 3welcher.
// https://www.dwds.de/wb/welcher
add(
	strongPronoun("welch", "ˈvɛlç"),
	description(
		"Ind",
		"❔",
		"Steht für eine unbestimmte Menge oder Anzahl von etwas vorher Genanntem.",
		["some; any"],
		["немного; какие-нибудь"],
	),
);

// all is total; keep each marked case instead of unmarked alle/alles placeholders.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-all3.html?lang=de
{
	const table = strongPronoun("all", "ˈal");
	add(
		table,
		description(
			"Tot",
			"🌐",
			"Bezeichnet die Gesamtheit einer Menge oder aller Mitglieder einer Gruppe.",
			["all; everything; everyone"],
			["все; всё"],
		),
		plural(table),
	);
}
// jeder is singular. Genitive jedes cannot stand alone, unlike eines jeden.
// Plural jedwede/jegliche is rare but closed: a Closed Route member covers every
// cell of its supported feature product (map 487, ticket 499).
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jeder3.html?lang=de
for (const [stem, ipa] of [
	["jed", "ˈjeːd"],
	["jedwed", "ˈjeːtveːd"],
	["jeglich", "ˈjeːɡlɪç"],
] as const) {
	const t = strongPronoun(stem, ipa);
	add(
		{
			...t,
			Masc: [t.Masc[0], t.Masc[1], t.Masc[2], null],
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
			Plur: stem === "jed" ? absent : t.Plur,
		},
		description(
			"Tot",
			"🌐",
			"Bezeichnet jedes einzelne Mitglied einer Gruppe ohne Ausnahme.",
			["each; everyone"],
			["каждый"],
		),
	);
}
// beide: neuter singular has no Gen. Weak beiden follows an article, where
// beide is ADJ with its noun elided or not (Die beiden kamen; die beiden
// Häuser; de/pron-or-det-by-use), so PRON beide has only its strong cells:
// Beide kamen.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-beide.html?lang=de
{
	const t = strongPronoun("beid", "ˈbaɪ̯d");
	add(
		{
			Masc: absent,
			Fem: absent,
			Neut: [t.Neut[0], t.Neut[1], t.Neut[2], null],
			Plur: [
				form("beide", "ˈbaɪ̯də"),
				form("beide", "ˈbaɪ̯də"),
				t.Plur[2],
				form("beider", "ˈbaɪ̯dɐ"),
			],
		},
		description(
			"Tot",
			"2⃣",
			"Bezeichnet die Gesamtheit zweier Personen oder Sachen.",
			["both"],
			["оба; обе"],
		),
	);
}

// jemand and niemand take article endings on their own stem, optional in use
// (mit jemand), and irgendjemand is jemand with irgend- in front, so each is a
// stem: one Lemma whose Surfaces mark the cell (system ADR 0032). They are
// singular and genderless; the bare stem also spells Acc and Dat.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-jemand3.html?lang=de
for (const [stem, ipa, pronType, emoji, definition, en, ru] of [
	[
		"jemand",
		"ˈjeːmant",
		"Ind",
		"👤",
		"Bezeichnet eine unbestimmte Person.",
		"someone; somebody",
		"кто-то",
	],
	[
		"niemand",
		"ˈniːmant",
		"Neg",
		"🚫",
		"Verneint, dass eine Person gemeint ist oder die Aussage erfüllt.",
		"nobody; no one",
		"никто",
	],
	[
		"irgendjemand",
		"ˈɪʁɡəntˌjeːmant",
		"Ind",
		"👤",
		"Bezeichnet eine beliebige, nicht näher bestimmte Person.",
		"anyone; someone",
		"кто-нибудь",
	],
] as const) {
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: "Sing",
		gender: null,
	});
	// Each cell's inflected form is Canonical. The bare stem in Acc and Dat
	// and the short genitive are Licensed Variants, other accepted forms of
	// the cell, as the user ruled on 2026-10-02.
	const spellings: AuthoredSpelling[] = [
		{ spelled: stem, cell: cell("Nom"), spelling: canonical },
		{ spelled: `${stem}en`, cell: cell("Acc"), spelling: canonical },
		{ spelled: stem, cell: cell("Acc"), spelling: licensed },
		{ spelled: `${stem}em`, cell: cell("Dat"), spelling: canonical },
		{ spelled: stem, cell: cell("Dat"), spelling: licensed },
		{ spelled: `${stem}es`, cell: cell("Gen"), spelling: canonical },
		{ spelled: `${stem}s`, cell: cell("Gen"), spelling: licensed },
	];
	reviewed.push(
		pronounStemOf(
			form(stem, ipa),
			description(pronType, emoji, definition, [en], [ru]),
			spellings,
		),
	);
}
// irgendwer puts the wer endings on irgend- and, like wer, is a stem with
// inherent Masc gender whose Surfaces mark case. Duden marks it colloquial and
// gives no genitive; irgendwas is its neuter counterpart, authored below.
// https://www.duden.de/rechtschreibung/irgendwer
{
	const cell = (grammaticalCase: SurfaceCell["case"]): SurfaceCell => ({
		case: grammaticalCase,
		number: null,
		gender: null,
	});
	const irgendjemand = reviewed.find(
		({ member }) => member.lemma.canonicalForm === "irgendjemand",
	)?.member.lemma;
	if (!irgendjemand) throw Error("irgendwer needs irgendjemand first");
	reviewed.push(
		pronounStemOf(
			form("irgendwer", "ˈɪʁɡəntˌveːɐ̯"),
			{
				core: { pronType: "Ind", gender: "Masc" },
				emoji: "👤",
				definition:
					"Bezeichnet eine beliebige, nicht näher bestimmte Person, umgangssprachlich: Irgendwer hat angerufen.",
				en: ["someone; anyone"],
				ru: ["кто-нибудь; кто-то"],
				synonyms: [irgendjemand],
			},
			[
				{
					spelled: "irgendwer",
					cell: cell("Nom"),
					spelling: canonical,
				},
				{
					spelled: "irgendwen",
					cell: cell("Acc"),
					spelling: canonical,
				},
				{
					spelled: "irgendwem",
					cell: cell("Dat"),
					spelling: canonical,
				},
			],
		),
	);
}
// man has one form of its own; its oblique cases are borrowed from einer
// (einen, einem), so it is an invariant Lemma with case unmarked (system ADR 0044).
// It always takes singular agreement.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/Pron-man.html?lang=de
reviewed.push(
	pronounMember(
		form("man", "man"),
		description(
			"Ind",
			"👤",
			"Bezeichnet Menschen allgemein oder nicht näher bestimmte Handelnde.",
			["one; people; you"],
			["люди; неопределённо-личное местоимение"],
		),
		{ number: "Sing" },
	),
);
// Invariant expressions keep unmarked coordinates, per system ADR 0044.
// https://dict.leo.org/grammatik/deutsch/Wort/Pronomen/FRegeln-P/Pron-Indef/index.html?lang=de
for (const [text, ipa, en, ru] of [
	["etwas", "ˈɛtvas", "something", "что-то"],
	["irgendetwas", "ˈɪʁɡəntˌɛtvas", "anything; something", "что-нибудь"],
	["irgendwas", "ˈɪʁɡəntvas", "anything; something", "что-нибудь"],
] as const)
	reviewed.push(
		pronounMember(
			form(text, ipa),
			description(
				"Ind",
				"📦",
				"Bezeichnet eine nicht näher bestimmte Sache oder einen Sachverhalt.",
				[en],
				[ru],
			),
		),
	);

// ein wenig is one invariant Lemma in every use (de/quantifier-by-use): its ein
// never inflects (mit ein wenig Geduld). Naming an amount (ein wenig Zucker)
// and grading (ein wenig müde) are shades of one meaning, so it has one
// Reading.
// https://www.duden.de/rechtschreibung/wenig
reviewed.push(
	pronounMember(
		form("ein wenig", "aɪ̯n ˈveːnɪç"),
		description(
			"Ind",
			"🤏",
			"Bezeichnet eine kleine, nicht näher bestimmte Menge oder einen geringen Grad, etwas, ein bisschen: Gib mir ein wenig Zucker. Sie war ein wenig müde.",
			["a little; a bit"],
			["немного; чуть-чуть"],
		),
	),
);

// ein paar 'a few' is one invariant Lemma in every use, as ein wenig is
// (de/quantifier-by-use): its ein never inflects (mit ein paar Freunden), so
// it is no article agreeing with the plural noun after it, and it stands
// before a noun (ein paar Sekunden) or alone (ich nehme ein paar). Duden
// lists lowercase paar as an indeclinable indefinite pronoun; capitalized
// Paar 'pair' is the noun (ein Paar Schuhe).
// https://www.duden.de/rechtschreibung/paar_einige
reviewed.push(
	pronounMember(
		form("ein paar", "aɪ̯n ˈpaːɐ̯"),
		description(
			"Ind",
			"🤏🔢",
			"Bezeichnet eine kleine, nicht näher bestimmte Anzahl, einige wenige: Nach ein paar Sekunden ging die Tür auf. Von den Äpfeln nehme ich ein paar.",
			["a few; a couple of"],
			["несколько; пара"],
		),
	),
);

// Quantity bisschen is one invariant Lemma in every use (de/quantifier-by-use):
// ein or der before it is a satellite (ein bisschen Zucker, das bisschen
// Geld), and alone it grades (klingt bisschen förmlich). Duden lists it as an
// indeclinable indefinite pronoun; bißchen is its pre-1996 spelling, a
// Historical Variant (realizations.ts).
// https://www.duden.de/rechtschreibung/bisschen
reviewed.push(
	pronounMember(
		form("bisschen", "ˈbɪsçən"),
		description(
			"Ind",
			"🤏",
			"Bezeichnet eine kleine, nicht näher bestimmte Menge oder einen geringen Grad, ein wenig: Gib mir ein bisschen Zucker. Das klingt bisschen förmlich.",
			["a bit; a little"],
			["немного; чуть-чуть"],
		),
	),
);

// Standalone einander is one invariant reciprocal Lemma (system ADR 0044); case
// is supplied by the governing verb or preposition and is not part of identity.
reviewed.push(
	pronounMember(
		form("einander", "aɪ̯ˈnandɐ"),
		description(
			"Rcp",
			"🤝",
			"Bezeichnet eine wechselseitige Beziehung zwischen den Mitgliedern einer Gruppe.",
			["each other; one another"],
			["друг друга"],
		),
	),
);

/** The indefinite, total, negative and reciprocal pronouns. */
export const indefinitePronouns: readonly ReviewedMember[] = reviewed;
