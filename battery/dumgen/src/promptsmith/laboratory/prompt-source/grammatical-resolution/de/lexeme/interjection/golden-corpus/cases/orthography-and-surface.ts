import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { interjectionCase } from "./builders";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-intj-demo-hmm-lengthened": interjectionCase(
				"Sie überlegte einen Moment: <TARGET>hmm</TARGET>.",
				["hmm"],
				"hm",
				null,
				{
					spelling: "Variant",
					explanation:
						"Expressive sound lengthening is a licensed Variant and remains Standard occurrence evidence.",
				},
			),
			"grammar-de-intj-demo-ha-ha-reduplication": interjectionCase(
				"Der Zauberer lachte <TARGET>ha</TARGET> <TARGET>ha</TARGET> und verbeugte sich.",
				["ha", "ha"],
				"ha",
				null,
				{
					spelling: "Variant",
					explanation:
						"The two authoritative members are one licensed reduplicated realization; preserve both members and use the base Lemma ha.",
				},
			),
			"grammar-de-intj-demo-typo-huraa": interjectionCase(
				"Im Stadion rief jemand <TARGET>huraa</TARGET>.",
				["huraa"],
				"hurra",
				null,
				{
					orthographies: ["Typo"],
					normalizedMembers: ["hurra"],
				},
			),
			"grammar-de-intj-demo-archaic-juchhei": interjectionCase(
				"In dem alten Festlied riefen sie <TARGET>juchhei</TARGET>.",
				["juchhei"],
				"juchhei",
				null,
				{ historicalStatus: "Archaic" },
			),

			"grammar-de-intj-dev-initial-ach": interjectionCase(
				"<TARGET>Ach</TARGET>, das ist wirklich schade.",
				["Ach"],
				"ach",
				null,
				{ normalizedMembers: ["ach"] },
			),
			"grammar-de-intj-dev-lengthened-boahhh": interjectionCase(
				"Beim Blick ins Tal rief er <TARGET>boahhh</TARGET>!",
				["boahhh"],
				"boah",
				null,
				{ spelling: "Variant" },
			),
			"grammar-de-intj-dev-reduplicated-he-he": interjectionCase(
				"Sie warnte ihn mit einem <TARGET>he</TARGET> <TARGET>he</TARGET> vor dem Schritt.",
				["he", "he"],
				"he",
				null,
				{ spelling: "Variant" },
			),
			"grammar-de-intj-dev-typo-pufi": interjectionCase(
				"Beim Anblick des Schmutzes sagte er <TARGET>pufi</TARGET>.",
				["pufi"],
				"pfui",
				null,
				{
					orthographies: ["Typo"],
					normalizedMembers: ["pfui"],
				},
			),
			"grammar-de-intj-dev-archaic-potz": interjectionCase(
				"In der alten Posse rief der Diener <TARGET>potz</TARGET>!",
				["potz"],
				"potz",
				null,
				{ historicalStatus: "Archaic" },
			),
			"grammar-de-intj-dev-acronym-omg": interjectionCase(
				"Im Chat schrieb sie nur <TARGET>OMG</TARGET> und legte das Handy weg.",
				["OMG"],
				"OMG",
				null,
				{
					explanation:
						"The exact INTJ codec has no abbreviation or foreign feature; preserve the acronymic identity rather than expanding it.",
				},
			),

			"grammar-de-intj-accept-v2-secondary-mann": interjectionCase(
				"Als der Schlüssel wieder klemmte, rief er <TARGET>Mann</TARGET>!",
				["Mann"],
				"Mann",
			),
			"grammar-de-intj-accept-v2-secondary-donnerwetter":
				interjectionCase(
					"Beim Anblick des Schadens rief sie <TARGET>Donnerwetter</TARGET>!",
					["Donnerwetter"],
					"Donnerwetter",
				),
			"grammar-de-intj-accept-v2-lengthened-aaach": interjectionCase(
				"Beim Blick auf die Rechnung stöhnte er <TARGET>aaach</TARGET>.",
				["aaach"],
				"ach",
				null,
				{ spelling: "Variant" },
			),
			"grammar-de-intj-accept-v2-reduplicated-igitt-igitt":
				interjectionCase(
					"Vor dem schmutzigen Becken rief sie <TARGET>igitt</TARGET> <TARGET>igitt</TARGET>!",
					["igitt", "igitt"],
					"igitt",
					null,
					{ spelling: "Variant" },
				),
			"grammar-de-intj-accept-v2-typo-halol": interjectionCase(
				"In der Nachricht begrüßte er sie mit <TARGET>halol</TARGET>.",
				["halol"],
				"hallo",
				null,
				{
					orthographies: ["Typo"],
					normalizedMembers: ["hallo"],
				},
			),
			"grammar-de-intj-accept-v2-acronym-lol": interjectionCase(
				"Auf die Pointe antwortete sie im Chat nur mit <TARGET>LOL</TARGET>.",
				["LOL"],
				"LOL",
			),
			"grammar-de-intj-accept-v2-lengthened-ohhh": interjectionCase(
				"Als die Überraschung enthüllt wurde, sagte er <TARGET>ohhh</TARGET>.",
				["ohhh"],
				"oh",
				null,
				{ spelling: "Variant" },
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
