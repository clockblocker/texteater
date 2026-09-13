import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { nounCitation, nounInflection } from "./builders";

export const inflectionCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-noun-demo-citation-haus": nounCitation({
			markedContext: "Wörterbucheintrag: <TARGET>Haus</TARGET>.",
			members: ["Haus"],
			canonicalForm: "Haus",
			gender: "Neut",
		}),
		"grammar-de-noun-demo-acc-sing-hund": nounInflection({
			markedContext: "Sie sieht den <TARGET>Hund</TARGET> im Garten.",
			members: ["Hund"],
			canonicalForm: "Hund",
			gender: "Masc",
			case: "Acc",
			number: "Sing",
		}),
		"grammar-de-noun-demo-dat-plur-kindern": nounInflection({
			markedContext:
				"Er hilft den <TARGET>Kindern</TARGET> bei den Aufgaben.",
			members: ["Kindern"],
			canonicalForm: "Kind",
			gender: "Neut",
			case: "Dat",
			number: "Plur",
		}),
		"grammar-de-noun-dev-nom-plur-banken": nounInflection({
			markedContext: "Die <TARGET>Banken</TARGET> öffnen um neun Uhr.",
			members: ["Banken"],
			canonicalForm: "Bank",
			gender: "Fem",
			case: "Nom",
			number: "Plur",
		}),
		"grammar-de-noun-dev-dat-sing-bibliothek": nounInflection({
			markedContext: "Wir sitzen in der <TARGET>Bibliothek</TARGET>.",
			members: ["Bibliothek"],
			canonicalForm: "Bibliothek",
			gender: "Fem",
			case: "Dat",
			number: "Sing",
		}),
		"grammar-de-noun-dev-gen-sing-mannes": nounInflection({
			markedContext: "Das Fahrrad des <TARGET>Mannes</TARGET> ist neu.",
			members: ["Mannes"],
			canonicalForm: "Mann",
			gender: "Masc",
			case: "Gen",
			number: "Sing",
		}),
		"grammar-de-noun-dev-gen-plur-frauen": nounInflection({
			markedContext:
				"Die Stimmen der <TARGET>Frauen</TARGET> waren deutlich.",
			members: ["Frauen"],
			canonicalForm: "Frau",
			gender: "Fem",
			case: "Gen",
			number: "Plur",
		}),
		"grammar-de-noun-dev-vocative-leute": nounInflection({
			markedContext: "Hallo, <TARGET>Leute</TARGET>, hört kurz zu!",
			members: ["Leute"],
			canonicalForm: "Leute",
			gender: null,
			case: null,
			number: "Plur",
		}),
		"grammar-de-noun-dev-acc-plur-buecher": nounInflection({
			markedContext:
				"Sie kauft die <TARGET>Bücher</TARGET> für den Kurs.",
			members: ["Bücher"],
			canonicalForm: "Buch",
			gender: "Neut",
			case: "Acc",
			number: "Plur",
		}),
		"grammar-de-noun-dev-nom-sing-maedchen": nounInflection({
			markedContext:
				"Das <TARGET>Mädchen</TARGET> wartet vor der Schule.",
			members: ["Mädchen"],
			canonicalForm: "Mädchen",
			gender: "Neut",
			case: "Nom",
			number: "Sing",
		}),
		"grammar-de-noun-dev-acc-sing-stadt": nounInflection({
			markedContext:
				"Wir besuchen die <TARGET>Stadt</TARGET> am Wochenende.",
			members: ["Stadt"],
			canonicalForm: "Stadt",
			gender: "Fem",
			case: "Acc",
			number: "Sing",
		}),
		"grammar-de-noun-dev-dat-sing-chef": nounInflection({
			markedContext:
				"Sie spricht mit dem <TARGET>Chef</TARGET> über den Plan.",
			members: ["Chef"],
			canonicalForm: "Chef",
			gender: "Masc",
			case: "Dat",
			number: "Sing",
		}),
		"grammar-de-noun-dev-nom-plur-eltern": nounInflection({
			markedContext: "Die <TARGET>Eltern</TARGET> warten draußen.",
			members: ["Eltern"],
			canonicalForm: "Eltern",
			gender: null,
			case: "Nom",
			number: "Plur",
		}),
		"grammar-de-noun-dev-acc-plur-knie": nounInflection({
			markedContext:
				"Der Arzt untersucht beide <TARGET>Knie</TARGET> gründlich.",
			members: ["Knie"],
			canonicalForm: "Knie",
			gender: "Neut",
			case: "Acc",
			number: "Plur",
			explanation:
				"The plural is fixed by beide while the noun form is invariant.",
		}),
		"grammar-de-noun-accept-nom-sing-mark": nounInflection({
			markedContext: "Die <TARGET>Mark</TARGET> war damals die Währung.",
			members: ["Mark"],
			canonicalForm: "Mark",
			gender: "Fem",
			case: "Nom",
			number: "Sing",
			explanation:
				"Currency context fixes common NOUN, not a personal name.",
		}),
		"grammar-de-noun-accept-nom-sing-tisch": nounInflection({
			markedContext: "Der <TARGET>Tisch</TARGET> steht am Fenster.",
			members: ["Tisch"],
			canonicalForm: "Tisch",
			gender: "Masc",
			case: "Nom",
			number: "Sing",
		}),
		"grammar-de-noun-accept-acc-sing-tuer": nounInflection({
			markedContext: "Sie öffnet die <TARGET>Tür</TARGET> ganz leise.",
			members: ["Tür"],
			canonicalForm: "Tür",
			gender: "Fem",
			case: "Acc",
			number: "Sing",
		}),
		"grammar-de-noun-accept-dat-plur-haeusern": nounInflection({
			markedContext:
				"Zwischen den <TARGET>Häusern</TARGET> liegt ein Hof.",
			members: ["Häusern"],
			canonicalForm: "Haus",
			gender: "Neut",
			case: "Dat",
			number: "Plur",
		}),
		"grammar-de-noun-accept-gen-plur-kinder": nounInflection({
			markedContext: "Das Lachen der <TARGET>Kinder</TARGET> war laut.",
			members: ["Kinder"],
			canonicalForm: "Kind",
			gender: "Neut",
			case: "Gen",
			number: "Plur",
		}),
		"grammar-de-noun-accept-invariant-plur-maedchen": nounInflection({
			markedContext: "Die drei <TARGET>Mädchen</TARGET> spielen draußen.",
			members: ["Mädchen"],
			canonicalForm: "Mädchen",
			gender: "Neut",
			case: "Nom",
			number: "Plur",
		}),
		"grammar-de-noun-accept-plural-only-ferien": nounInflection({
			markedContext: "Die <TARGET>Ferien</TARGET> beginnen morgen.",
			members: ["Ferien"],
			canonicalForm: "Ferien",
			gender: null,
			case: "Nom",
			number: "Plur",
		}),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
