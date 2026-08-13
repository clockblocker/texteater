import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { interjectionCase } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-intj-demo-contextual-ach-after-noun": interjectionCase(
			"Sein ständiges Ach störte sie; später seufzte er <TARGET>ach</TARGET>.",
			["ach"],
			"ach",
			null,
			{
				explanation:
					"The marked occurrence is already classified INTJ; the unmarked nominal use does not change its route or Lemma.",
			},
		),

		"grammar-de-intj-dev-beside-part-ja": interjectionCase(
			"Das ist ja erstaunlich; auf ihre Frage antwortete er <TARGET>ja</TARGET>.",
			["ja"],
			"ja",
			"Res",
			{
				explanation:
					"The unmarked ja is a modal particle; the supplied answer occurrence is fixed upstream as INTJ and carries Res.",
			},
		),
		"grammar-de-intj-dev-beside-discourse-formula-oh": interjectionCase(
			"Nach dem Guten Morgen sah er die Rechnung und sagte <TARGET>oh</TARGET>.",
			["oh"],
			"oh",
			undefined,
			{
				explanation:
					"The nearby greeting is an unmarked DiscourseFormula; the authoritative singleton reaction remains INTJ.",
			},
		),
		"grammar-de-intj-dev-beside-adv-na": interjectionCase(
			"Nun war alles vorbereitet; <TARGET>na</TARGET>, dann erzähl endlich.",
			["na"],
			"na",
			undefined,
			{
				explanation:
					"The unmarked nun is an adverb; the prompting target is independently classified INTJ.",
			},
		),

		"grammar-de-intj-accept-v2-ordinary-lexical-mist": interjectionCase(
			"Der Mist lag auf dem Feld; am Bahnhof rief jemand <TARGET>Mist</TARGET>!",
			["Mist"],
			"Mist",
			undefined,
			{
				explanation:
					"The unmarked noun and marked secondary interjection share spelling, but the supplied route is authoritative.",
			},
		),
		"grammar-de-intj-accept-v2-beside-formula-aehm": interjectionCase(
			"Sie sagte vielen Dank; er zögerte nur <TARGET>ähm</TARGET>.",
			["ähm"],
			"ähm",
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
