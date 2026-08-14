import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-num-dev-route-adj-drei": citationCase(
			"Nach dem zweiten Versuch gelang schließlich Versuch Nummer <TARGET>drei</TARGET>.",
			["drei"],
			"drei",
			undefined,
			{
				explanation:
					"The unmarked zweiten is an ordinal ADJ, but the classified cardinal label drei remains NUM.",
			},
		),
		"grammar-de-num-dev-route-det-zwei": citationCase(
			"Von beiden Gruppen kamen jeweils <TARGET>zwei</TARGET> Personen zur Probe.",
			["zwei"],
			"zwei",
			undefined,
			{
				explanation:
					"The unmarked beiden is DET; the supplied cardinal target is independently NUM.",
			},
		),
		"grammar-de-num-dev-route-pron-drei": citationCase(
			"Von den zwölf Bewerbern kamen <TARGET>drei</TARGET> später an.",
			["drei"],
			"drei",
			undefined,
			{
				explanation:
					"A standalone cardinal can head this phrase without becoming PRON; the route is fixed upstream.",
			},
		),
		"grammar-de-num-dev-route-noun-eins": citationCase(
			"Die Anzeige sprang von der Null auf <TARGET>eins</TARGET>.",
			["eins"],
			"eins",
			undefined,
			{
				explanation:
					"The unmarked nominalized Null contrasts with the classified numeric value eins; do not copy the NOUN route.",
			},
		),
		"grammar-de-num-dev-route-symbol-7": citationCase(
			"Die Gleichung lautet drei plus vier gleich <TARGET>7</TARGET>.",
			["7"],
			"7",
			undefined,
			{
				explanation:
					"Mathematical context does not turn the classified digit into SYM; only the numeric target is resolved.",
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
