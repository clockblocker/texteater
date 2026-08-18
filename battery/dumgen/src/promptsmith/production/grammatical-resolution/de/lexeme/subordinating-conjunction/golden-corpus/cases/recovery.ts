import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { subordinatingConjunctionCase } from "./builders";

export const recoveryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-accept-v2-finite-obwohl":
			subordinatingConjunctionCase(
				"Die Fähre legte ab, <TARGET>obwohl</TARGET> dichter Nebel aufzog.",
				["obwohl"],
				"obwohl",
			),
		"grammar-de-sconj-accept-v2-purpose-damit":
			subordinatingConjunctionCase(
				"Nora beschriftete die Kisten, <TARGET>damit</TARGET> niemand sie verwechselte.",
				["damit"],
				"damit",
			),
		"grammar-de-sconj-accept-v2-conditional-wenn":
			subordinatingConjunctionCase(
				"Die Lampe blinkt, <TARGET>wenn</TARGET> der Akku fast leer ist.",
				["wenn"],
				"wenn",
			),
		"grammar-de-sconj-accept-v2-interrogative-ob":
			subordinatingConjunctionCase(
				"Der Techniker prüfte, <TARGET>ob</TARGET> das Kabel richtig saß.",
				["ob"],
				"ob",
			),
		"grammar-de-sconj-accept-v2-infinitival-ohne":
			subordinatingConjunctionCase(
				"Mina verließ den Raum, <TARGET>ohne</TARGET> sich zu verabschieden.",
				["ohne"],
				"ohne",
			),
		"grammar-de-sconj-accept-v2-comparative-als":
			subordinatingConjunctionCase(
				"Die Reparatur dauerte kürzer, <TARGET>als</TARGET> der Meister vorausgesagt hatte.",
				["als"],
				"als",
				"Comp",
			),
		"grammar-de-sconj-accept-v2-reduced-wie": subordinatingConjunctionCase(
			"Der Vertrag gilt, <TARGET>wie</TARGET> schriftlich vereinbart.",
			["wie"],
			"wie",
			"Comp",
		),
		"grammar-de-sconj-accept-v2-multiword-als-wenn":
			subordinatingConjunctionCase(
				"Sie sah mich an, <TARGET>als</TARGET> <TARGET>wenn</TARGET> sie eine Erklärung erwartete.",
				["als", "wenn"],
				"als wenn",
				"Comp",
			),
		"grammar-de-sconj-accept-v2-initial-falls":
			subordinatingConjunctionCase(
				"<TARGET>Falls</TARGET> die Lieferung heute eintrifft, rufen wir sofort an.",
				["Falls"],
				"falls",
				undefined,
				{ normalizedMembers: ["falls"] },
			),
		"grammar-de-sconj-accept-v2-typo-obwhol": subordinatingConjunctionCase(
			"Der Hund blieb ruhig, <TARGET>obwhol</TARGET> es an der Tür klingelte.",
			["obwhol"],
			"obwohl",
			undefined,
			{
				normalizedMembers: ["obwohl"],
				orthographies: ["Typo"],
			},
		),
		"grammar-de-sconj-accept-v2-archaic-dieweil":
			subordinatingConjunctionCase(
				"Der Schreiber verweilte, <TARGET>dieweil</TARGET> der Bote noch ausstand.",
				["dieweil"],
				"dieweil",
				undefined,
				{ historicalStatus: "Archaic" },
			),
		"grammar-de-sconj-accept-v2-variant-so-dass":
			subordinatingConjunctionCase(
				"Im alten Druck war die Zeile verrutscht, <TARGET>so</TARGET> <TARGET>daß</TARGET> ein Wort fehlte.",
				["so", "daß"],
				"so dass",
				undefined,
				{
					historicalStatus: "Archaic",
					spelling: "Variant",
				},
			),
		"grammar-de-sconj-accept-v2-beside-adv-da":
			subordinatingConjunctionCase(
				"Da vorne steht der Wagen, <TARGET>weil</TARGET> die Einfahrt gesperrt ist.",
				["weil"],
				"weil",
			),
		"grammar-de-sconj-accept-v2-beside-part-ja":
			subordinatingConjunctionCase(
				"Die Messung war genauer, <TARGET>als</TARGET> wir ja gehofft hatten.",
				["als"],
				"als",
				"Comp",
			),
		"grammar-de-sconj-accept-v2-beside-correlative-and-abbreviation":
			subordinatingConjunctionCase(
				"Weder die Abk. noch die Fußnote wird geändert, <TARGET>bevor</TARGET> die Redaktion zustimmt.",
				["bevor"],
				"bevor",
				undefined,
				{
					explanation:
						"An unmarked correlating CCONJ and abbreviation remain outside the authoritative SCONJ target; the codec has no abbreviation feature.",
				},
			),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
