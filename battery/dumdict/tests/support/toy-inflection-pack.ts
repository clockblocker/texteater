import { cellKeyOf, foldCase } from "dumling";
import type * as Dumling from "dumling/types";

import type {
	DerivedForm,
	DerivedTable,
	DeriveInput,
	InflectionPack,
} from "../../src/inflection";

/**
 * A toy Inflection Pack over the German NOUN, VERB and PRON routes. Its rules
 * are deliberately crude, so tests read what the projection does with a
 * pack, not German grammar: a plural variant `v` is every plural cell, with
 * `-n` in the dative; a preterite variant `v` is `v`, `v-st`, `v`, `v-n`,
 * `v-t`, `v-n`; the present comes from the stem; the genitive singular and
 * the Konjunktiv II are left Unknown.
 */
export type ToyForm = { readonly letters: string; readonly pronoun?: string };

const cases = ["Nom", "Acc", "Gen", "Dat"] as const;
const numbers = [
	{ bundle: { number: "Sing" } },
	{ bundle: { number: "Plur" } },
];
const persons = (["1", "2", "3"] as const).map((person) => ({
	bundle: { person },
}));

export const nounSchema: Dumling.TableSchema = {
	id: "toy/Lexeme/NOUN",
	version: 1,
	keyFeatures: ["case", "number"],
	panels: [
		{
			id: "declension",
			core: true,
			fixed: {},
			rows: cases.map((name) => ({ bundle: { case: name } })),
			columns: numbers,
		},
	],
};

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
];
const finitePanel = (
	id: string,
	core: boolean,
	fixed: Dumling.FeatureBundle,
) => ({ id, core, fixed, rows: persons, columns: numbers });

export const imperativeFirstSingular = cellKeyOf(
	{ verbForm: "Fin", mood: "Imp", person: "1", number: "Sing" },
	verbKeys,
);

export const verbSchema: Dumling.TableSchema = {
	id: "toy/Lexeme/VERB",
	version: 1,
	keyFeatures: verbKeys,
	panels: [
		finitePanel("present", true, {
			verbForm: "Fin",
			mood: "Ind",
			tense: "Pres",
		}),
		finitePanel("preterite", true, {
			verbForm: "Fin",
			mood: "Ind",
			tense: "Past",
		}),
		finitePanel("subjunctive2", false, {
			verbForm: "Fin",
			mood: "Sub",
			tense: "Past",
		}),
		{
			id: "imperative",
			core: true,
			fixed: { verbForm: "Fin", mood: "Imp" },
			rows: persons.slice(0, 2),
			columns: numbers.slice(0, 1),
			absent: [imperativeFirstSingular],
		},
		{
			id: "participle",
			core: true,
			fixed: { verbForm: "Part" },
			rows: [{ bundle: {} }],
			columns: [{ bundle: { participleForm: "Past" } }],
		},
	],
};

export const pronounSchema: Dumling.TableSchema = {
	id: "toy/Lexeme/PRON",
	version: 1,
	keyFeatures: ["case", "gender", "number"],
	panels: [
		{
			id: "singular",
			core: true,
			fixed: { number: "Sing" },
			rows: cases.map((name) => ({ bundle: { case: name } })),
			columns: ["Masc", "Neut", "Fem"].map((gender) => ({
				bundle: { gender },
			})),
		},
		{
			id: "plural",
			core: true,
			fixed: { number: "Plur" },
			rows: cases.map((name) => ({ bundle: { case: name } })),
			columns: [{ bundle: {} }],
		},
	],
};

type Cells = Partial<Record<string, "Absent" | DerivedForm<ToyForm>[]>>;

function add(cells: Cells, key: string, form: DerivedForm<ToyForm>) {
	const known = cells[key];
	cells[key] =
		known === undefined || known === "Absent" ? [form] : [...known, form];
}

