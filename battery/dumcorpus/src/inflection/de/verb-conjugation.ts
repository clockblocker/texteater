import { cellKeyOf } from "dumling";
import type * as Dumling from "dumling/types";
import { germanConjugationClass } from "dumrel";
import type * as Dumrel from "dumrel/types";

import {
	Cells,
	type PackDerivedTable,
	type PackDeriveInput,
} from "../types.js";
import type { GermanVerbForm } from "./forms.js";
import { lower } from "./orthography.js";
import {
	analyze,
	finiteOf,
	fitsParticiple,
	hasStrongParticiple,
	imperativeSingular,
	PERSONS,
	type Person,
	pastForms,
	presentForms,
	type Stem,
	takesGe,
} from "./verb-stem.js";

/** The fixed features of each finite panel the rules fill. */
const TENSES = {
	present: { verbForm: "Fin", mood: "Ind", tense: "Pres" },
	preterite: { verbForm: "Fin", mood: "Ind", tense: "Past" },
	subjunctive2: { verbForm: "Fin", mood: "Sub", tense: "Past" },
} as const;

/** The singular persons whose Präsens is a Variation Dimension of its own. */
const PRESENT_DIMENSIONS: Partial<Record<Person, Dumrel.DimensionId>> = {
	ich: "present1",
	du: "present2",
	er: "present3",
};

const personBundle = (index: number): Dumling.FeatureBundle => ({
	person: String((index % 3) + 1),
	number: index < 3 ? "Sing" : "Plur",
});

/** A stored variant and the finite word it spells, its particle split off. */
type Finite = {
	readonly variant: Dumrel.ParadigmVariant;
	readonly finite: string;
};

function finitesOf(
	variants: readonly Dumrel.ParadigmVariant[],
	particle: string | null,
): Finite[] {
	return variants.flatMap((variant) => {
		const finite = finiteOf(variant.value, particle);
		return finite === undefined ? [] : [{ variant, finite }];
	});
}

/**
 * A German verb's conjugation for one Licence Group, from its Canonical
 * Form, Core and the variants the group licenses. Stored variants win over
 * rules (ADR 0038), and a dimension the Paradigm holds is never filled in
 * from rules:
 *
 * - `present1`, `present2` and `present3` give the ich, du and er Präsens,
 *   `preterite` the Präteritum, `subjunctivePast` the Konjunktiv II and
 *   `pastParticiple` the Partizip II, each form the cells of its persons;
 * - every non-closed verb forms its other Präsens persons regularly (wissen
 *   drops ich), and a verb whose licensed Präteritum forms are all Weak also
 *   its du and er Präsens and its Imperativ;
 * - a Weak Präteritum variant gives the Konjunktiv II its own forms, and a
 *   `-te` one the Partizip II where `ge-` is certain (gebracht).
 *
 * The rest is left out rather than guessed: a Strong verb's Konjunktiv II,
 * a participle whose `ge-` is in doubt, a stored form whose particle is not
 * the verb's. Nothing is derived when the Canonical Form is not one word
 * once its particle is removed, or its stem is one no rule here spells
 * (knien). A lexical reflexive is never shown (ADR 0052).
 */
export function conjugateGermanVerb(
	input: PackDeriveInput<"de">,
): PackDerivedTable<GermanVerbForm> {
	const cells = new Cells<GermanVerbForm>();
	const verb = verbOf(input, cells);
	if (verb === undefined) return cells.table;
	presentCells(verb);
	for (const preterite of verb.preterites)
		personCells(verb, "preterite", "preterite", preterite, true);
	subjunctiveCells(verb);
	participleCells(verb);
	imperativeCells(verb);
	return cells.table;
}

/** What every panel's rules read of one verb and one Licence Group. */
type Verb = {
	readonly input: PackDeriveInput<"de">;
	readonly cells: Cells<GermanVerbForm>;
	readonly infinitive: string;
	readonly stem: Stem;
	readonly particle: string | null;
	readonly preterites: readonly Finite[];
	/** Whether each licensed Präteritum is Weak, by position. */
	readonly weakAt: readonly boolean[];
	/** Whether every licensed Präteritum is Weak, and there is one. */
	readonly weak: boolean;
};

function verbOf(
	input: PackDeriveInput<"de">,
	cells: Cells<GermanVerbForm>,
): Verb | undefined {
	const { lemma, selection } = input;
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	const particle =
		typeof core.hasSepPrefix === "string" ? core.hasSepPrefix : null;
	let infinitive = lemma.canonicalForm;
	if (particle !== null) {
		if (!lower(infinitive).startsWith(lower(particle))) return undefined;
		infinitive = infinitive.slice(particle.length);
	}
	if (/\s/u.test(infinitive)) return undefined;
	const stem = analyze(infinitive);
	if (stem === undefined) return undefined;
	const preterites = finitesOf(selection.preterite ?? [], particle);
	const weakAt = preterites.map(
		({ variant }) =>
			germanConjugationClass(lemma.canonicalForm, variant.value) ===
			"Weak",
	);
	return {
		input,
		cells,
		infinitive,
		stem,
		particle,
		preterites,
		weakAt,
		weak: preterites.length > 0 && weakAt.every(Boolean),
	};
}

