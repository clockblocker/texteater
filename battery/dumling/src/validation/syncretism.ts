import type { Syncretism, SyncretismView } from "../generated/units.js";
import {
	foldCase,
	identityKeyOf,
	type LemmaIdentity,
	lemmaIdentityKey,
	sortedNonNullEntries,
} from "../identity.js";
import type { Language, Lemma, Surface } from "../types.js";

type Bag = Readonly<Record<string, unknown>>;
type LemmaFields = LemmaIdentity & {
	syncretized?: readonly LemmaFields[];
};

// Feature values compare as JSON, so a missing feature equals a null one.
const valueKey = (value: unknown) => JSON.stringify(value ?? null);
const featureNames = (bags: readonly Bag[]) =>
	new Set(bags.flatMap((bag) => Object.keys(bag)));

/** Each value sorts after the one before it, so none repeats. */
function isAscending(values: readonly string[]): boolean {
	return values.every((value, index) => {
		const previous = values[index - 1];
		return previous === undefined || previous < value;
	});
}

/**
 * Projects a Syncretism's feature bags in one pass (system ADR 0046): each
 * feature keeps the value its units agree on and is null where they disagree,
 * and `disagreements` lists the disagreed feature names in alphabetical order.
 */
function projectFeatureBags(bags: readonly Bag[]): {
	projection: Record<string, unknown>;
	disagreements: string[];
} {
	const projection: Record<string, unknown> = {};
	const disagreements: string[] = [];
	for (const name of featureNames(bags)) {
		const first = bags[0]?.[name] ?? null;
		const firstKey = valueKey(first);
		let agrees = true;
		for (let index = 1; index < bags.length; index += 1) {
			if (valueKey(bags[index]?.[name]) !== firstKey) {
				agrees = false;
				break;
			}
		}
		if (agrees) {
			projection[name] = first;
		} else {
			projection[name] = null;
			disagreements.push(name);
		}
	}
	disagreements.sort();
	return { projection, disagreements };
}

/**
 * Shared Syncretism check for both Lemmas and Surfaces (system ADR 0046):
 * units are in strictly ascending key order, satisfy the route's shared
 * invariants, include the Syncretism's exact spelling, and project to the
 * Syncretism's feature bag and `syncretic` list.
 */
function isUnitSyncretism<
	T extends {
		readonly syncretic?: readonly string[];
		readonly syncretized?: readonly T[];
	},
>(
	unit: T,
	spec: {
		readonly keyOf: (item: T) => string;
		readonly formOf: (item: T) => string;
		readonly bagOf: (item: T) => Bag;
		readonly compatible: (member: T) => boolean;
	},
): boolean {
	const units = unit.syncretized;
	if (units === undefined) return true;
	if (unit.syncretic === undefined) return false;
	const { projection, disagreements } = projectFeatureBags(
		units.map(spec.bagOf),
	);
	const own = spec.bagOf(unit);
	const ownForm = spec.formOf(unit);
	return (
		isAscending(units.map(spec.keyOf)) &&
		units.every(spec.compatible) &&
		units.some((member) => spec.formOf(member) === ownForm) &&
		[...featureNames([own, projection])].every(
			(name) => valueKey(own[name]) === valueKey(projection[name]),
		) &&
		unit.syncretic.length === disagreements.length &&
		unit.syncretic.every((name, index) => name === disagreements[index])
	);
}

/**
 * A `syncretic` list names distinct Core Features in alphabetical order,
 * each null in the Lemma's Core (system ADR 0046). A Lemma with no list
 * passes.
 */
export function isSyncretismView({
	syncretic,
	coreFeatures,
}: LemmaFields): boolean {
	return (
		syncretic === undefined ||
		(isAscending(syncretic) &&
			syncretic.every((name) => (coreFeatures[name] ?? null) === null))
	);
}
export function syncretismViewError(): string {
	return "A Syncretism lists distinct Core Features in alphabetical order, each null in its Core";
}

/**
 * A Syncretism holds two or more distinct units in identity-key order (system
 * ADR 0046). They share one Canonical Form, compared without letter case, and
 * the Syncretism is spelled as one of them. Its Core is their projection, and
 * its `syncretic` list names exactly the features they disagree on. A Lemma
 * that holds no units passes.
 */