function deriveNoun({ lemma, selection, schema }: DeriveInput<"de">): Cells {
	const cells: Cells = {};
	const key = (bundle: Dumling.FeatureBundle) =>
		cellKeyOf(bundle, schema.keyFeatures);
	for (const name of cases)
		if (name !== "Gen")
			add(cells, key({ case: name, number: "Sing" }), {
				form: { letters: lemma.canonicalForm },
				provenance: "Rule",
			});
	for (const variant of selection.plural ?? []) {
		const ref = { dimension: "plural" as const, id: variant.id };
		for (const name of cases) {
			const at = key({ case: name, number: "Plur" });
			if (variant.value === "NoPlural") {
				cells[at] = "Absent";
				continue;
			}
			const dative = name === "Dat" && !/[ns]$/u.test(variant.value);
			add(cells, at, {
				form: { letters: dative ? `${variant.value}n` : variant.value },
				provenance: dative ? "Rule" : "Variant",
				variant: ref,
			});
		}
	}
	return cells;
}

const endings = {
	present: ["e", "st", "t", "en", "t", "en"],
	preterite: ["", "st", "", "n", "t", "n"],
};
const pronouns = ["ich", "du", "er", "wir", "ihr", "sie"];

function deriveVerb({ lemma, selection, schema }: DeriveInput<"de">): Cells {
	const cells: Cells = {};
	const at = (tense: string, index: number) =>
		cellKeyOf(
			{
				verbForm: "Fin",
				mood: "Ind",
				tense,
				person: String((index % 3) + 1),
				number: index < 3 ? "Sing" : "Plur",
			},
			schema.keyFeatures,
		);
	const stem = lemma.canonicalForm.replace(/e?n$/u, "");
	endings.present.forEach((ending, index) => {
		add(cells, at("Pres", index), {
			form: { letters: `${stem}${ending}`, pronoun: pronouns[index] },
			provenance: "Rule",
		});
	});
	for (const variant of selection.preterite ?? [])
		endings.preterite.forEach((ending, index) => {
			const letters = `${variant.value}${variant.value.endsWith("e") || ending !== "n" ? ending : `e${ending}`}`;
			add(cells, at("Past", index), {
				form: { letters, pronoun: pronouns[index] },
				provenance: ending === "" ? "Variant" : "Rule",
				variant: { dimension: "preterite", id: variant.id },
			});
		});
	const participle = cellKeyOf(
		{ verbForm: "Part", participleForm: "Past" },
		schema.keyFeatures,
	);
	for (const variant of selection.pastParticiple ?? [])
		add(cells, participle, {
			form: { letters: variant.value },
			provenance: "Variant",
			variant: { dimension: "pastParticiple", id: variant.id },
		});
	return cells;
}

/** The toy pack; `derivations` counts its `derive` calls. */
export function toyPack(): InflectionPack<"de", ToyForm> & {
	derivations: number;
} {
	const pack = {
		language: "de" as const,
		version: "toy-1",
		derivations: 0,
		schemaFor(lemma: Dumling.Lemma<"de">) {
			if (lemma.family !== "Lexeme") return undefined;
			if (lemma.kind === "NOUN") return nounSchema;
			if (lemma.kind === "VERB") return verbSchema;
			if (lemma.kind === "PRON") return pronounSchema;
			return undefined;
		},
		derive(input: DeriveInput<"de">): DerivedTable<ToyForm> {
			pack.derivations += 1;
			if (input.lemma.kind === "NOUN") return deriveNoun(input);
			if (input.lemma.kind === "VERB") return deriveVerb(input);
			return {};
		},
		formOfSurface: (surface: Dumling.Surface<"de">): ToyForm => ({
			letters: surface.normalizedSurface,
		}),
		codec: { key: (form: ToyForm) => foldCase(form.letters, "de") },
		display: (form: ToyForm) => [
			...(form.pronoun === undefined
				? []
				: [{ text: `${form.pronoun} `, role: "Context" as const }]),
			{ text: form.letters, role: "Form" as const },
		],
		labels: {
			panel: (id: string) => id.toUpperCase(),
			axis: (bundle: Dumling.FeatureBundle) =>
				Object.values(bundle).join("."),
			bundle: (bundle: Dumling.FeatureBundle) =>
				Object.entries(bundle)
					.map(([name, value]) => `${name}=${value}`)
					.join(" "),
		},
	};
	return pack;
}
