import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { subordinatingConjunctionCase } from "./builders";

export const resolvedCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-demo-finite-weil": subordinatingConjunctionCase(
			"Wir bleiben im Haus, <TARGET>weil</TARGET> es draußen regnet.",
			["weil"],
			"weil",
		),
		"grammar-de-sconj-demo-reduced-wie": subordinatingConjunctionCase(
			"Alles verlief, <TARGET>wie</TARGET> gestern besprochen.",
			["wie"],
			"wie",
			"Comp",
			{
				explanation:
					"The established reduced comparing clause remains SCONJ without an overt finite verb.",
			},
		),
		"grammar-de-sconj-demo-infinitival-um": subordinatingConjunctionCase(
			"Sie ging früher, <TARGET>um</TARGET> den Zug zu erreichen.",
			["um"],
			"um",
		),
		"grammar-de-sconj-demo-causal-da": subordinatingConjunctionCase(
			"Wir verschoben den Ausflug, <TARGET>da</TARGET> ein Sturm angekündigt war.",
			["da"],
			"da",
			undefined,
			{
				explanation:
					"The fixed SCONJ route makes this causal identity total despite the adverbial homograph.",
			},
		),

		"grammar-de-sconj-dev-complement-dass": subordinatingConjunctionCase(
			"Mara weiß, <TARGET>dass</TARGET> Ben morgen kommt.",
			["dass"],
			"dass",
		),
		"grammar-de-sconj-dev-conditional-wenn": subordinatingConjunctionCase(
			"Wir gehen los, <TARGET>wenn</TARGET> der Regen aufhört.",
			["wenn"],
			"wenn",
		),
		"grammar-de-sconj-dev-temporal-nachdem": subordinatingConjunctionCase(
			"<TARGET>Nachdem</TARGET> er gegessen hatte, räumte er den Tisch ab.",
			["Nachdem"],
			"nachdem",
			undefined,
			{ normalizedMembers: ["nachdem"] },
		),
		"grammar-de-sconj-dev-temporal-waehrend": subordinatingConjunctionCase(
			"Sie las, <TARGET>während</TARGET> er das Abendessen kochte.",
			["während"],
			"während",
		),
		"grammar-de-sconj-dev-interrogative-ob": subordinatingConjunctionCase(
			"Ich frage mich, <TARGET>ob</TARGET> die Bibliothek noch geöffnet ist.",
			["ob"],
			"ob",
		),
		"grammar-de-sconj-dev-temporal-bevor": subordinatingConjunctionCase(
			"Ruf mich an, <TARGET>bevor</TARGET> du zum Bahnhof fährst.",
			["bevor"],
			"bevor",
		),
		"grammar-de-sconj-dev-conditional-falls": subordinatingConjunctionCase(
			"Nimm eine Jacke mit, <TARGET>falls</TARGET> es abends kühl wird.",
			["falls"],
			"falls",
		),
		"grammar-de-sconj-dev-temporal-seitdem": subordinatingConjunctionCase(
			"Es ist ruhiger, <TARGET>seitdem</TARGET> die Baustelle geschlossen wurde.",
			["seitdem"],
			"seitdem",
		),
		"grammar-de-sconj-dev-temporal-sobald": subordinatingConjunctionCase(
			"Wir beginnen, <TARGET>sobald</TARGET> alle Gäste eingetroffen sind.",
			["sobald"],
			"sobald",
		),
		"grammar-de-sconj-dev-modal-indem": subordinatingConjunctionCase(
			"Sie half, <TARGET>indem</TARGET> sie die Messwerte sorgfältig prüfte.",
			["indem"],
			"indem",
		),
		"grammar-de-sconj-dev-causal-zumal": subordinatingConjunctionCase(
			"Wir blieben noch, <TARGET>zumal</TARGET> die Diskussion spannend war.",
			["zumal"],
			"zumal",
		),
		"grammar-de-sconj-dev-comparative-als-clause":
			subordinatingConjunctionCase(
				"Der Weg dauerte länger, <TARGET>als</TARGET> wir erwartet hatten.",
				["als"],
				"als",
				"Comp",
			),
		"grammar-de-sconj-dev-comparative-wie-clause":
			subordinatingConjunctionCase(
				"Die Maschine arbeitet so leise, <TARGET>wie</TARGET> der Hersteller versprochen hatte.",
				["wie"],
				"wie",
				"Comp",
			),
		"grammar-de-sconj-dev-temporal-als": subordinatingConjunctionCase(
			"<TARGET>Als</TARGET> der Bus endlich kam, warteten wir schon lange.",
			["Als"],
			"als",
			undefined,
			{ normalizedMembers: ["als"] },
		),
		"grammar-de-sconj-dev-adversative-wohingegen":
			subordinatingConjunctionCase(
				"Lena fährt gern Rad, <TARGET>wohingegen</TARGET> Tom lieber wandert.",
				["wohingegen"],
				"wohingegen",
			),
		"grammar-de-sconj-dev-concessive-obgleich":
			subordinatingConjunctionCase(
				"Er setzte die Reise fort, <TARGET>obgleich</TARGET> das Wetter schlechter wurde.",
				["obgleich"],
				"obgleich",
			),
		"grammar-de-sconj-dev-conditional-sofern": subordinatingConjunctionCase(
			"Die Sitzung findet statt, <TARGET>sofern</TARGET> genug Mitglieder kommen.",
			["sofern"],
			"sofern",
		),
		"grammar-de-sconj-dev-temporal-bis": subordinatingConjunctionCase(
			"Wir warteten, <TARGET>bis</TARGET> das Licht wieder anging.",
			["bis"],
			"bis",
		),

		"grammar-de-sconj-accept-concessive-obwohl":
			subordinatingConjunctionCase(
				"Sie ging spazieren, <TARGET>obwohl</TARGET> ein kalter Wind wehte.",
				["obwohl"],
				"obwohl",
			),
		"grammar-de-sconj-accept-purpose-damit": subordinatingConjunctionCase(
			"Er sprach langsam, <TARGET>damit</TARGET> alle ihn verstehen konnten.",
			["damit"],
			"damit",
		),
		"grammar-de-sconj-accept-temporal-ehe": subordinatingConjunctionCase(
			"Prüfe die Adresse, <TARGET>ehe</TARGET> du den Brief abschickst.",
			["ehe"],
			"ehe",
		),
		"grammar-de-sconj-accept-concessive-wenngleich":
			subordinatingConjunctionCase(
				"Der Plan ist möglich, <TARGET>wenngleich</TARGET> er teuer werden dürfte.",
				["wenngleich"],
				"wenngleich",
			),
		"grammar-de-sconj-accept-concessive-obschon":
			subordinatingConjunctionCase(
				"Sie lächelte, <TARGET>obschon</TARGET> sie sehr müde war.",
				["obschon"],
				"obschon",
			),
		"grammar-de-sconj-accept-consecutive-sodass":
			subordinatingConjunctionCase(
				"Es schneite stark, <TARGET>sodass</TARGET> die Straße gesperrt wurde.",
				["sodass"],
				"sodass",
			),
		"grammar-de-sconj-accept-proportional-je": subordinatingConjunctionCase(
			"<TARGET>Je</TARGET> länger wir warteten, desto unruhiger wurden die Kinder.",
			["Je"],
			"je",
			"Comp",
			{ normalizedMembers: ["je"] },
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
