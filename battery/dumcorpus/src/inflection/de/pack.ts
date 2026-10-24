import type * as Dumling from "dumling/types";

import type { PackDerivedTable, PackDeriveInput } from "../types.js";
import {
	closedVerbTableOf,
	deriveClosedVerb,
	deriveStem,
	hasStemTable,
} from "./closed-paradigms.js";
import { compareGerman } from "./comparison.js";
import {
	displayGermanForm,
	type GermanDisplayRun,
	type GermanForm,
	germanFormKey,
	germanFormOfSurface,
} from "./forms.js";
import { germanLabels } from "./labels.js";
import { declineGermanNoun } from "./noun-declension.js";
import { germanSchemas } from "./schemas.js";
import { conjugateGermanVerb } from "./verb-conjugation.js";

/**
 * The German Inflection Pack's shape: `dumdict/inflection`'s
 * `InflectionPack<"de", GermanForm>`.
 */
export type GermanInflectionPack = {
	readonly language: "de";
	readonly version: string;
	readonly schemaFor: (
		lemma: Dumling.Lemma<"de">,
	) => Dumling.TableSchema | undefined;
	readonly derive: (
		input: PackDeriveInput<"de">,
	) => PackDerivedTable<GermanForm>;
	readonly formOfSurface: (surface: Dumling.Surface<"de">) => GermanForm;
	readonly codec: { readonly key: (form: GermanForm) => string };
	readonly display: (form: GermanForm) => readonly GermanDisplayRun[];
	readonly labels: {
		readonly panel: (panelId: string) => string;
		readonly axis: (bundle: Dumling.FeatureBundle) => string;
		readonly bundle: (bundle: Dumling.FeatureBundle) => string;
	};
};

/**
 * The Table Schema of a German Lexeme whose Surfaces the pack tabulates:
 * a NOUN; a VERB; a closed AUX (sein, haben, werden); a comparable ADJ or
 * ADV; a declining DET or PRON stem. Every other Lemma, a Locution among
 * them, gets none.
 */
function schemaFor(
	lemma: Dumling.Lemma<"de">,
): Dumling.TableSchema | undefined {
	if (lemma.family !== "Lexeme") return undefined;
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	switch (lemma.kind) {
		case "NOUN":
		case "VERB":
			return germanSchemas[lemma.kind];
		case "AUX":
			return closedVerbTableOf(lemma) ? germanSchemas.AUX : undefined;
		case "ADJ":
		case "ADV":
			return core.comparable === "Yes"
				? germanSchemas[lemma.kind]
				: undefined;
		case "DET":
		case "PRON":
			return hasStemTable(lemma) ? germanSchemas[lemma.kind] : undefined;
		default:
			return undefined;
	}
}

/**
 * One Licence Group's table. A closed verb or stem takes its Authored
 * Inventory table whatever the selection; every other Lemma derives from
 * the variants the group licenses and the rules.
 */
function derive(input: PackDeriveInput<"de">): PackDerivedTable<GermanForm> {
	const { lemma, schema } = input;
	const closed = closedVerbTableOf(lemma);
	if (closed) return deriveClosedVerb(closed, schema);
	switch (lemma.kind) {
		case "NOUN":
			return declineGermanNoun(input);
		case "VERB":
			return conjugateGermanVerb(input);
		case "ADJ":
		case "ADV":
			return compareGerman(input);
		case "DET":
		case "PRON":
			return deriveStem(lemma, schema);
		default:
			return {};
	}
}

/**
 * The German Inflection Pack (system ADR 0049). Its `version` changes
 * whenever derivation, display or labels change, so a host may cache a view
 * on it.
 */
export const germanInflectionPack: GermanInflectionPack = {
	language: "de",
	version: "1",
	schemaFor,
	derive,
	formOfSurface: germanFormOfSurface,
	codec: { key: germanFormKey },
	display: displayGermanForm,
	labels: germanLabels,
};
