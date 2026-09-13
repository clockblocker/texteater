import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedFusion } from "./builders";

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-fusion-demo-im-initial": {
			...resolvedFusion({
				attested: "Im",
				after: " Garten blühen bereits die ersten Rosen.",
			}),
			explanation:
				"Ordinary sentence-initial capitalization is Standard and normalizes to im.",
		},
		"grammar-de-fusion-demo-zur-noun-control": {
			...resolvedFusion({
				attested: "zur",
				before: "Nach dem Frühstück gingen die Kinder ",
				after: " Schule.",
			}),
			explanation:
				"The following noun is unmarked context and is not absorbed into the singleton Fusion.",
		},
		"grammar-de-fusion-demo-zum-typo": {
			...resolvedFusion({
				attested: "zun",
				before: "Auf dem fehlerhaften Wegweiser zeigte der Pfeil ",
				after: " Bahnhof.",
				normalized: "zum",
				canonical: "zum",
				typo: true,
			}),
			explanation:
				"The nonword zun is an evident local typo for the contextually selected Fusion zum.",
		},
		"grammar-de-fusion-demo-fuers-historical-variant": {
			...resolvedFusion({
				attested: "für's",
				before: "In der Druckausgabe von 1908 stand an dieser Stelle ",
				after: " Vaterland.",
				normalized: "für's",
				canonical: "fürs",
				spelling: "Variant",
			}),
			explanation:
				"The historical apostrophe spelling is Standard as attested, maps to current fürs, and does not make the Fusion use archaic.",
		},
		"grammar-de-fusion-dev-am-bahnhof": {
			...resolvedFusion({
				attested: "am",
				before: "Wir treffen uns morgen ",
				after: " Bahnhof neben dem Kiosk.",
			}),
		},
		"grammar-de-fusion-dev-beim-umzug": {
			...resolvedFusion({
				attested: "beim",
				before: "Die Nachbarn halfen uns ",
				after: " Umzug in den dritten Stock.",
			}),
		},
		"grammar-de-fusion-dev-vom-arzt": {
			...resolvedFusion({
				attested: "vom",
				before: "Der unterschriebene Brief kam direkt ",
				after: " Arzt.",
			}),
		},
		"grammar-de-fusion-dev-ins-haus": {
			...resolvedFusion({
				attested: "ins",
				before: "Nachmittags spielten die Kinder in dem Hof; wegen des starken Regens liefen dann alle schnell ",
				after: " Haus.",
			}),
		},
		"grammar-de-fusion-dev-ans-meer": {
			...resolvedFusion({
				attested: "ans",
				before: "In den Sommerferien fährt die Familie ",
				after: " Meer.",
			}),
		},
		"grammar-de-fusion-dev-aufs-dach": {
			...resolvedFusion({
				attested: "aufs",
				before: "Die junge Katze sprang vorsichtig ",
				after: " Dach.",
			}),
		},
		"grammar-de-fusion-dev-fuers-essen": {
			...resolvedFusion({
				attested: "fürs",
				before: "Den größten Teil des Budgets brauchten sie ",
				after: " Essen.",
			}),
		},
		"grammar-de-fusion-dev-ums-haus": {
			...resolvedFusion({
				attested: "ums",
				before: "Der schmale Fußweg führt einmal ",
				after: " Haus.",
			}),
		},
		"grammar-de-fusion-dev-durchs-tor": {
			...resolvedFusion({
				attested: "durchs",
				before: "Nach dem Signal gingen die Besucher ",
				after: " Tor.",
			}),
		},
		"grammar-de-fusion-dev-uebers-wetter": {
			...resolvedFusion({
				attested: "übers",
				before: "Beim Kaffee sprachen die Gäste lange ",
				after: " Wetter.",
			}),
		},
		"grammar-de-fusion-dev-zum-behufe-archaic-context": {
			...resolvedFusion({
				attested: "zum",
				before: "In der historisch markierten Wendung ging es ",
				after: " Behufe der Prüfung um alte Amtssprache.",
			}),
			explanation:
				"The archaic unmarked complement does not make the still-current fused form zum an archaic grammatical use.",
		},
		"grammar-de-fusion-dev-hinterm-schrank": {
			...resolvedFusion({
				attested: "hinterm",
				before: "Der verlorene Schlüssel lag ",
				after: " Schrank.",
			}),
		},
		"grammar-de-fusion-dev-vorm-haus": {
			...resolvedFusion({
				attested: "vorm",
				before: "Das Taxi wartete bereits ",
				after: " Haus.",
			}),
		},
		"grammar-de-fusion-dev-unterm-tisch": {
			...resolvedFusion({
				attested: "unterm",
				before: "Der Hund schlief ruhig ",
				after: " Tisch.",
			}),
		},
		"grammar-de-fusion-dev-beim-initial": {
			...resolvedFusion({
				attested: "Beim",
				after: " Lesen vergaß sie völlig die Zeit.",
			}),
		},
		"grammar-de-fusion-dev-beimm-typo": {
			...resolvedFusion({
				attested: "beimm",
				before: "In der Nachricht bat er um Hilfe ",
				after: " Umzug.",
				normalized: "beim",
				canonical: "beim",
				typo: true,
			}),
			explanation:
				"The repeated final consonant is an evident local typo, repaired only within the classified member.",
		},
		"grammar-de-fusion-dev-ins-historical-variant": {
			...resolvedFusion({
				attested: "in's",
				before: "In der alten Erzählung ging der Wanderer ",
				after: " Dorf zurück.",
				normalized: "in's",
				canonical: "ins",
				spelling: "Variant",
			}),
		},
		"grammar-de-fusion-dev-zur-anmeldung": {
			...resolvedFusion({
				attested: "zur",
				before: "Die erforderlichen Unterlagen gehören ",
				after: " Anmeldung.",
			}),
		},
		"grammar-de-fusion-accept-im-garten": {
			...resolvedFusion({
				attested: "im",
				before: "Im Haus wird das Essen vorbereitet, doch die Geburtstagsfeier findet ",
				after: " Garten statt.",
			}),
			explanation:
				"Only the second im is marked; the earlier identical occurrence stays context and does not create another member.",
		},
		"grammar-de-fusion-accept-zur-schule": {
			...resolvedFusion({
				attested: "zur",
				before: "Der neue Radweg führt direkt ",
				after: " Schule.",
			}),
		},
		"grammar-de-fusion-accept-zum-markt": {
			...resolvedFusion({
				attested: "zum",
				before: "Am Samstag gehen wir gemeinsam ",
				after: " Markt.",
			}),
		},
		"grammar-de-fusion-accept-am-see": {
			...resolvedFusion({
				attested: "am",
				before: "Das kleine Ferienhaus liegt direkt ",
				after: " See.",
			}),
		},
		"grammar-de-fusion-accept-beim-lesen": {
			...resolvedFusion({
				attested: "beim",
				before: "Die neue Lampe hilft ihr ",
				after: " Lesen.",
			}),
		},
		"grammar-de-fusion-accept-vom-bahnhof": {
			...resolvedFusion({
				attested: "vom",
				before: "Der Shuttle fährt stündlich ",
				after: " Bahnhof zum Hotel.",
			}),
		},
		"grammar-de-fusion-accept-ans-ufer": {
			...resolvedFusion({
				attested: "ans",
				before: "Nach einer Stunde ruderten sie zurück ",
				after: " Ufer.",
			}),
		},
		"grammar-de-fusion-accept-aufs-land": {
			...resolvedFusion({
				attested: "aufs",
				before: "Nach dem Studium zog das Paar ",
				after: " Land.",
			}),
		},
		"grammar-de-fusion-accept-durchs-fenster": {
			...resolvedFusion({
				attested: "durchs",
				before: "Am Morgen fiel warmes Licht ",
				after: " Fenster.",
			}),
		},
		"grammar-de-fusion-accept-uebers-meer": {
			...resolvedFusion({
				attested: "übers",
				before: "Am Abend blickten die Gäste weit ",
				after: " Meer.",
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
