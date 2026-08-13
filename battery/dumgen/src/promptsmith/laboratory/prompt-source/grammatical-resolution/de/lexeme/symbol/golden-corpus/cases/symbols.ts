import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, inflectionCase } from "./builders";

const foreignCore = { foreign: "Yes", numType: null } as const;
const cardinalCore = { foreign: null, numType: "Card" } as const;
const rangeCore = { foreign: null, numType: "Range" } as const;

export const symbolCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sym-demo-percent-unit": citationCase(
			"Die Anzeige zeigt 80 <TARGET>%</TARGET> Ladezustand.",
			["%"],
			"%",
			{
				explanation:
					"The neighboring number is not a member and does not make the percent sign a NUM Lemma.",
			},
		),
		"grammar-de-sym-demo-times-nominal": inflectionCase(
			"Ein einziges <TARGET>×</TARGET> steht zwischen den Zahlen.",
			["×"],
			"×",
			{ case: "Nom", gender: "Neut", number: "Sing" },
			{
				explanation:
					"Explicit nominal agreement licenses Inflection even though the glyph itself is invariant.",
			},
		),
		"grammar-de-sym-demo-euro-currency": citationCase(
			"Der Eintritt kostet zwölf <TARGET>€</TARGET>.",
			["€"],
			"€",
		),
		"grammar-de-sym-demo-section-dative": inflectionCase(
			"Mit dem <TARGET>§</TARGET> verweist sie auf die einschlägige Vorschrift.",
			["§"],
			"§",
			{ case: "Dat", gender: "Masc", number: "Sing" },
		),
		"grammar-de-sym-demo-equals-genitive": inflectionCase(
			"Die Form des <TARGET>=</TARGET> ist in dieser Schrift besonders breit.",
			["="],
			"=",
			{ case: "Gen", gender: "Neut", number: "Sing" },
		),
		"grammar-de-sym-demo-feminine-hash": inflectionCase(
			"Die Lektorin nennt die <TARGET>#</TARGET> eine Raute.",
			["#"],
			"#",
			{ case: "Acc", gender: "Fem", number: "Sing" },
			{
				explanation:
					"The feminine article directly governs the symbol itself, so the occurrence is Inflection rather than a Citation mention.",
			},
		),
		"grammar-de-sym-demo-foreign-arabic-percent": citationCase(
			"In der arabischen Quellenzeile folgt auf die Zahl das Zeichen <TARGET>٪</TARGET>.",
			["٪"],
			"٪",
			{ coreFeatures: foreignCore },
		),
		"grammar-de-sym-demo-card-number-sign": citationCase(
			"In der Inventarliste kennzeichnet <TARGET>№</TARGET> die folgende Kardinalnummer.",
			["№"],
			"№",
			{ coreFeatures: cardinalCore },
		),
		"grammar-de-sym-demo-range-dash": citationCase(
			"In der tabellarischen Angabe 10<TARGET>–</TARGET>12 bezeichnet der Strich einen Wertebereich.",
			["–"],
			"–",
			{
				coreFeatures: rangeCore,
				explanation:
					"Upstream already classified this numeric-range glyph as SYM rather than sentence PUNCT.",
			},
		),
		"grammar-de-sym-demo-variant-fullwidth-plus": citationCase(
			"Die Unicode-Tabelle nennt <TARGET>＋</TARGET> ausdrücklich als vollbreite Variante von +.",
			["＋"],
			"+",
			{ spelling: "Variant" },
		),
		"grammar-de-sym-demo-typo-ocr-euro": citationCase(
			"Im fehlerhaften OCR-Text steht <TARGET>Є</TARGET> statt des Eurozeichens €.",
			["Є"],
			"€",
			{
				normalizedMembers: ["€"],
				orthographies: ["Typo"],
			},
		),
		"grammar-de-sym-demo-sections-plural": inflectionCase(
			"Die beiden <TARGET>§§</TARGET> verweisen auf getrennte Regelungen.",
			["§§"],
			"§",
			{ case: "Nom", gender: "Masc", number: "Plur" },
		),

		"grammar-de-sym-dev-math-plus": citationCase(
			"Die Rechnung lautet zwei <TARGET>+</TARGET> drei.",
			["+"],
			"+",
		),
		"grammar-de-sym-dev-math-minus": citationCase(
			"Auf der Tafel steht neun <TARGET>−</TARGET> vier.",
			["−"],
			"−",
		),
		"grammar-de-sym-dev-science-integral": citationCase(
			"Die Dozentin schreibt ein <TARGET>∫</TARGET> vor den Ausdruck.",
			["∫"],
			"∫",
		),
		"grammar-de-sym-dev-measurement-micro": citationCase(
			"Die Korngröße beträgt fünf <TARGET>µ</TARGET>m.",
			["µ"],
			"µ",
		),
		"grammar-de-sym-dev-measurement-degree": citationCase(
			"Am Nachmittag werden achtzehn <TARGET>°</TARGET> C gemessen.",
			["°"],
			"°",
		),
		"grammar-de-sym-dev-measurement-permille": citationCase(
			"Die Probe enthält zwei <TARGET>‰</TARGET> Salz.",
			["‰"],
			"‰",
		),
		"grammar-de-sym-dev-currency-dollar": citationCase(
			"Das Ersatzteil kostet dreißig <TARGET>$</TARGET>.",
			["$"],
			"$",
		),
		"grammar-de-sym-dev-currency-pound": citationCase(
			"Der Katalog nennt einen Preis von vierzig <TARGET>£</TARGET>.",
			["£"],
			"£",
		),
		"grammar-de-sym-dev-legal-copyright": citationCase(
			"Im Impressum steht vor dem Erscheinungsjahr ein <TARGET>©</TARGET>.",
			["©"],
			"©",
		),
		"grammar-de-sym-dev-coordinator-ampersand": citationCase(
			"Auf dem Schild steht Brot <TARGET>&</TARGET> Kuchen.",
			["&"],
			"&",
			{
				explanation:
					"The independent graphical coordinator is SYM; the neighboring ordinary words remain outside membership.",
			},
		),
		"grammar-de-sym-dev-marker-hash": citationCase(
			"Setze ein <TARGET>#</TARGET> vor das Stichwort.",
			["#"],
			"#",
		),
		"grammar-de-sym-dev-emoticon-wink": citationCase(
			"Sie beendet die Nachricht mit <TARGET>;-)</TARGET>.",
			[";-)"],
			";-)",
		),
		"grammar-de-sym-dev-repeated-plus-second": citationCase(
			"Links steht bereits +, rechts ergänzt sie ein zweites <TARGET>+</TARGET>.",
			["+"],
			"+",
			{
				explanation:
					"Only the supplied second occurrence belongs to this target; identical context material is not added.",
			},
		),
		"grammar-de-sym-dev-numeric-neighbor-percent": citationCase(
			"Die Statistik weist einen Anteil von 47 <TARGET>%</TARGET> aus.",
			["%"],
			"%",
		),
		"grammar-de-sym-dev-punctuation-neighbor-star": citationCase(
			"Vor dem abschließenden Komma steht ein <TARGET>*</TARGET>, das auf die Fußnote verweist.",
			["*"],
			"*",
		),
		"grammar-de-sym-dev-opaque-neighbor-hash": citationCase(
			"Vor dem nicht anklickbaren Emoji 😀 steht ein <TARGET>#</TARGET>.",
			["#"],
			"#",
		),
		"grammar-de-sym-dev-abbreviation-neighbor-section": citationCase(
			"Die Fundstelle lautet <TARGET>§</TARGET> 8 Abs. 2.",
			["§"],
			"§",
		),
		"grammar-de-sym-dev-inflection-acc-plus": inflectionCase(
			"Die Lehrerin markiert das <TARGET>+</TARGET> rot.",
			["+"],
			"+",
			{ case: "Acc", gender: "Neut", number: "Sing" },
		),
		"grammar-de-sym-dev-inflection-gen-percent": inflectionCase(
			"Die Form des <TARGET>%</TARGET> ist in dieser Schrift ungewöhnlich.",
			["%"],
			"%",
			{ case: "Gen", gender: "Neut", number: "Sing" },
		),
		"grammar-de-sym-dev-inflection-feminine-at": inflectionCase(
			"Die Designerin nennt die <TARGET>@</TARGET> eine Klammeraffe.",
			["@"],
			"@",
			{ case: "Acc", gender: "Fem", number: "Sing" },
		),
		"grammar-de-sym-dev-archaic-dagger": citationCase(
			"Die Legende führt <TARGET>†</TARGET> als historisches Todeszeichen auf.",
			["†"],
			"†",
			{ historicalStatus: "Archaic" },
		),

		"grammar-de-sym-accept-v2-division-inflection": inflectionCase(
			"Die Schülerin umkreist das <TARGET>÷</TARGET> mit roter Farbe.",
			["÷"],
			"÷",
			{ case: "Acc", gender: "Neut", number: "Sing" },
		),
		"grammar-de-sym-accept-v2-not-equal": citationCase(
			"Die Bedingung lautet x <TARGET>≠</TARGET> 5.",
			["≠"],
			"≠",
		),
		"grammar-de-sym-accept-v2-sum": citationCase(
			"In der Herleitung wird die Reihe mit <TARGET>∑</TARGET> notiert.",
			["∑"],
			"∑",
		),
		"grammar-de-sym-accept-v2-rupee": citationCase(
			"Auf der indischen Rechnung stehen achthundert <TARGET>₹</TARGET>.",
			["₹"],
			"₹",
		),
		"grammar-de-sym-accept-v2-registered": citationCase(
			"Die Verpackung trägt hinter dem Namen <TARGET>®</TARGET>.",
			["®"],
			"®",
		),
		"grammar-de-sym-accept-v2-double-arrow": citationCase(
			"Das Zustandsdiagramm zeigt A <TARGET>↔</TARGET> B.",
			["↔"],
			"↔",
		),
		"grammar-de-sym-accept-v2-basis-point": citationCase(
			"Die Abweichung beträgt drei <TARGET>‱</TARGET>.",
			["‱"],
			"‱",
		),
		"grammar-de-sym-accept-v2-card-numero": citationCase(
			"Im französischen Formular kennzeichnet <TARGET>nº</TARGET> ausdrücklich die folgende Kardinalnummer.",
			["nº"],
			"nº",
			{ coreFeatures: { foreign: "Yes", numType: "Card" } },
		),
		"grammar-de-sym-accept-v2-range-tilde": citationCase(
			"In der Zahlenangabe 20<TARGET>~</TARGET>30 dient die Tilde ausdrücklich als Bereichszeichen.",
			["~"],
			"~",
			{ coreFeatures: rangeCore },
		),
		"grammar-de-sym-accept-v2-foreign-japanese-reference": citationCase(
			"Im japanischen Original steht vor dem Hinweis das Zeichen <TARGET>※</TARGET>.",
			["※"],
			"※",
			{ coreFeatures: foreignCore },
		),
		"grammar-de-sym-accept-v2-variant-small-percent": citationCase(
			"Die Unicode-Liste erklärt <TARGET>﹪</TARGET> als kleine Variante von %.",
			["﹪"],
			"%",
			{ spelling: "Variant" },
		),
		"grammar-de-sym-accept-v2-typo-double-permille": citationCase(
			"Durch einen Tippfehler erscheint <TARGET>‰‰</TARGET> statt eines einzelnen Promillezeichens.",
			["‰‰"],
			"‰",
			{
				normalizedMembers: ["‰"],
				orthographies: ["Typo"],
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
