import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedAphorism } from "./builders";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-aphorism-alt-werden": {
			...resolvedAphorism({
				attested: "„Alt werden, heißt sehend werden.“",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:alt-werden-heisst-sehend-werden",
			],
			explanation:
				"Every lexical member is selected; quotation marks, comma, and full stop are punctuation rather than Phraseme members.",
		},
		"grammar-de-aphorism-typo-hoert": {
			...resolvedAphorism({
				attested: "Wo die Eitelkeit anfängt, höhrt der Verstand auf.",
				normalized: "Wo die Eitelkeit anfängt hört der Verstand auf",
				canonical: "Wo die Eitelkeit anfängt hört der Verstand auf",
				typoMemberIndices: [4],
			}),
			contaminationKeys: [
				"de-aphorism-lemma:wo-die-eitelkeit-anfaengt-hoert-der-verstand-auf",
			],
			explanation:
				"The one misspelled member is repaired in the normalized Surface and marked Typo; punctuation remains outside membership.",
		},
		"grammar-de-aphorism-historical-muss": {
			...resolvedAphorism({
				attested: "Wer nichts weiß, muß alles glauben.",
				canonical: "Wer nichts weiß muss alles glauben",
				spelling: "Variant",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:wer-nichts-weiss-muss-alles-glauben",
			],
			explanation:
				"The attested 1893 muß is a licensed historical spelling, not a typo; the Canonical Form uses current muss.",
		},
		"grammar-de-aphorism-nachahmer": {
			...resolvedAphorism({
				attested: "Die meisten Nachahmer lockt das Unnachahmliche.",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-meisten-nachahmer"],
		},
		"grammar-de-aphorism-nachsicht": {
			...resolvedAphorism({
				attested:
					"Die meiste Nachsicht übt der, der die wenigste braucht.",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-meiste-nachsicht"],
		},
		"grammar-de-aphorism-kindheit": {
			...resolvedAphorism({
				attested:
					"Wer sich seiner eigenen Kindheit nicht mehr deutlich erinnert, ist ein schlechter Erzieher.",
			}),
			contaminationKeys: ["de-aphorism-lemma:wer-sich-seiner-kindheit"],
		},
		"grammar-de-aphorism-alter": {
			...resolvedAphorism({
				attested: "Das Alter verklärt oder versteinert.",
			}),
			contaminationKeys: ["de-aphorism-lemma:das-alter-verklaert"],
		},
		"grammar-de-aphorism-jugend": {
			...resolvedAphorism({
				attested: "In der Jugend lernt, im Alter versteht man.",
			}),
			contaminationKeys: ["de-aphorism-lemma:in-der-jugend-lernt"],
		},
		"grammar-de-aphorism-tadel": {
			...resolvedAphorism({
				attested:
					"Unbegründeter Tadel ist manchmal eine feine Form der Schmeichelei.",
			}),
			contaminationKeys: ["de-aphorism-lemma:unbegruendeter-tadel"],
		},
		"grammar-de-aphorism-liebe-rechte": {
			...resolvedAphorism({
				attested:
					"Die Liebe hat nicht nur Rechte, sie hat auch immer recht.",
			}),
			contaminationKeys: ["de-aphorism-lemma:die-liebe-hat-rechte"],
		},
		"grammar-de-aphorism-gegenwart": {
			...resolvedAphorism({
				attested:
					"Nur was für die Gegenwart zu gut ist, ist gut genug für die Zukunft.",
			}),
			contaminationKeys: ["de-aphorism-lemma:nur-was-fuer-die-gegenwart"],
		},
		"grammar-de-aphorism-streiten": {
			...resolvedAphorism({
				attested:
					"Nicht jene, die streiten, sind zu fürchten, sondern jene, die ausweichen.",
			}),
			contaminationKeys: ["de-aphorism-lemma:nicht-jene-die-streiten"],
		},
		"grammar-de-aphorism-unbezahlbar": {
			...resolvedAphorism({
				attested: "Man kann viele Dinge kaufen, die unbezahlbar sind.",
			}),
			contaminationKeys: [
				"de-aphorism-lemma:man-kann-viele-dinge-kaufen",
			],
		},
		"grammar-de-aphorism-grundsaetze": {
			...resolvedAphorism({
				attested:
					"Wenn zwei brave Menschen über Grundsätze streiten, haben immer beide recht.",
			}),
			contaminationKeys: ["de-aphorism-lemma:wenn-zwei-brave-menschen"],
		},
		"grammar-de-aphorism-casing-menschen": {
			...resolvedAphorism({
				attested:
					"die Menschen, denen wir eine Stütze sind, die geben uns den Halt im Leben.",
				normalized:
					"Die Menschen denen wir eine Stütze sind die geben uns den Halt im Leben",
				canonical:
					"Die Menschen denen wir eine Stütze sind die geben uns den Halt im Leben",
				typoMemberIndices: [0],
			}),
			contaminationKeys: [
				"de-aphorism-lemma:die-menschen-denen-wir-eine-stuetze-sind",
			],
			explanation:
				"Lowercase at the beginning of the complete maxim is inappropriate casing, so that member is Typo and normalized to Die.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
