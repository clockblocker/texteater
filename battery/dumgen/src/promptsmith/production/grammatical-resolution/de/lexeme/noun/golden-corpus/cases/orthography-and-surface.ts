import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { nounInflection } from "./builders";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-noun-demo-typo-kaffe": nounInflection({
				markedContext: "Der <TARGET>Kaffe</TARGET> duftet am Morgen.",
				members: ["Kaffe"],
				normalizedMembers: ["Kaffee"],
				memberOrthographies: ["Typo"],
				canonicalForm: "Kaffee",
				gender: "Masc",
				case: "Nom",
				number: "Sing",
			}),
			"grammar-de-noun-demo-archaic-antlitz": nounInflection({
				markedContext: "Sie bewundert sein <TARGET>Antlitz</TARGET>.",
				members: ["Antlitz"],
				canonicalForm: "Antlitz",
				gender: "Neut",
				case: "Acc",
				number: "Sing",
				archaic: true,
			}),
			"grammar-de-noun-dev-hyphenated-u-bahn": nounInflection({
				markedContext:
					"Sie nimmt die <TARGET>U-Bahn</TARGET> zur Arbeit.",
				members: ["U-Bahn"],
				canonicalForm: "U-Bahn",
				gender: "Fem",
				hyph: "Yes",
				case: "Acc",
				number: "Sing",
			}),
			"grammar-de-noun-dev-variant-photographie": nounInflection({
				markedContext:
					"Die Redaktion führt „Fotografie“ als Leitform; die <TARGET>Photographie</TARGET> im Zitat bleibt zulässig.",
				members: ["Photographie"],
				canonicalForm: "Fotografie",
				gender: "Fem",
				spelling: "Variant",
				case: "Nom",
				number: "Sing",
				explanation:
					"Context names editorial headword; attested equal standard variant stays Variant.",
			}),
			"grammar-de-noun-dev-lowercase-katze": nounInflection({
				markedContext:
					"Sie streichelt die <TARGET>katze</TARGET> vorsichtig.",
				members: ["katze"],
				normalizedMembers: ["Katze"],
				memberOrthographies: ["Typo"],
				canonicalForm: "Katze",
				gender: "Fem",
				case: "Acc",
				number: "Sing",
			}),
			"grammar-de-noun-dev-archaic-odem": nounInflection({
				markedContext:
					"Der <TARGET>Odem</TARGET> des Greises ging schwer.",
				members: ["Odem"],
				canonicalForm: "Odem",
				gender: "Masc",
				case: "Nom",
				number: "Sing",
				archaic: true,
			}),
			"grammar-de-noun-dev-compound-haustuer": nounInflection({
				markedContext: "Er streicht die <TARGET>Haustür</TARGET> grün.",
				members: ["Haustür"],
				canonicalForm: "Haustür",
				gender: "Fem",
				case: "Acc",
				number: "Sing",
			}),
			"grammar-de-noun-dev-substantivized-reisenden": nounInflection({
				markedContext:
					"Die <TARGET>Reisenden</TARGET> steigen am Bahnhof aus.",
				members: ["Reisenden"],
				canonicalForm: "Reisende",
				gender: null,
				case: "Nom",
				number: "Plur",
			}),
			"grammar-de-noun-dev-gen-sing-schule": nounInflection({
				markedContext:
					"Das Dach der <TARGET>Schule</TARGET> wird saniert.",
				members: ["Schule"],
				canonicalForm: "Schule",
				gender: "Fem",
				case: "Gen",
				number: "Sing",
			}),
			"grammar-de-noun-accept-hyphenated-e-mail": nounInflection({
				markedContext:
					"Sie beantwortet die <TARGET>E-Mail</TARGET> sofort.",
				members: ["E-Mail"],
				canonicalForm: "E-Mail",
				gender: "Fem",
				hyph: "Yes",
				case: "Acc",
				number: "Sing",
			}),
			"grammar-de-noun-accept-substantivized-angestellten":
				nounInflection({
					markedContext:
						"Wir danken den <TARGET>Angestellten</TARGET> für ihre Hilfe.",
					members: ["Angestellten"],
					canonicalForm: "Angestellte",
					gender: null,
					case: "Dat",
					number: "Plur",
				}),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