const keyOf = (verb: Verb, bundle: Dumling.FeatureBundle) =>
	cellKeyOf(bundle, verb.input.schema.keyFeatures);

const ref = (
	dimension: Dumrel.DimensionId,
	variant: Dumrel.ParadigmVariant,
) => ({
	dimension,
	id: variant.id,
});

/** A finite form with its pronoun and the particle. */
function finiteForm(
	verb: Verb,
	finite: string,
	pronoun: Person,
	shown = true,
): GermanVerbForm {
	return {
		kind: "Verb",
		...(shown ? { pronoun } : {}),
		finite,
		...(verb.particle === null ? {} : { particle: verb.particle }),
	};
}

/** The six person cells of a panel from one third person singular form. */
function personCells(
	verb: Verb,
	tense: keyof typeof TENSES,
	dimension: Dumrel.DimensionId,
	{ variant, finite }: Finite,
	stored: boolean,
): void {
	const forms = pastForms(finite);
	PERSONS.forEach((person, index) => {
		verb.cells.add(
			keyOf(verb, { ...TENSES[tense], ...personBundle(index) }),
			{
				form: finiteForm(verb, forms[person], person),
				provenance: stored && person === "er" ? "Variant" : "Rule",
				variant: ref(dimension, variant),
			},
		);
	});
}

/** Whether a Präsens person's regular form is certain without a stored one. */
function regularPresent(verb: Verb, person: Person): boolean {
	if (person === "ich") return lower(verb.infinitive) !== "wissen";
	return person === "du" || person === "er" ? verb.weak : true;
}

function presentCells(verb: Verb): void {
	const { selection } = verb.input;
	const regular = presentForms(verb.stem);
	PERSONS.forEach((person, index) => {
		const at = keyOf(verb, { ...TENSES.present, ...personBundle(index) });
		const dimension = PRESENT_DIMENSIONS[person];
		const stored =
			dimension === undefined ? undefined : selection[dimension];
		if (dimension !== undefined && stored !== undefined) {
			for (const { variant, finite } of finitesOf(stored, verb.particle))
				verb.cells.add(at, {
					form: finiteForm(verb, finite, person),
					provenance: "Variant",
					variant: ref(dimension, variant),
				});
		} else if (regularPresent(verb, person))
			verb.cells.add(at, {
				form: finiteForm(verb, regular[person], person),
				provenance: "Rule",
			});
	});
}

/** The stored Konjunktiv II, or a Weak Präteritum's, which it equals. */
function subjunctiveCells(verb: Verb): void {
	const stored = verb.input.selection.subjunctivePast;
	if (stored !== undefined) {
		for (const subjunctive of finitesOf(stored, verb.particle))
			if (subjunctive.finite.endsWith("e"))
				personCells(
					verb,
					"subjunctive2",
					"subjunctivePast",
					subjunctive,
					true,
				);
		return;
	}
	verb.preterites.forEach((preterite, index) => {
		if (verb.weakAt[index])
			personCells(verb, "subjunctive2", "preterite", preterite, false);
	});
}

/** The stored Partizip II, or one a `-te` Präteritum gives where `ge-` is certain. */
function participleCells(verb: Verb): void {
	const at = keyOf(verb, { verbForm: "Part", participleForm: "Past" });
	const { particle } = verb;
	const stored = verb.input.selection.pastParticiple;
	if (stored !== undefined) {
		for (const variant of stored)
			if (fitsParticiple(variant.value, particle))
				verb.cells.add(at, {
					form: { kind: "Verb", nonFinite: variant.value },
					provenance: "Variant",
					variant: ref("pastParticiple", variant),
				});
		return;
	}
	const ge = takesGe(verb.stem);
	if (ge === undefined || hasStrongParticiple(verb.infinitive)) return;
	for (const { variant, finite } of verb.preterites)
		if (finite.endsWith("te"))
			verb.cells.add(at, {
				form: {
					kind: "Verb",
					nonFinite: `${particle ?? ""}${ge ? "ge" : ""}${finite.slice(0, -1)}`,
				},
				provenance: "Rule",
				variant: ref("preterite", variant),
			});
}

/** A Weak verb's Imperativ, singular and plural, which shows no pronoun. */
function imperativeCells(verb: Verb): void {
	if (!verb.weak) return;
	for (const [number, finite, pronoun] of [
		["Sing", imperativeSingular(verb.stem), "du"],
		["Plur", presentForms(verb.stem).ihr, "ihr"],
	] as const)
		verb.cells.add(
			keyOf(verb, { verbForm: "Fin", mood: "Imp", person: "2", number }),
			{
				form: finiteForm(verb, finite, pronoun, false),
				provenance: "Rule",
			},
		);
}
