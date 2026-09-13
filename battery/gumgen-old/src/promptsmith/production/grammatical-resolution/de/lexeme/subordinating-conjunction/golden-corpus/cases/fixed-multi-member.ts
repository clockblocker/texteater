import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { subordinatingConjunctionCase } from "./builders";

export const fixedMultiMemberCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-sconj-demo-anstatt-zu": subordinatingConjunctionCase(
				"Mara telefonierte, <TARGET>anstatt</TARGET> den Bericht sorgfältig <TARGET>zu</TARGET> schreiben.",
				["anstatt", "zu"],
				"anstatt zu",
			),
			"grammar-de-sconj-demo-discontinuous-so-dass":
				subordinatingConjunctionCase(
					"Im alten Druck stand: Er sprach <TARGET>so</TARGET> leise, <TARGET>daß</TARGET> ihn niemand verstand.",
					["so", "daß"],
					"so … dass",
					undefined,
					{
						spelling: "Variant",
						explanation:
							"The historical daß spelling is licensed; both discontinuous SCONJ anchors remain ordered members.",
					},
				),

			"grammar-de-sconj-dev-um-zu": subordinatingConjunctionCase(
				"Noah spart, <TARGET>um</TARGET> im Sommer verreisen <TARGET>zu</TARGET> können.",
				["um", "zu"],
				"um zu",
			),
			"grammar-de-sconj-dev-ohne-zu": subordinatingConjunctionCase(
				"Er ging, <TARGET>ohne</TARGET> sich <TARGET>zu</TARGET> verabschieden.",
				["ohne", "zu"],
				"ohne zu",
			),
			"grammar-de-sconj-dev-statt-zu": subordinatingConjunctionCase(
				"Lina schwieg, <TARGET>statt</TARGET> offen <TARGET>zu</TARGET> widersprechen.",
				["statt", "zu"],
				"statt zu",
				undefined,
				{
					explanation:
						"statt zu is a lexical identity of its own, not a spelling variant of anstatt zu.",
				},
			),
			"grammar-de-sconj-dev-repeated-um-zu-context":
				subordinatingConjunctionCase(
					"Um das Haus blieb es zu laut, <TARGET>um</TARGET> dort ruhig schlafen <TARGET>zu</TARGET> können.",
					["um", "zu"],
					"um zu",
					undefined,
					{
						explanation:
							"Earlier um and zu are unmarked context; only the later supplied anchors belong to this Lexeme.",
					},
				),

			"grammar-de-sconj-accept-um-zu": subordinatingConjunctionCase(
				"Tarek öffnete das Fenster, <TARGET>um</TARGET> frische Luft hereinzulassen <TARGET>zu</TARGET> können.",
				["um", "zu"],
				"um zu",
			),
			"grammar-de-sconj-accept-ohne-zu": subordinatingConjunctionCase(
				"Nora löste die Aufgabe, <TARGET>ohne</TARGET> jemanden um Hilfe <TARGET>zu</TARGET> bitten.",
				["ohne", "zu"],
				"ohne zu",
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
