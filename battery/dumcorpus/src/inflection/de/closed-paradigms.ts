import { cellKeyOf } from "dumling";
import type * as Dumling from "dumling/types";

import {
	type ClosedPersonForms,
	type ClosedVerbTable,
	closedAuxiliaryTables,
	closedVerbTables,
} from "../../inventories/de/closed-verb-tables.js";
import {
	type AuthoredRealization,
	authoredRealizations,
} from "../../inventories/de/realizations.js";
import { authoredFor } from "../../inventories/selection.js";
import { Cells, type PackDerivedTable } from "../types.js";
import { CASES } from "./articles.js";
import type { GermanForm } from "./forms.js";
import { distinct } from "./orthography.js";
import { PERSON_ROWS, STEM_COLUMNS } from "./schemas.js";
import { PERSONS } from "./verb-stem.js";

/**
 * The authored table of a VERB or AUX Lexeme whose whole paradigm is closed
 * (sein, haben, werden and the modals), or undefined.
 */
export function closedVerbTableOf(
	lemma: Dumling.Lemma<"de">,
): ClosedVerbTable | undefined {
	if (lemma.family !== "Lexeme") return undefined;
	const tables =
		lemma.kind === "VERB"
			? closedVerbTables
			: lemma.kind === "AUX"
				? closedAuxiliaryTables
				: undefined;
	return tables && Object.hasOwn(tables, lemma.canonicalForm)
		? tables[lemma.canonicalForm]
		: undefined;
}

const FINITE = {
	present: { mood: "Ind", tense: "Pres" },
	preterite: { mood: "Ind", tense: "Past" },
	subjunctive2: { mood: "Sub", tense: "Past" },
	subjunctive1: { mood: "Sub", tense: "Pres" },
} as const;

/** A closed verb's cells from its authored table, each form `Authored`. */
export function deriveClosedVerb(
	table: ClosedVerbTable,
	schema: Dumling.TableSchema,
): PackDerivedTable<GermanForm> {
	const cells = new Cells<GermanForm>();
	const key = (bundle: Dumling.FeatureBundle) =>
		cellKeyOf(bundle, schema.keyFeatures);
	const panel = (fixed: Dumling.FeatureBundle, forms: ClosedPersonForms) => {
		for (const [index, row] of PERSON_ROWS.entries())
			for (const finite of forms[index] ?? [])
				cells.add(key({ verbForm: "Fin", ...fixed, ...row.bundle }), {
					form: {
						kind: "Verb",
						pronoun: PERSONS[index] ?? "",
						finite,
					},
					provenance: "Authored",
				});
	};
	for (const name of Object.keys(FINITE) as (keyof typeof FINITE)[])
		panel(FINITE[name], table[name]);
	for (const nonFinite of table.participle)
		cells.add(key({ verbForm: "Part", participleForm: "Past" }), {
			form: { kind: "Verb", nonFinite },
			provenance: "Authored",
		});
	if (table.imperative)
		for (const [number, forms] of [
			["Sing", table.imperative.singular],
			["Plur", table.imperative.plural],
		] as const)
			for (const finite of forms)
				cells.add(
					key({ verbForm: "Fin", mood: "Imp", person: "2", number }),
					{
						form: { kind: "Verb", finite },
						provenance: "Authored",
					},
				);
	return cells.table;
}

/** A plain spelling: no Shorthand or Fused member, nothing archaic or historical. */
function isStandard(realization: AuthoredRealization): boolean {
	const { spelling } = realization;
	return (
		realization.orthography === undefined &&
		realization.historicalStatus === undefined &&
		!(
			spelling?.kind === "Variant" &&
			(spelling.variantTags as readonly string[]).includes("Historical")
		)
	);
}

const stemTables = new WeakMap<
	Dumling.Lemma<"de">,
	ReadonlyMap<string, readonly string[]> | null
>();

/**
 * The cells of a declining DET or PRON stem (dieser, welcher): the plain
 * spellings its authored realizations mark, by `case|column`. A pillar
 * Lemma that is one Paradigm Cell (der, ich) has no table, so it gets none.
 */
function stemTableOf(
	lemma: Dumling.Lemma<"de">,
): ReadonlyMap<string, readonly string[]> | undefined {
	if (lemma.kind !== "DET" && lemma.kind !== "PRON") return undefined;
	const known = stemTables.get(lemma);
	if (known !== undefined) return known ?? undefined;
	const members = authoredFor(lemma);
	const celled = authoredRealizations.filter(
		(realization) =>
			members.includes(realization.member) &&
			realization.inflection?.case !== undefined &&
			isStandard(realization),
	);
	const table = new Map<string, string[]>();
	for (const { inflection, spelled } of celled) {
		const column =
			inflection?.number === "Plur" ? "Plur" : (inflection?.gender ?? "");
		const at = `${inflection?.case}|${column}`;
		table.set(at, distinct([...(table.get(at) ?? []), spelled]));
	}
	const result = table.size === 0 ? undefined : table;
	stemTables.set(lemma, result ?? null);
	return result;
}

/** Whether the Lemma is a closed DET or PRON stem with a table of its own. */
export function hasStemTable(lemma: Dumling.Lemma<"de">): boolean {
	return stemTableOf(lemma) !== undefined;
}

/**
 * A declining DET or PRON stem's case table from the Authored Inventory,
 * `dieser`, `dieses`, `diese` and `diese` in the nominative, each form
 * `Authored`.
 */
export function deriveStem(
	lemma: Dumling.Lemma<"de">,
	schema: Dumling.TableSchema,
): PackDerivedTable<GermanForm> {
	const cells = new Cells<GermanForm>();
	const table = stemTableOf(lemma);
	if (table === undefined) return cells.table;
	for (const grammaticalCase of CASES)
		for (const column of STEM_COLUMNS) {
			const name = column.bundle.gender ?? "Plur";
			for (const word of table.get(`${grammaticalCase}|${name}`) ?? [])
				cells.add(
					cellKeyOf(
						{ case: grammaticalCase, ...column.bundle },
						schema.keyFeatures,
					),
					{ form: { kind: "Word", word }, provenance: "Authored" },
				);
		}
	return cells.table;
}
