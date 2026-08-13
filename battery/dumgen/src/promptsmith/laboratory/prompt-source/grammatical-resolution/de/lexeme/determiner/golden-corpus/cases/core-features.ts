import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import {
	citationCase,
	emptyInflection,
	inflectionCase,
	unmarkedCore,
} from "./builders";

const articleDef = {
	...unmarkedCore,
	definite: "Def",
	pronType: "Art",
} as const;
const articleInd = {
	...unmarkedCore,
	definite: "Ind",
	numType: "Card",
	pronType: "Art",
} as const;
const possessive = (person: "1" | "2" | "3") =>
	({ ...unmarkedCore, person, poss: "Yes", pronType: "Prs" }) as const;

export const determinerCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-det-demo-definite-article-der": inflectionCase(
			"<TARGET>Der</TARGET> Hund schläft vor der Tür.",
			"Der",
			"der",
			{ ...emptyInflection, case: "Nom", gender: "Masc", number: "Sing" },
			{ normalizedMember: "der", coreFeatures: articleDef },
		),
		"grammar-de-det-demo-possessive-meinem": inflectionCase(
			"Ich helfe <TARGET>meinem</TARGET> Bruder beim Umzug.",
			"meinem",
			"mein",
			{
				...emptyInflection,
				case: "Dat",
				gender: "Masc",
				number: "Sing",
				"number[psor]": "Sing",
			},
			{ coreFeatures: possessive("1") },
		),
		"grammar-de-det-demo-feminine-article-die": inflectionCase(
			"<TARGET>Die</TARGET> Ärztin beginnt gleich mit der Sprechstunde.",
			"Die",
			"der",
			{ ...emptyInflection, case: "Nom", number: "Sing" },
			{
				normalizedMember: "die",
				coreFeatures: articleDef,
				explanation:
					"Feminine agreement is contextual, but the exact DET codec cannot represent Fem in the agreement-gender field, so gender stays null.",
			},
		),
		"grammar-de-det-demo-uninflected-derlei": citationCase(
			"<TARGET>Derlei</TARGET> Vorfälle werden sofort dokumentiert.",
			"Derlei",
			"derlei",
			{
				normalizedMember: "derlei",
				coreFeatures: { ...unmarkedCore, pronType: "Dem" },
				explanation:
					"The codec has no invariant contextual Surface; use Citation for this uninflected DET while preserving its demonstrative identity.",
			},
		),
		"grammar-de-det-demo-variant-ne": inflectionCase(
			"Da steht <TARGET>ne</TARGET> Kiste auf dem Flur.",
			"ne",
			"ein",
			{ ...emptyInflection, case: "Nom", number: "Sing" },
			{ spelling: "Variant", coreFeatures: articleInd },
		),
		"grammar-de-det-demo-standalone-jener": inflectionCase(
			"<TARGET>Jener</TARGET> war deutlich günstiger als dieser hier.",
			"Jener",
			"jener",
			{ ...emptyInflection, case: "Nom", gender: "Masc", number: "Sing" },
			{
				normalizedMember: "jener",
				coreFeatures: { ...unmarkedCore, pronType: "Dem" },
				explanation:
					"The route is fixed DET, not PRON; German UD keeps the lexical determiner identity when it stands alone.",
			},
		),
		"grammar-de-det-demo-paradigm-welche": inflectionCase(
			"<TARGET>Welche</TARGET> Nachricht hat die Redaktion zuerst bestätigt?",
			"Welche",
			"welcher",
			{ ...emptyInflection, case: "Acc", number: "Sing" },
			{
				normalizedMember: "welche",
				coreFeatures: { ...unmarkedCore, pronType: "Int" },
				explanation:
					"The inflected member belongs to the welcher paradigm; canonicalForm is the full masculine nominative singular dictionary form, never the stem welch.",
			},
		),
		"grammar-de-det-demo-paradigm-manchem": inflectionCase(
			"Mit <TARGET>manchem</TARGET> Hinweis ließ sich das Rätsel schneller lösen.",
			"manchem",
			"mancher",
			{ ...emptyInflection, case: "Dat", gender: "Masc", number: "Sing" },
			{
				coreFeatures: { ...unmarkedCore, pronType: "Ind" },
				explanation:
					"The inflected member belongs to the mancher paradigm; canonicalForm preserves the full dictionary form rather than the stem manch.",
			},
		),
		"grammar-de-det-demo-quoted-archaic-etwelche": citationCase(
			"Das Wörterbuch kennzeichnet „<TARGET>etwelche</TARGET>“ ausdrücklich als veraltet.",
			"etwelche",
			"etwelcher",
			{
				historicalStatus: "Archaic",
				coreFeatures: { ...unmarkedCore, pronType: "Ind" },
				explanation:
					"The quoted archaic spelling is authoritative lexical material: preserve it literally in normalizedMembers and do not invent a modernizing typo repair.",
			},
		),

		"grammar-de-det-dev-indefinite-article-einen": inflectionCase(
			"Er zählt eins und kauft danach <TARGET>einen</TARGET> Mantel.",
			"einen",
			"ein",
			{ ...emptyInflection, case: "Acc", gender: "Masc", number: "Sing" },
			{
				coreFeatures: articleInd,
				explanation:
					"The marked route is DET, not the earlier NUM eins.",
			},
		),
		"grammar-de-det-dev-demonstrative-diesem": inflectionCase(
			"Mit <TARGET>diesem</TARGET> Plan schaffen wir den Termin.",
			"diesem",
			"dieser",
			{ ...emptyInflection, case: "Dat", gender: "Masc", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Dem" } },
		),
		"grammar-de-det-dev-emphatic-selben": inflectionCase(
			"Am <TARGET>selben</TARGET> Morgen fiel erneut der Strom aus.",
			"selben",
			"selber",
			{ ...emptyInflection, case: "Dat", gender: "Masc", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Emp" } },
		),
		"grammar-de-det-dev-exclamative-welch": citationCase(
			"<TARGET>Welch</TARGET> ein Glück, dass niemand verletzt wurde!",
			"Welch",
			"welch",
			{
				normalizedMember: "welch",
				coreFeatures: { ...unmarkedCore, pronType: "Exc" },
				explanation:
					"The exclamative DET is invariant here, so the exact codec uses Citation.",
			},
		),
		"grammar-de-det-dev-interrogative-welchen": inflectionCase(
			"<TARGET>Welchen</TARGET> Weg nehmen wir nach dem Bahnhof?",
			"Welchen",
			"welcher",
			{ ...emptyInflection, case: "Acc", gender: "Masc", number: "Sing" },
			{
				normalizedMember: "welchen",
				coreFeatures: { ...unmarkedCore, pronType: "Int" },
			},
		),
		"grammar-de-det-dev-relative-welchem": inflectionCase(
			"Er versprach pünktliche Lieferung, <TARGET>welchem</TARGET> Versprechen niemand glaubte.",
			"welchem",
			"welcher",
			{ ...emptyInflection, case: "Dat", gender: "Neut", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Rel" } },
		),
		"grammar-de-det-dev-negative-kein": inflectionCase(
			"Unter <TARGET>keinen</TARGET> Umständen geben wir das Passwort weiter.",
			"keinen",
			"kein",
			{ ...emptyInflection, case: "Dat", gender: "Masc", number: "Plur" },
			{
				coreFeatures: { ...unmarkedCore, pronType: "Neg" },
				explanation:
					"The classified target is the DET member inside a larger phraseme context; preserve the fixed upstream function-word membership.",
			},
		),
		"grammar-de-det-dev-total-alle": inflectionCase(
			"<TARGET>Alle</TARGET> Stühle stehen schon im Saal.",
			"Alle",
			"alle",
			{ ...emptyInflection, case: "Nom", gender: "Masc", number: "Plur" },
			{
				normalizedMember: "alle",
				coreFeatures: { ...unmarkedCore, pronType: "Tot" },
			},
		),
		"grammar-de-det-dev-total-beide": inflectionCase(
			"Sie prüfte <TARGET>beide</TARGET> Geräte vor dem Versand.",
			"beide",
			"beide",
			{ ...emptyInflection, case: "Acc", gender: "Neut", number: "Plur" },
			{
				coreFeatures: {
					...unmarkedCore,
					numType: "Card",
					pronType: "Tot",
				},
			},
		),
		"grammar-de-det-dev-indefinite-viele": inflectionCase(
			"<TARGET>Viele</TARGET> Bücher wurden an die Schule gespendet.",
			"Viele",
			"viel",
			{ ...emptyInflection, case: "Nom", gender: "Neut", number: "Plur" },
			{
				normalizedMember: "viele",
				coreFeatures: { ...unmarkedCore, pronType: "Ind" },
				explanation: "The upstream route is DET, not ADJ.",
			},
		),
		"grammar-de-det-dev-comparative-mehr": inflectionCase(
			"<TARGET>Mehr</TARGET> als die Hälfte der Gäste blieb bis zum Ende.",
			"Mehr",
			"mehr",
			{ ...emptyInflection, degree: "Cmp" },
			{
				normalizedMember: "mehr",
				coreFeatures: {
					...unmarkedCore,
					extPos: "DET",
					pronType: "Ind",
				},
			},
		),
		"grammar-de-det-dev-comparative-weniger": inflectionCase(
			"Heute kamen <TARGET>weniger</TARGET> als zwanzig Besucher.",
			"weniger",
			"wenig",
			{ ...emptyInflection, degree: "Cmp" },
			{
				coreFeatures: {
					...unmarkedCore,
					extPos: "ADV",
					pronType: "Ind",
				},
			},
		),
		"grammar-de-det-dev-superlative-meisten": inflectionCase(
			"Die <TARGET>meisten</TARGET> Gäste reisten am Sonntag ab.",
			"meisten",
			"meist",
			{
				...emptyInflection,
				case: "Nom",
				degree: "Sup",
				gender: "Masc",
				number: "Plur",
			},
			{ coreFeatures: { ...unmarkedCore, pronType: "Ind" } },
		),
		"grammar-de-det-dev-possessive-deinen": inflectionCase(
			"Du legst <TARGET>deinen</TARGET> Schlüssel auf den Tisch.",
			"deinen",
			"dein",
			{
				...emptyInflection,
				case: "Acc",
				gender: "Masc",
				number: "Sing",
				"number[psor]": "Sing",
			},
			{ coreFeatures: possessive("2") },
		),
		"grammar-de-det-dev-possessive-unserem": inflectionCase(
			"Wir vertrauen <TARGET>unserem</TARGET> Team auch unter Zeitdruck.",
			"unserem",
			"unser",
			{
				...emptyInflection,
				case: "Dat",
				gender: "Neut",
				number: "Sing",
				"number[psor]": "Plur",
			},
			{ coreFeatures: possessive("1") },
		),
		"grammar-de-det-dev-possessive-seinen-masc": inflectionCase(
			"Paul sucht <TARGET>seinen</TARGET> Ausweis seit dem Morgen.",
			"seinen",
			"sein",
			{
				...emptyInflection,
				case: "Acc",
				gender: "Masc",
				"gender[psor]": "Masc",
				number: "Sing",
				"number[psor]": "Sing",
			},
			{ coreFeatures: possessive("3") },
		),
		"grammar-de-det-dev-possessive-sein-neut": inflectionCase(
			"Das Kind räumt <TARGET>sein</TARGET> Zimmer vor dem Essen auf.",
			"sein",
			"sein",
			{
				...emptyInflection,
				case: "Acc",
				gender: "Neut",
				"gender[psor]": "Neut",
				number: "Sing",
				"number[psor]": "Sing",
			},
			{ coreFeatures: possessive("3") },
		),
		"grammar-de-det-dev-possessive-ihr-fem": inflectionCase(
			"Mara repariert <TARGET>ihr</TARGET> Radio noch heute.",
			"ihr",
			"ihr",
			{
				...emptyInflection,
				case: "Acc",
				gender: "Neut",
				"gender[psor]": "Fem",
				number: "Sing",
				"number[psor]": "Sing",
			},
			{ coreFeatures: possessive("3") },
		),
		"grammar-de-det-dev-formal-ihrem": inflectionCase(
			"Wir helfen <TARGET>Ihrem</TARGET> Team bei der Umstellung.",
			"Ihrem",
			"Ihr",
			{ ...emptyInflection, case: "Dat", gender: "Neut", number: "Sing" },
			{ coreFeatures: { ...possessive("2"), polite: "Form" } },
		),
		"grammar-de-det-dev-foreign-the": citationCase(
			"Im Workshop diskutierten wir <TARGET>the</TARGET> main issue zuerst.",
			"the",
			"the",
			{
				coreFeatures: {
					...unmarkedCore,
					definite: "Def",
					foreign: "Yes",
					pronType: "Art",
				},
				explanation:
					"The source-language article is invariant, so the exact German DET Surface codec uses Citation while retaining its source-language article identity.",
			},
		),
		"grammar-de-det-dev-ordinal-wievielte": inflectionCase(
			"Der <TARGET>wievielte</TARGET> Versuch war schließlich erfolgreich?",
			"wievielte",
			"wievielte",
			{ ...emptyInflection, case: "Nom", gender: "Masc", number: "Sing" },
			{
				coreFeatures: {
					...unmarkedCore,
					numType: "Ord",
					pronType: "Int",
				},
				explanation: "The upstream route is DET, not ADJ or NUM.",
			},
		),

		"grammar-de-det-accept-v4-definite-des": inflectionCase(
			"Wegen <TARGET>des</TARGET> Lärms schloss die Bibliothek früher.",
			"des",
			"der",
			{ ...emptyInflection, case: "Gen", gender: "Masc", number: "Sing" },
			{ coreFeatures: articleDef },
		),
		"grammar-de-det-accept-v4-indefinite-ein": inflectionCase(
			"<TARGET>Ein</TARGET> Kran hebt die schwere Kiste auf das Dach.",
			"Ein",
			"ein",
			{ ...emptyInflection, case: "Nom", gender: "Masc", number: "Sing" },
			{ normalizedMember: "ein", coreFeatures: articleInd },
		),
		"grammar-de-det-accept-v4-demonstrative-jenem": inflectionCase(
			"Mit <TARGET>jenem</TARGET> Schlüssel öffnet die Hausmeisterin den Keller.",
			"jenem",
			"jener",
			{ ...emptyInflection, case: "Dat", gender: "Masc", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Dem" } },
		),
		"grammar-de-det-accept-v4-interrogative-welches": inflectionCase(
			"Für <TARGET>welches</TARGET> Projekt beantragt das Institut die Mittel?",
			"welches",
			"welcher",
			{ ...emptyInflection, case: "Acc", gender: "Neut", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Int" } },
		),
		"grammar-de-det-accept-v4-negative-keinen": inflectionCase(
			"Die Ermittlerin fand <TARGET>keinen</TARGET> Zeugen für den Vorfall.",
			"keinen",
			"kein",
			{ ...emptyInflection, case: "Acc", gender: "Masc", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Neg" } },
		),
		"grammar-de-det-accept-v4-total-jeder": inflectionCase(
			"<TARGET>Jeder</TARGET> Schritt wird im Prüfprotokoll dokumentiert.",
			"Jeder",
			"jeder",
			{ ...emptyInflection, case: "Nom", gender: "Masc", number: "Sing" },
			{
				normalizedMember: "jeder",
				coreFeatures: { ...unmarkedCore, pronType: "Tot" },
			},
		),
		"grammar-de-det-accept-v4-possessive-deinem": inflectionCase(
			"Du hilfst <TARGET>deinem</TARGET> Bruder beim Aufbau des Schranks.",
			"deinem",
			"dein",
			{
				...emptyInflection,
				case: "Dat",
				gender: "Masc",
				number: "Sing",
				"number[psor]": "Sing",
			},
			{ coreFeatures: possessive("2") },
		),
		"grammar-de-det-accept-v4-formal-ihrem": inflectionCase(
			"Frau Roth, wir arbeiten eng mit <TARGET>Ihrem</TARGET> Büro zusammen.",
			"Ihrem",
			"Ihr",
			{ ...emptyInflection, case: "Dat", gender: "Neut", number: "Sing" },
			{ coreFeatures: { ...possessive("2"), polite: "Form" } },
		),
		"grammar-de-det-accept-v4-indefinite-manches": inflectionCase(
			"Die neue Messung erklärt <TARGET>manches</TARGET> Problem der alten Studie.",
			"manches",
			"mancher",
			{ ...emptyInflection, case: "Acc", gender: "Neut", number: "Sing" },
			{ coreFeatures: { ...unmarkedCore, pronType: "Ind" } },
		),
		"grammar-de-det-accept-v4-typo-disem": inflectionCase(
			"Mit <TARGET>disem</TARGET> Plan erreicht das Team sein Ziel nicht.",
			"disem",
			"dieser",
			{ ...emptyInflection, case: "Dat", gender: "Masc", number: "Sing" },
			{
				orthography: "Typo",
				normalizedMember: "diesem",
				coreFeatures: { ...unmarkedCore, pronType: "Dem" },
			},
		),
		"grammar-de-det-accept-v4-variant-n": inflectionCase(
			"Wir brauchen für den Transport noch <TARGET>n</TARGET> Auto.",
			"n",
			"ein",
			{ ...emptyInflection, case: "Acc", gender: "Neut", number: "Sing" },
			{ spelling: "Variant", coreFeatures: articleInd },
		),
		"grammar-de-det-accept-v4-archaic-etwelches": citationCase(
			"Der historische Kommentar zitiert „<TARGET>etwelches</TARGET>“ und markiert die Form als veraltet.",
			"etwelches",
			"etwelcher",
			{
				historicalStatus: "Archaic",
				coreFeatures: { ...unmarkedCore, pronType: "Ind" },
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
