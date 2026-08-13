import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { adpositionCase, ordinaryAdpositionCore } from "./builders";

export const coreFeatureCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adp-demo-prep-mit-dat": adpositionCase(
			"Sie fährt <TARGET>mit</TARGET> dem Bus zur Arbeit.",
			["mit"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Dat",
				}),
				explanation:
					"Contextual ADP stays Citation; stable dative government belongs to Lemma.",
			},
		),
		"grammar-de-adp-demo-two-way-auf": adpositionCase(
			"Das Buch liegt <TARGET>auf</TARGET> dem Tisch.",
			["auf"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: null,
				}),
				explanation:
					"Local dative does not become stable government for two-way auf.",
			},
		),
		"grammar-de-adp-demo-post-entlang-acc": adpositionCase(
			"Wir liefen den Fluss <TARGET>entlang</TARGET> bis zur Brücke.",
			["entlang"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Post",
					governedCase: "Acc",
				}),
				explanation:
					"Following its accusative complement establishes postpositional entlang.",
			},
		),
		"grammar-de-adp-demo-circ-von-an": adpositionCase(
			"<TARGET>Von</TARGET> diesem Tag <TARGET>an</TARGET> führte sie das Protokoll.",
			["Von", "an"],
			{
				normalizedMembers: ["von", "an"],
				canonicalForm: "von ... an",
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Circ",
					governedCase: "Dat",
				}),
				explanation:
					"Two supplied members enclose one dative complement and remain positionally aligned.",
			},
		),
		"grammar-de-adp-dev-prep-durch-acc": adpositionCase(
			"Wir gehen <TARGET>durch</TARGET> den Park nach Hause.",
			["durch"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Acc",
				}),
			},
		),
		"grammar-de-adp-dev-prep-zu-dat": adpositionCase(
			"Sie geht <TARGET>zu</TARGET> ihrer Ärztin.",
			["zu"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-dev-two-way-vor-acc": adpositionCase(
			"Er stellt die Kiste <TARGET>vor</TARGET> die Tür.",
			["vor"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: null,
				}),
			},
		),
		"grammar-de-adp-dev-post-zuliebe-dat": adpositionCase(
			"Den Kindern <TARGET>zuliebe</TARGET> blieb sie noch eine Stunde.",
			["zuliebe"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Post",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-dev-prep-seit-dat": adpositionCase(
			"Sie wohnt <TARGET>seit</TARGET> einem Jahr in Bonn.",
			["seit"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-dev-wegen-local-dat-lexical-gen": adpositionCase(
			"Wir blieben <TARGET>wegen</TARGET> dem Regen zu Hause.",
			["wegen"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Gen",
				}),
				explanation:
					"Colloquial local dative does not erase canonical genitive government.",
			},
		),
		"grammar-de-adp-dev-circ-um-willen": adpositionCase(
			"<TARGET>Um</TARGET> des Friedens <TARGET>willen</TARGET> schwiegen beide Seiten.",
			["Um", "willen"],
			{
				normalizedMembers: ["um", "willen"],
				canonicalForm: "um ... willen",
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Circ",
					governedCase: "Gen",
				}),
			},
		),
		"grammar-de-adp-dev-circ-an-vorbei": adpositionCase(
			"Der Radweg führt <TARGET>an</TARGET> der Schule <TARGET>vorbei</TARGET>.",
			["an", "vorbei"],
			{
				canonicalForm: "an ... vorbei",
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Circ",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-dev-post-gegenueber-dat": adpositionCase(
			"Dem Bahnhof <TARGET>gegenüber</TARGET> öffnete ein Café.",
			["gegenüber"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Post",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-dev-extpos-sconj-anstatt": adpositionCase(
			"<TARGET>Anstatt</TARGET> dass er klagte, half er sofort.",
			["Anstatt"],
			{
				normalizedMembers: ["anstatt"],
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					extPos: "SCONJ",
					governedCase: null,
				}),
				explanation:
					"Fixed ADP route keeps lexical identity while clause use supplies ExtPos SCONJ.",
			},
		),
		"grammar-de-adp-dev-foreign-versus-acc": adpositionCase(
			"Im Finale spielt Köln <TARGET>versus</TARGET> Berlin.",
			["versus"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					foreign: "Yes",
					governedCase: "Acc",
				}),
			},
		),
		"grammar-de-adp-dev-prep-entlang-gen": adpositionCase(
			"<TARGET>Entlang</TARGET> des Kanals stehen alte Pappeln.",
			["Entlang"],
			{
				normalizedMembers: ["entlang"],
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Gen",
				}),
				explanation:
					"Complement position and genitive fix the prepositional entlang reading.",
			},
		),
		"grammar-de-adp-dev-adp-before-unmarked-particle": adpositionCase(
			"Sie blickt <TARGET>auf</TARGET> die Uhr und steht danach auf.",
			["auf"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: null,
				}),
				explanation:
					"Marked auf governs a noun; later unmarked auf belongs to the verb.",
			},
		),
		"grammar-de-adp-dev-adp-beside-governed-verb-member": adpositionCase(
			"Sie wartet auf den Bus, geht aber <TARGET>ohne</TARGET> Schirm los.",
			["ohne"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Acc",
				}),
				explanation:
					"Only supplied ohne resolves here; unmarked auf belongs to warten.",
			},
		),
		"grammar-de-adp-dev-adp-beside-fusion": adpositionCase(
			"Im Regal liegt das Buch <TARGET>auf</TARGET> dem mittleren Brett.",
			["auf"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: null,
				}),
				explanation:
					"Unmarked im is a Fusion and does not change the supplied ADP target.",
			},
		),
		"grammar-de-adp-dev-adp-beside-sconj": adpositionCase(
			"Obwohl es regnet, bleiben wir <TARGET>wegen</TARGET> des Windes drinnen.",
			["wegen"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Gen",
				}),
			},
		),
		"grammar-de-adp-accept-prep-fuer-acc": adpositionCase(
			"Sie backt einen Kuchen <TARGET>für</TARGET> ihre Nachbarin.",
			["für"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Acc",
				}),
			},
		),
		"grammar-de-adp-accept-prep-aus-dat": adpositionCase(
			"Der Tisch besteht <TARGET>aus</TARGET> massivem Holz.",
			["aus"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-accept-prep-waehrend-gen": adpositionCase(
			"<TARGET>Während</TARGET> des Konzerts blieb ihr Handy aus.",
			["Während"],
			{
				normalizedMembers: ["während"],
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Gen",
				}),
			},
		),
		"grammar-de-adp-accept-two-way-zwischen-dat": adpositionCase(
			"Der Schlüssel liegt <TARGET>zwischen</TARGET> den Büchern.",
			["zwischen"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: null,
				}),
			},
		),
		"grammar-de-adp-accept-post-wegen-gen": adpositionCase(
			"Des dichten Nebels <TARGET>wegen</TARGET> fiel der Flug aus.",
			["wegen"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Post",
					governedCase: "Gen",
				}),
			},
		),
		"grammar-de-adp-accept-circ-von-aus": adpositionCase(
			"<TARGET>Von</TARGET> der Terrasse <TARGET>aus</TARGET> sieht man den See.",
			["Von", "aus"],
			{
				normalizedMembers: ["von", "aus"],
				canonicalForm: "von ... aus",
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Circ",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-accept-circ-ueber-hinaus": adpositionCase(
			"Die Wirkung reicht <TARGET>über</TARGET> das Jahr <TARGET>hinaus</TARGET>.",
			["über", "hinaus"],
			{
				canonicalForm: "über ... hinaus",
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Circ",
					governedCase: "Acc",
				}),
			},
		),
		"grammar-de-adp-accept-post-gemaess-dat": adpositionCase(
			"Den Regeln <TARGET>gemäß</TARGET> beginnt die Sitzung pünktlich.",
			["gemäß"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Post",
					governedCase: "Dat",
				}),
			},
		),
		"grammar-de-adp-accept-alternating-dank": adpositionCase(
			"<TARGET>Dank</TARGET> des schnellen Einsatzes blieb niemand verletzt.",
			["Dank"],
			{
				normalizedMembers: ["dank"],
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: null,
				}),
				explanation:
					"Dative and genitive are both licensed, so scalar governedCase stays null.",
			},
		),
		"grammar-de-adp-accept-prep-bis-acc": adpositionCase(
			"Die Sperrung gilt <TARGET>bis</TARGET> nächsten Montag.",
			["bis"],
			{
				coreFeatures: ordinaryAdpositionCore({
					adpType: "Prep",
					governedCase: "Acc",
				}),
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
