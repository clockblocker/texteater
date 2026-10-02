import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";
import type { AdrId, AnnotationLayer, RuleId, SpecRecordId } from "../types.js";
import type { LemmaInFile, RecordFile } from "./record-files.js";

/**
 * A Lemma's identity apart from its Canonical Form: Family, Kind, Core
 * Features and, for a Syncretism, the features it leaves open (system ADR
 * 0046). A missing Core Feature and a `null` one are the same, and key order
 * doesn't matter, so `coreFeatures` keeps only the set values, sorted by key.
 */
export interface LemmaIdentity {
	family: string;
	kind: string;
	coreFeatures: Readonly<Record<string, string>>;
	syncretic?: readonly string[];
}

/** What an identity split compares: `family`, `kind`, `syncretic` or a Core Feature. */
type IdentityKey = string;

/** The value of `key` in `identity`, `null` when it isn't set. */
function identityValue(
	identity: LemmaIdentity,
	key: IdentityKey,
): string | null {
	if (key === "family") return identity.family;
	if (key === "kind") return identity.kind;
	if (key === "syncretic") return identity.syncretic?.join(" ") ?? null;
	return identity.coreFeatures[key] ?? null;
}

/** Normalizes a Lemma's identity: unset features dropped, keys sorted. */
export function lemmaIdentity(lemma: LemmaInFile): LemmaIdentity {
	return {
		family: lemma.family,
		kind: lemma.kind,
		coreFeatures: Object.fromEntries(
			Object.entries(lemma.coreFeatures)
				.filter(
					(entry): entry is [string, string | number | boolean] =>
						entry[1] !== null && entry[1] !== undefined,
				)
				.map(([key, value]) => [key, String(value)] as const)
				.toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
		),
		...(lemma.syncretic === undefined
			? {}
			: { syncretic: lemma.syncretic }),
	};
}

/**
 * A readable, comparable form of an identity: `Lexeme/PRON {case: Acc}`, and
 * `Lexeme/PRON {case: Dat} syncretic [polite]` for a Syncretism.
 */
export function formatIdentity(identity: LemmaIdentity): string {
	const features = Object.entries(identity.coreFeatures)
		.map(([key, value]) => `${key}: ${value}`)
		.join(", ");
	const open = identity.syncretic
		? ` syncretic [${identity.syncretic.join(", ")}]`
		: "";
	return `${identity.family}/${identity.kind} {${features}}${open}`;
}

/** The keys on which two identities differ, in a stable order. */
function identityDifference(a: LemmaIdentity, b: LemmaIdentity): IdentityKey[] {
	const features = new Set([
		...Object.keys(a.coreFeatures),
		...Object.keys(b.coreFeatures),
	]);
	return ["family", "kind", ...[...features].toSorted(), "syncretic"].filter(
		(key) => identityValue(a, key) !== identityValue(b, key),
	);
}

/** One record using an identity. */
interface IdentityUse {
	record: SpecRecordId;
	/** Absent for a Draft. */
	reviewDepth?: AnnotationLayer;
	rules: readonly RuleId[];
}

/**
 * A Canonical Form with more than one identity, and who uses each. Lemma
 * identity ignores letter case (system ADR 0002), so `form` is case-folded
 * and `spellings` holds the casings the records write, sorted.
 */
export interface IdentitySplit {
	form: string;
	spellings: readonly string[];
	identities: readonly {
		identity: LemmaIdentity;
		uses: readonly IdentityUse[];
	}[];
}

/**
 * Groups every target Lemma in `files` by case-folded Canonical Form and
 * returns each form with more than one identity, sorted by form; its
 * identities in order of first use. A record using an identity twice is
 * listed once.
 */
