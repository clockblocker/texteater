import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../member.js";
import {
	type AuthoredRealization,
	authoredRealizations,
} from "./realizations.js";
import type { SurfaceCell, SurfaceSpelling } from "./stem-lemma.js";

/**
 * One generated Surface Syncretism of a stem PRON Lemma (system ADR 0046):
 * its Lemma's spelling that marks two or more cells of one case and number,
 * which differ in gender alone. `cells` are its units' cells, in gender
 * order, and `spelled` the spelling without letter case.
 */
export type StemSyncretism = {
	readonly member: AuthoredMember;
	readonly spelled: string;
	readonly spelling: SurfaceSpelling;
	readonly cells: readonly [SurfaceCell, SurfaceCell, ...SurfaceCell[]];
};

const json = (value: unknown) => JSON.stringify(value ?? null);
/** A spelling without letter case, as Dumling folds German. */
const fold = (text: string) => text.toLocaleLowerCase("de");
/**
 * A Lemma's identity (system ADR 0002) computed here, so the inventories
 * entry loads no Zod (ADR 0025): route, folded Canonical Form and the set
 * Core Features.
 */
function identityOf(lemma: Dumling.Lemma): string {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return json([
		lemma.family,
		lemma.kind,
		fold(lemma.canonicalForm),
		Object.entries(core)
			.filter(([, value]) => value !== null && value !== undefined)
			.toSorted(([left], [right]) => (left < right ? -1 : 1)),
	]);
}
/**
 * The cell a stem PRON realization marks, or undefined for any other
 * realization. A stem pronoun's spelling marks a whole cell of its table.
 */
function stemPronounCell(
	realization: AuthoredRealization,
): SurfaceCell | undefined {
	const { lemma } = realization.member;
	if (lemma.family !== "Lexeme" || lemma.kind !== "PRON") return undefined;
	const {
		case: grammaticalCase,
		number,
		gender,
	} = realization.inflection ?? {};
	if (
		grammaticalCase === undefined ||
		number === undefined ||
		gender === undefined
	)
		return undefined;
	return { case: grammaticalCase, number, gender };
}
/** A stem PRON realization with the cell it marks. */
type StemPronounRealization = {
	readonly realization: AuthoredRealization;
	readonly cell: SurfaceCell;
};

/** What a Surface Syncretism's units share: Lemma, spelling, case and number. */
function groupKey(
	lemma: Dumling.Lemma,
	spelled: string,
	spelling: SurfaceSpelling | undefined,
	cell: { readonly case?: unknown; readonly number?: unknown },
): string {
	return json([
		identityOf(lemma),
		fold(spelled),
		spelling ?? { kind: "Canonical" },
		cell.case ?? null,
		cell.number ?? null,
	]);
}

function generate(): Map<string, StemSyncretism> {
	const groups = new Map<string, StemPronounRealization[]>();
	for (const realization of authoredRealizations) {
		const cell = stemPronounCell(realization);
		if (!cell) continue;
		const key = groupKey(
			realization.member.lemma,
			realization.spelled,
			realization.spelling,
			cell,
		);
		groups.set(key, [...(groups.get(key) ?? []), { realization, cell }]);
	}
	const generated = new Map<string, StemSyncretism>();
	for (const [key, group] of groups) {
		const cells = [
			...new Map(
				group.map(({ cell }) => [cell.gender, cell] as const),
			).values(),
		].toSorted((left, right) =>
			String(left.gender) < String(right.gender) ? -1 : 1,
		);
		const [first, second, ...rest] = cells;
		const [entry] = group;
		if (!first || !second || !entry) continue;
		const { realization } = entry;
		generated.set(key, {
			member: realization.member,
			spelled: fold(realization.spelled),
			spelling: realization.spelling ?? { kind: "Canonical" },
			cells: [first, second, ...rest],
		});
	}
	return generated;
}

/**
 * Every generated Surface Syncretism of a German stem PRON (system ADR
 * 0046): `jedem`, the dative of jeder in the Masc or the Neut, `keinem`,
 * `manchem`, genitive `keines`. A stem's Syncretism leaves gender alone
 * open: its Surfaces that share a spelling, case and number and differ in
 * gender get one. Nobody authors one; the stem spellings of the Authored
 * Inventory are its source.
 */
export const stemSyncretisms: ReadonlyMap<string, StemSyncretism> = generate();

/**
 * Stem PRON Lemmas whose standalone neuter singular is a fixed use with its
 * own gender (Rule de/standalone-alles-means-everything): alles and allem
 * mean "everything", whatever the sentence names.
 */
const fixedNeuterSingular = new Set(["alle"]);

/**
 * Whether an open referent may attest this Syncretism (Rule
 * de/open-referent). The Syncretisms of alle's singular never are: its
 * standalone neuter singular means "everything" and attests its Neut cell
 * (Rule de/standalone-alles-means-everything).
 */
export function referentCanLeaveOpen(syncretism: StemSyncretism): boolean {
	const { lemma } = syncretism.member;
	return !(
		lemma.family === "Lexeme" &&
		lemma.kind === "PRON" &&
		fixedNeuterSingular.has(fold(lemma.canonicalForm)) &&
		syncretism.cells.some(
			(cell) => cell.number === "Sing" && cell.gender === "Neut",
		)
	);
}

/**
 * The generated Surface Syncretism a stem PRON Surface would be, by its
 * Lemma, its form without letter case, its spelling and the case and number
 * it marks, or undefined when the inventory generates none.
 */
export function stemSyncretismFor(
	surface: Dumling.Surface,
): StemSyncretism | undefined {
	const bag: Readonly<Record<string, unknown>> | null =
		"inflectionalFeatures" in surface ? surface.inflectionalFeatures : null;
	if (!bag) return undefined;
	return stemSyncretisms.get(
		groupKey(
			surface.lemma,
			surface.normalizedSurface,
			surface.spelling,
			bag,
		),
	);
}
