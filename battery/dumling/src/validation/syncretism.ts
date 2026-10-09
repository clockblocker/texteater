import type { Syncretism, SyncretismView } from "../generated/units.js";
import {
	identityKeyOf,
	type LemmaIdentity,
	lemmaIdentityKey,
} from "../identity.js";
import type { Language, Lemma, Surface } from "../types.js";
import { foldCase } from "./semantics.js";

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
 * The Core of a Syncretism (system ADR 0046): each feature keeps the value
 * its units agree on and is null where they disagree.
 */
function syncretizedFeatures(bags: readonly Bag[]): Record<string, unknown> {
	return Object.fromEntries(
		[...featureNames(bags)].map((name) => [
			name,
			new Set(bags.map((bag) => valueKey(bag[name]))).size === 1
				? (bags[0]?.[name] ?? null)
				: null,
		]),
	);
}

/** The features a Syncretism's units disagree on, in alphabetical order. */
function syncreticFeatures(bags: readonly Bag[]): string[] {
	return [...featureNames(bags)]
		.filter(
			(name) => new Set(bags.map((bag) => valueKey(bag[name]))).size > 1,
		)
		.toSorted();
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
	const units = lemma.syncretized;
	if (units === undefined) return true;
	if (lemma.syncretic === undefined) return false;
	const form = foldCase(lemma.canonicalForm, lemma.language);
	const cores = units.map((unit) => unit.coreFeatures);
	const projection = syncretizedFeatures(cores);
	const disagreements = syncreticFeatures(cores);
	return (
		isAscending(units.map((unit) => identityKeyOf(unit))) &&
		units.every(
			(unit) => foldCase(unit.canonicalForm, lemma.language) === form,
		) &&
		units.some((unit) => unit.canonicalForm === lemma.canonicalForm) &&
		[...featureNames([lemma.coreFeatures, projection])].every(
			(name) =>
				valueKey(lemma.coreFeatures[name]) ===
				valueKey(projection[name]),
		) &&
		lemma.syncretic.length === disagreements.length &&
		lemma.syncretic.every((name, index) => name === disagreements[index])
	);
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
		Object.entries(surface.inflectionalFeatures ?? {})
			.filter(([, value]) => value !== null && value !== undefined)
			.toSorted(([left], [right]) =>
				left < right ? -1 : left > right ? 1 : 0,
			),
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
	const units = surface.syncretized;
	if (units === undefined) return true;
	if (surface.syncretic === undefined) return false;
	const lemma = identityKeyOf(surface.lemma);
	const form = foldCase(surface.normalizedSurface, surface.language);
	const bags = units.map((unit) => unit.inflectionalFeatures ?? {});
	const projection = syncretizedFeatures(bags);
	const disagreements = syncreticFeatures(bags);
	const own = surface.inflectionalFeatures ?? {};
	return (
		isAscending(units.map(surfaceKey)) &&
		units.every(
			(unit) =>
				identityKeyOf(unit.lemma) === lemma &&
				foldCase(unit.normalizedSurface, unit.language) === form &&
				valueKey(unit.spelling) === valueKey(surface.spelling) &&
				valueKey(unit.surfaceFeatures) ===
					valueKey(surface.surfaceFeatures),
		) &&
		units.some(
			(unit) => unit.normalizedSurface === surface.normalizedSurface,
		) &&
		[...featureNames([own, projection])].every(
			(name) => valueKey(own[name]) === valueKey(projection[name]),
		) &&
		surface.syncretic.length === disagreements.length &&
		surface.syncretic.every((name, index) => name === disagreements[index])
	);
}
export function surfaceSyncretismError(): string {
	return "A Surface Syncretism holds two or more distinct Surfaces of one Lemma in key order with one form and spelling; its inflectional features are their projection and its syncretic list the features they disagree on";
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
	const sorted = units.toSorted((left, right) => {
		const leftKey = lemmaIdentityKey(left),
			rightKey = lemmaIdentityKey(right);
		return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
	});
	const first = sorted[0];
	if (first === undefined || sorted.length < 2)
		throw new TypeError("A Syncretism holds two or more units");
	const spelled =
		sorted.find(
			(unit) =>
				foldCase(unit.canonicalForm, unit.language) ===
				unit.canonicalForm,
		) ?? first;
	const cores: Bag[] = sorted.map((unit) => unit.coreFeatures);
	// TypeScript can't pair the projected Core and the open features with the
	// route of the unit spelled; `parseUnit` checks the result.
	return {
		...spelled,
		coreFeatures: syncretizedFeatures(cores),
		syncretic: syncreticFeatures(cores),
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
	const fields: readonly SurfaceFields[] = units;
	const sorted = fields.toSorted((left, right) => {
		const leftKey = surfaceKey(left),
			rightKey = surfaceKey(right);
		return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
	});
	const first = sorted[0];
	if (first === undefined || sorted.length < 2)
		throw new TypeError("A Syncretism holds two or more units");
	const spelled =
		sorted.find(
			(unit) =>
				foldCase(unit.normalizedSurface, unit.language) ===
				unit.normalizedSurface,
		) ?? first;
	const bags = sorted.map((unit) => unit.inflectionalFeatures ?? {});
	// TypeScript can't pair the projected features and the open features with
	// the route of the unit spelled; `parseUnit` checks the result.
	return {
		...spelled,
		inflectionalFeatures: syncretizedFeatures(bags),
		syncretic: syncreticFeatures(bags),
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
