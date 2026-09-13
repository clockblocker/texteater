import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { subordinatingConjunctionCase } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-dev-beside-adp-waehrend":
			subordinatingConjunctionCase(
				"Während des Urlaubs las Nora, <TARGET>während</TARGET> die Kinder schliefen.",
				["während"],
				"während",
				undefined,
				{
					explanation:
						"The unmarked prepositional use does not change the already-classified SCONJ target.",
				},
			),
		"grammar-de-sconj-dev-beside-cconj-denn": subordinatingConjunctionCase(
			"Wir blieben, denn es regnete, <TARGET>bis</TARGET> der Bus kam.",
			["bis"],
			"bis",
		),
		"grammar-de-sconj-accept-beside-adv-da": subordinatingConjunctionCase(
			"Da drüben wartete Mira, <TARGET>ob</TARGET> der Laden öffnete.",
			["ob"],
			"ob",
		),
		"grammar-de-sconj-accept-beside-part-ja": subordinatingConjunctionCase(
			"Es ging schneller, <TARGET>als</TARGET> er ja behauptet hatte.",
			["als"],
			"als",
			"Comp",
		),
		"grammar-de-sconj-accept-beside-correlating-cconj":
			subordinatingConjunctionCase(
				"Sowohl Lea als auch Tim kommen, <TARGET>wenn</TARGET> die Probe endet.",
				["wenn"],
				"wenn",
			),
		"grammar-de-sconj-accept-beside-abbreviation":
			subordinatingConjunctionCase(
				"Die Abk. blieb stehen, <TARGET>obwohl</TARGET> der Satz überarbeitet wurde.",
				["obwohl"],
				"obwohl",
				undefined,
				{
					explanation:
						"The codec has no abbreviation feature; an unmarked abbreviation does not alter the supplied conjunction.",
				},
			),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
