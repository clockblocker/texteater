import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedFusion } from "./builders";

/**
 * Nearby-route spellings stay unmarked context. Target Classification and the
 * canonical input projection have already fixed the singleton Fusion member.
 */
export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-fusion-demo-am-near-route-controls": {
			...resolvedFusion({
				attested: "am",
				before: "Mia läuft am schnellsten und ihr Bruder wartet an dem Tor; später treffen beide sich ",
				after: " Bahnhof.",
			}),
			explanation:
				"The unmarked superlative am and separately written ADP/DET are context only; the supplied member is the classified Fusion.",
		},
		"grammar-de-fusion-demo-ins-near-idiom-and-dialect": {
			...resolvedFusion({
				attested: "ins",
				before: "Im Seminar wurden die Wendung „ins Gras beißen“ und die Dialektform „aufm“ besprochen; danach ging die Gruppe ",
				after: " Freie.",
			}),
			explanation:
				"The unmarked Idiom and dialectal contraction do not alter or enlarge the authoritative singleton Fusion member.",
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