export function identitySplits(files: readonly RecordFile[]): IdentitySplit[] {
	const byForm = new Map<
		string,
		{
			spellings: Set<string>;
			identities: Map<
				string,
				{ identity: LemmaIdentity; uses: IdentityUse[] }
			>;
		}
	>();
	for (const file of files)
		for (const lemma of file.lemmas) {
			const identity = lemmaIdentity(lemma);
			const key = formatIdentity(identity);
			const form = foldCase(
				lemma.canonicalForm,
				lemma.language as Dumling.Language,
			);
			const group = byForm.get(form) ?? {
				spellings: new Set<string>(),
				identities: new Map(),
			};
			byForm.set(form, group);
			group.spellings.add(lemma.canonicalForm);
			const { identities } = group;
			const entry = identities.get(key) ?? { identity, uses: [] };
			identities.set(key, entry);
			if (entry.uses.at(-1)?.record !== file.id)
				entry.uses.push({
					record: file.id,
					...(file.reviewDepth === undefined
						? {}
						: { reviewDepth: file.reviewDepth }),
					rules: file.rules,
				});
		}
	return [...byForm]
		.filter(([, { identities }]) => identities.size > 1)
		.map(([form, { spellings, identities }]) => ({
			form,
			spellings: [...spellings].toSorted(),
			identities: [...identities.values()],
		}))
		.toSorted((a, b) => (a.form < b.form ? -1 : a.form > b.form ? 1 : 0));
}

/** Whether a split's identities differ in Family or Kind. */
export function splitsFamilyOrKind(split: IdentitySplit): boolean {
	return (
		new Set(
			split.identities.map(
				({ identity }) => `${identity.family}/${identity.kind}`,
			),
		).size > 1
	);
}

/**
 * One key on which a ruling lets identities differ. `values` limits the
 * values both identities may have (`null` for unset); `onlyWith` allows the
 * difference only when that other key differs too.
 */
interface Variation {
	key: IdentityKey;
	values?: readonly (string | null)[];
	onlyWith?: IdentityKey;
}

/**
 * A decided class of identity split: the ADRs and Rules it follows from,
 * the forms it covers (every form when absent; a split is covered when the
 * records spell its form one of these ways), the values both identities must
 * have, and the keys on which they may differ.
 */
export interface SplitRuling {
	split: string;
	adrs: readonly AdrId[];
	rules: readonly RuleId[];
	forms?: readonly string[];
	both?: Readonly<Record<IdentityKey, readonly (string | null)[]>>;
	varies: readonly Variation[];
}

/**
 * Forms an open grilling names, as the records spell them. Remove the entry
 * when the issue is ruled; a ruling that settles a class of split adds a
 * failing check for it.
 */
export interface OpenSplit {
	forms: readonly string[];
	issue: number;
	/** The issue's finding ids, where it numbers them. */
	findings?: readonly string[];
	question: string;
}

/** How a split is sorted, with the entries sorting it. */
export type SplitSort =
	| { sort: "Decided"; rulings: readonly SplitRuling[] }
	| { sort: "Open"; open: OpenSplit }
	| { sort: "Unexplained" };

/** Whether `forms` names one of the ways the records spell a split's form. */
function names(forms: readonly string[], split: IdentitySplit): boolean {
	return split.spellings.some((spelling) => forms.includes(spelling));
}

function applies(
	ruling: SplitRuling,
	split: IdentitySplit,
	a: LemmaIdentity,
	b: LemmaIdentity,
): boolean {
	if (ruling.forms && !names(ruling.forms, split)) return false;
	return Object.entries(ruling.both ?? {}).every(
		([key, values]) =>
			values.includes(identityValue(a, key)) &&
			values.includes(identityValue(b, key)),
	);
}

/**
 * Sorts a split: Open when an open grilling names its form, Decided when
 * every two of its identities differ only on keys that rulings applying to
 * both let vary, Unexplained otherwise.
 */
export function sortSplit(
	split: IdentitySplit,
	rulings: readonly SplitRuling[],
	open: readonly OpenSplit[],
): SplitSort {
	const named = open.find((entry) => names(entry.forms, split));
	if (named) return { sort: "Open", open: named };
	const used = new Set<SplitRuling>();
	const identities = split.identities.map(({ identity }) => identity);
	for (const [index, a] of identities.entries())
		for (const b of identities.slice(index + 1)) {
			const difference = identityDifference(a, b);
			const applying = rulings.filter((ruling) =>
				applies(ruling, split, a, b),
			);
			for (const key of difference) {
				const covering = applying.find((ruling) =>
					ruling.varies.some(
						(variation) =>
							variation.key === key &&
							(!variation.values ||
								(variation.values.includes(
									identityValue(a, key),
								) &&
									variation.values.includes(
										identityValue(b, key),
									))) &&
							(!variation.onlyWith ||
								difference.includes(variation.onlyWith)),
					),
				);
				if (!covering) return { sort: "Unexplained" };
				used.add(covering);
			}
		}
	return {
		sort: "Decided",
		rulings: rulings.filter((ruling) => used.has(ruling)),
	};
}