export function isLemmaSyncretism(lemma: LemmaFields): boolean {
	const form = foldCase(lemma.canonicalForm, lemma.language);
	return isUnitSyncretism(lemma, {
		keyOf: identityKeyOf,
		formOf: (unit) => unit.canonicalForm,
		bagOf: (unit) => unit.coreFeatures,
		compatible: (unit) =>
			foldCase(unit.canonicalForm, lemma.language) === form,
	});
}
export function lemmaSyncretismError(): string {
	return "A Syncretism holds two or more distinct units in identity order with one Canonical Form; its Core is their projection and its syncretic list the features they disagree on";
}

type SurfaceFields = {
	language: Language;
	lemma: LemmaFields;
	normalizedSurface: string;
	spelling: unknown;
	surfaceFeatures: unknown;
	inflectionalFeatures?: Bag | null;
	syncretic?: readonly string[];
	syncretized?: readonly SurfaceFields[];
};

/**
 * The order a Surface Syncretism lists its units in: their Lemma's identity,
 * their case-folded form and the inflectional features they mark, by name.
 */
function surfaceKey(surface: SurfaceFields): string {
	return JSON.stringify([
		identityKeyOf(surface.lemma),
		foldCase(surface.normalizedSurface, surface.language),
		sortedNonNullEntries(surface.inflectionalFeatures ?? {}),
	]);
}

/**
 * A Surface's `syncretic` list names distinct inflectional features in
 * alphabetical order, each null on the Surface (system ADR 0046). A Surface
 * with no list passes.
 */
export function isSurfaceSyncretismView({
	syncretic,
	inflectionalFeatures,
}: SurfaceFields): boolean {
	return (
		syncretic === undefined ||
		(isAscending(syncretic) &&
			syncretic.every(
				(name) => (inflectionalFeatures?.[name] ?? null) === null,
			))
	);
}
export function surfaceSyncretismViewError(): string {
	return "A Surface Syncretism lists distinct inflectional features in alphabetical order, each null on the Surface";
}

/**
 * A Surface Syncretism holds two or more distinct Surfaces of one Lemma in
 * key order (system ADR 0046). They share one form, compared without letter
 * case, one spelling and one set of Surface features, and the Syncretism is
 * spelled as one of them. Its inflectional features are their projection,
 * and its `syncretic` list names exactly the features they disagree on. A
 * Surface that holds no units passes.
 */
export function isSurfaceSyncretism(surface: SurfaceFields): boolean {
	if (surface.syncretized === undefined) return true;
	const lemma = identityKeyOf(surface.lemma);
	const form = foldCase(surface.normalizedSurface, surface.language);
	const spellingKey = valueKey(surface.spelling);
	const surfaceFeaturesKey = valueKey(surface.surfaceFeatures);
	return isUnitSyncretism(surface, {
		keyOf: surfaceKey,
		formOf: (unit) => unit.normalizedSurface,
		bagOf: (unit) => unit.inflectionalFeatures ?? {},
		compatible: (unit) =>
			identityKeyOf(unit.lemma) === lemma &&
			foldCase(unit.normalizedSurface, unit.language) === form &&
			valueKey(unit.spelling) === spellingKey &&
			valueKey(unit.surfaceFeatures) === surfaceFeaturesKey,
	});
}
export function surfaceSyncretismError(): string {
	return "A Surface Syncretism holds two or more distinct Surfaces of one Lemma in key order with one form and spelling; its inflectional features are their projection and its syncretic list the features they disagree on";
}

/**
 * Shared Syncretism builder for Lemmas and Surfaces: precomputes sort keys
 * once per unit, chooses the case-folded spelling when present, and projects
 * feature bags in a single pass.
 */
