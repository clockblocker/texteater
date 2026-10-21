import type * as Dumling from "dumling/types";

import { CASES } from "./articles.js";

type Panel = Dumling.TablePanel;
type Axis = readonly Dumling.AxisEntry[];

const axis = (...bundles: Dumling.FeatureBundle[]): Axis =>
	bundles.map((bundle) => ({ bundle }));
const whole = axis({});

const caseRows = axis(...CASES.map((name) => ({ case: name })));

/** The person rows of a finite panel, in the order a German table lists them: ich, du, er, wir, ihr, sie. */
export const PERSON_ROWS = axis(
	...(["Sing", "Plur"] as const).flatMap((number) =>
		(["1", "2", "3"] as const).map((person) => ({ person, number })),
	),
);

/**
 * The German NOUN declension (system ADR 0049): case rows by number
 * columns. Gender is no key feature, since a noun's gender is Core.
 */
const nounSchema: Dumling.TableSchema = {
	id: "de/Lexeme/NOUN",
	version: 1,
	keyFeatures: ["case", "number"],
	panels: [
		{
			id: "declension",
			core: true,
			fixed: {},
			rows: caseRows,
			columns: axis({ number: "Sing" }, { number: "Plur" }),
		},
	],
};

/**
 * The verbal key features: a cell is matched on the whole verbal bundle, so
 * a periphrasis (`hat gefahren`, `wurde geschlossen`) or an expletive
 * Surface (`es gibt`) fits no simple cell and goes to the list.
 */
const verbKeys = [
	"verbForm",
	"mood",
	"tense",
	"person",
	"number",
	"participleForm",
	"voice",
	"passive",
	"perfect",
	"future",
	"expletive",
];

const finite = (id: string, core: boolean, fixed: Dumling.FeatureBundle) => ({
	id,
	core,
	fixed: { verbForm: "Fin", ...fixed },
	rows: PERSON_ROWS,
	columns: whole,
});

/**
 * The German verbal panels. Core: Präsens and Präteritum by person,
 * Konjunktiv II and Partizip II, the panels the dictionary notes show.
 * Konjunktiv I and Imperativ stay in the schema, so a met form there is
 * placed exactly, but are never drawn.
 */
const verbalPanels: readonly Panel[] = [
	finite("present", true, { mood: "Ind", tense: "Pres" }),
	finite("preterite", true, { mood: "Ind", tense: "Past" }),
	finite("subjunctive2", true, { mood: "Sub", tense: "Past" }),
	{
		id: "participle",
		core: true,
		fixed: { verbForm: "Part" },
		rows: axis({ participleForm: "Past" }),
		columns: whole,
	},
	finite("subjunctive1", false, { mood: "Sub", tense: "Pres" }),
	{
		id: "imperative",
		core: false,
		fixed: { verbForm: "Fin", mood: "Imp" },
		rows: axis(
			{ person: "2", number: "Sing" },
			{ person: "2", number: "Plur" },
		),
		columns: whole,
	},
];

const verbalSchema = (kind: "VERB" | "AUX"): Dumling.TableSchema => ({
	id: `de/Lexeme/${kind}`,
	version: 1,
	keyFeatures: verbKeys,
	panels: verbalPanels,
});

const comparison: Panel = {
	id: "comparison",
	core: true,
	fixed: {},
	rows: axis({ degree: "Pos" }, { degree: "Cmp" }, { degree: "Sup" }),
	columns: whole,
};

/**
 * The comparison of a comparable ADJ: Positiv, Komparativ, Superlativ. Case,
 * gender and number are key features, so a declined attributive form
 * (`kleinere`) fits no cell and goes to the list: the Feature Pool has no
 * strong, weak and mixed declension to key an attributive panel on.
 */
const adjectiveSchema: Dumling.TableSchema = {
	id: "de/Lexeme/ADJ",
	version: 1,
	keyFeatures: ["case", "degree", "gender", "number"],
	panels: [comparison],
};

const adverbSchema: Dumling.TableSchema = {
	id: "de/Lexeme/ADV",
	version: 1,
	keyFeatures: ["degree"],
	panels: [comparison],
};

/** The gender columns of a closed stem, and its plural, which marks none. */
export const STEM_COLUMNS = axis(
	{ gender: "Masc", number: "Sing" },
	{ gender: "Neut", number: "Sing" },
	{ gender: "Fem", number: "Sing" },
	{ number: "Plur" },
);

const stemSchema = (kind: "DET" | "PRON"): Dumling.TableSchema => ({
	id: `de/Lexeme/${kind}`,
	version: 1,
	keyFeatures: ["case", "gender", "number"],
	panels: [
		{
			id: "declension",
			core: true,
			fixed: {},
			rows: caseRows,
			columns: STEM_COLUMNS,
		},
	],
});

/** The German pack's Table Schemas, by route. */
export const germanSchemas = {
	NOUN: nounSchema,
	VERB: verbalSchema("VERB"),
	AUX: verbalSchema("AUX"),
	ADJ: adjectiveSchema,
	ADV: adverbSchema,
	DET: stemSchema("DET"),
	PRON: stemSchema("PRON"),
} as const satisfies Readonly<Record<string, Dumling.TableSchema>>;
