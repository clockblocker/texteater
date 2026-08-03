import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedFusion } from "./builders";

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-fusion-demo-im-initial": {
			...resolvedFusion({
				attested: "Im",
				after: " Garten blühen Rosen.",
			}),
			explanation:
				"Sentence-initial capitalization is Standard; the Citation Surface and Lemma normalize to im.",
			contaminationKeys: ["de-fusion:im"],
		},
		"grammar-de-fusion-demo-zur": {
			...resolvedFusion({
				attested: "zur",
				before: "Wir gehen ",
				after: " Schule.",
			}),
			contaminationKeys: ["de-fusion:zur"],
		},
		"grammar-de-fusion-demo-zum-typo": {
			...resolvedFusion({
				attested: "zun",
				before: "Sie läuft ",
				after: " Bahnhof.",
				normalized: "zum",
				canonical: "zum",
				typo: true,
			}),
			explanation:
				"The nonword zun is an evident local typo for the contextually licensed Fusion zum.",
			contaminationKeys: ["de-fusion:zum", "de-fusion-policy:typo"],
		},
		"grammar-de-fusion-am": {
			...resolvedFusion({
				attested: "am",
				before: "Wir warten ",
				after: " Bahnhof.",
			}),
			contaminationKeys: ["de-fusion:am"],
		},
		"grammar-de-fusion-beim-typo": {
			...resolvedFusion({
				attested: "beimm",
				before: "Er half ",
				after: " Umzug.",
				normalized: "beim",
				canonical: "beim",
				typo: true,
			}),
			explanation:
				"The repeated final consonant in beimm is an evident local typo for the contextually licensed Fusion beim.",
			contaminationKeys: [
				"de-fusion:beim",
				"de-fusion-policy:typo-repeated-final-consonant",
			],
		},
		"grammar-de-fusion-vom": {
			...resolvedFusion({
				attested: "vom",
				before: "Der Brief kommt ",
				after: " Arzt.",
			}),
			contaminationKeys: ["de-fusion:vom"],
		},
		"grammar-de-fusion-ins": {
			...resolvedFusion({
				attested: "ins",
				before: "Sie geht ",
				after: " Haus.",
			}),
			contaminationKeys: ["de-fusion:ins"],
		},
		"grammar-de-fusion-ans": {
			...resolvedFusion({
				attested: "ans",
				before: "Wir fahren ",
				after: " Meer.",
			}),
			contaminationKeys: ["de-fusion:ans"],
		},
		"grammar-de-fusion-aufs": {
			...resolvedFusion({
				attested: "aufs",
				before: "Die Katze springt ",
				after: " Dach.",
			}),
			contaminationKeys: ["de-fusion:aufs"],
		},
		"grammar-de-fusion-fuers": {
			...resolvedFusion({
				attested: "fürs",
				before: "Das Geld ist ",
				after: " Essen.",
			}),
			contaminationKeys: ["de-fusion:fuers"],
		},
		"grammar-de-fusion-ums": {
			...resolvedFusion({
				attested: "ums",
				before: "Sie läuft ",
				after: " Haus.",
			}),
			contaminationKeys: ["de-fusion:ums"],
		},
		"grammar-de-fusion-durchs": {
			...resolvedFusion({
				attested: "durchs",
				before: "Wir gehen ",
				after: " Tor.",
			}),
			contaminationKeys: ["de-fusion:durchs"],
		},
		"grammar-de-fusion-uebers": {
			...resolvedFusion({
				attested: "übers",
				before: "Sie spricht ",
				after: " Wetter.",
			}),
			contaminationKeys: ["de-fusion:uebers"],
		},
		"grammar-de-fusion-beim-initial": {
			...resolvedFusion({
				attested: "Beim",
				after: " Lesen vergaß sie die Zeit.",
			}),
			explanation:
				"Ordinary sentence-initial capitalization remains Standard and normalizes to beim.",
			contaminationKeys: ["de-fusion:beim"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