function syncretizeUnits<T extends { readonly language: Language }>(
	units: readonly T[],
	spec: {
		readonly keyOf: (unit: T) => string;
		readonly formOf: (unit: T) => string;
		readonly bagOf: (unit: T) => Bag;
	},
): {
	spelled: T;
	sorted: T[];
	projection: Record<string, unknown>;
	disagreements: string[];
} {
	if (units.length < 2)
		throw new TypeError("A Syncretism holds two or more units");
	const keyed = units.map((unit) => ({ unit, key: spec.keyOf(unit) }));
	keyed.sort((left, right) =>
		left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
	);
	const sorted = keyed.map(({ unit }) => unit);
	const first = sorted[0] as T;
	const spelled =
		sorted.find((unit) => {
			const form = spec.formOf(unit);
			return foldCase(form, unit.language) === form;
		}) ?? first;
	const { projection, disagreements } = projectFeatureBags(
		sorted.map(spec.bagOf),
	);
	return { spelled, sorted, projection, disagreements };
}

/**
 * Builds the Syncretism of two or more units of one route (system ADR 0046).
 * Lemmas: the units in identity-key order, their shared Core and the
 * features they disagree on, spelled as the unit whose Canonical Form is
 * already case-folded (`sie` over formal `Sie`), else as the first.
 * Surfaces of one Lemma: the units in key order, their shared inflectional
 * features and the features they disagree on (`jedem`, the dative of jeder
 * in the Masc or the Neut), spelled the same way. Validate the result with
 * `parseUnit`: units of other forms, Lemmas or routes, or units that
 * disagree on nothing, make no Syncretism.
 */
export function syncretize<T extends Lemma>(
	units: readonly T[],
): T & Syncretism<"Lemma">;
export function syncretize<T extends Surface>(
	units: readonly T[],
): T & Syncretism<"Surface">;
export function syncretize(
	units: readonly (Lemma | Surface)[],
): Syncretism<"Lemma"> | Syncretism<"Surface"> {
	if (units.every(isSurface)) return syncretizeSurfaces(units);
	if (!units.every(isLemma))
		throw new TypeError(
			"A Syncretism's units are all Lemmas or all Surfaces",
		);
	const { spelled, sorted, projection, disagreements } = syncretizeUnits(
		units,
		{
			keyOf: lemmaIdentityKey,
			formOf: (unit) => unit.canonicalForm,
			bagOf: (unit) => unit.coreFeatures,
		},
	);
	// TypeScript can't pair the projected Core and the open features with the
	// route of the unit spelled; `parseUnit` checks the result.
	return {
		...spelled,
		coreFeatures: projection,
		syncretic: disagreements,
		syncretized: sorted,
	} as unknown as Syncretism<"Lemma">;
}

function isSurface(unit: Lemma | Surface): unit is Surface {
	return unit.unitKind === "Surface";
}
function isLemma(unit: Lemma | Surface): unit is Lemma {
	return unit.unitKind === "Lemma";
}

function syncretizeSurfaces(units: readonly Surface[]): Syncretism<"Surface"> {
	const { spelled, sorted, projection, disagreements } = syncretizeUnits(
		units as readonly SurfaceFields[],
		{
			keyOf: surfaceKey,
			formOf: (unit) => unit.normalizedSurface,
			bagOf: (unit) => unit.inflectionalFeatures ?? {},
		},
	);
	// TypeScript can't pair the projected features and the open features with
	// the route of the unit spelled; `parseUnit` checks the result.
	return {
		...spelled,
		inflectionalFeatures: projection,
		syncretic: disagreements,
		syncretized: sorted,
	} as unknown as Syncretism<"Surface">;
}

/**
 * The view a classifier answers (system ADR 0046): the Syncretism without its
 * units. It keeps the `syncretic` list, so it has the Syncretism's identity.
 */
export function syncretismView<S extends { syncretized?: unknown }>(
	syncretism: S,
): Omit<S, "syncretized"> {
	const { syncretized: _units, ...view } = syncretism;
	return view;
}

/** Whether a Lemma or Surface is a Syncretism that holds its units. */
export function isSyncretism<T extends Lemma | Surface>(
	unit: T,
): unit is T & Syncretism {
	return "syncretized" in unit && unit.syncretized !== undefined;
}

/**
 * Whether a Lemma or Surface is a Syncretism or its view: it lists the
 * features it leaves open.
 */
export function isSyncreticUnit<T extends Lemma | Surface>(
	unit: T,
): unit is T & SyncretismView {
	return "syncretic" in unit && unit.syncretic !== undefined;
}
