import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import {
	type AuthoredMember,
	authoredMembers,
	subjectExpletiveEs,
} from "dumspec/inventories";

/**
 * Selections over dumspec's Authored Inventories that tf-demo's dictionary
 * and Notes read: the exact authored member of a Reading, the reviewed
 * Grammatical Alternatives of a PRON or DET cell (system ADR 0019), and the
 * grammatical components a Surface derives without a model (system ADR
 * 0040). Everything here is code over reviewed data, safe inside a
 * transaction.
 */

/** Deep value equality, with the same keys on both sides. */
function sameValue(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (
		!left ||
		!right ||
		typeof left !== "object" ||
		typeof right !== "object"
	)
		return false;
	const a = Object.entries(left);
	const b = Object.entries(right);
	return (
		a.length === b.length &&
		a.every(
			([key, value]) =>
				Object.hasOwn(right, key) &&
				sameValue(value, (right as Record<string, unknown>)[key]),
		)
	);
}

/** The authored member whose Reading is exactly this one, if any. */
export function authoredReading(reading: unknown) {
	return authoredMembers.find((member) => sameValue(member.reading, reading));
}

/** The authored article cell whose Reading is exactly this one, with its reviewed Knowledge. */
export function selectAuthoredArticle(reading: unknown) {
	return (
		authoredMembers.find(
			(member) =>
				member.lemma.kind === "DET" &&
				"pronType" in member.lemma.coreFeatures &&
				member.lemma.coreFeatures.pronType === "Art" &&
				sameValue(member.reading, reading),
		) ?? null
	);
}

type NavigableLemma =
	| Dumling.Lemma<"de", "Lexeme", "PRON">
	| Dumling.Lemma<"de", "Lexeme", "DET">;
type NavigableFeature =
	| keyof Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"]
	| keyof Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];

/** Whether a PRON or DET Lemma is a pillar's Paradigm Cell: it marks its cell in Core. */
function isParadigmCell(lemma: Dumling.Lemma): boolean {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return ["case", "number", "gender"].some(
		(coordinate) => (core[coordinate] ?? null) !== null,
	);
}

/**
 * Whether a cell marks a coordinate. Plural agreement has no gender, so a
 * plural cell's unmarked gender still counts as its gender.
 */
function marks(core: Readonly<Record<string, unknown>>, key: string): boolean {
	return (
		(core[key] ?? null) !== null ||
		(key === "gender" && core.number === "Plur")
	);
}

/**
 * Whether a singular cell with gender null serves the source's gender: its
 * form serves two genders alike (ihm, dem), and the source's gender has no
 * cell of its own there (system ADR 0044).
 */
function servesGender(
	source: Readonly<Record<string, unknown>>,
	candidate: Dumling.Lemma,
): boolean {
	const core: Readonly<Record<string, unknown>> = candidate.coreFeatures;
	if ((core.gender ?? null) !== null || core.number !== "Sing") return false;
	if ((source.gender ?? null) === null) return false;
	const own = { ...core, gender: source.gender };
	return !authoredMembers.some(
		(member) =>
			member.lemma.kind === candidate.kind &&
			sameValue(member.lemma.coreFeatures, own),
	);
}

/**
 * Other Paradigm Cells of a reviewed pillar PRON or DET (system ADR 0019):
 * cells of the same Kind that differ only in the varied Core Features. Both
 * ends must mark every varied feature, and a gender-null cell is reached
 * from each gender it serves. A stem Lemma (dieser, mein) has no other
 * cells, and a Lemma no inventory authors has no reviewed ones, so both
 * return none.
 */
export function selectGrammaticalAlternatives(input: {
	readonly source: NavigableLemma;
	readonly vary: readonly NavigableFeature[];
}): readonly Dumling.Reading<"de">[] {
	if (
		!authoredMembers.some((member) => sameValue(member.lemma, input.source))
	)
		return [];
	if (
		input.vary.some((key) => !Object.hasOwn(input.source.coreFeatures, key))
	)
		throw new Error("Unknown feature coordinate.");
	const sourceCore: Readonly<Record<string, unknown>> =
		input.source.coreFeatures;
	if (
		!isParadigmCell(input.source) ||
		input.vary.some((key) => !marks(sourceCore, key))
	)
		return [];
	const varied = new Set<string>(input.vary);
	return authoredMembers
		.filter(
			(member) =>
				member.lemma.kind === input.source.kind &&
				isParadigmCell(member.lemma) &&
				!sameValue(member.lemma, input.source) &&
				input.vary.every((key) =>
					marks(member.lemma.coreFeatures, key),
				) &&
				Object.entries(input.source.coreFeatures).every(
					([key, value]) =>
						varied.has(key) ||
						sameValue(
							value,
							(
								member.lemma.coreFeatures as Record<
									string,
									unknown
								>
							)[key],
						) ||
						(key === "gender" &&
							servesGender(sourceCore, member.lemma)),
				),
		)
		.map((member) => member.reading);
}

/** A grammatical component a Surface brings with it, as a dictionary entry. */
export type GrammaticalComponent = {
	readonly surface: Dumling.Surface<"de", "Lexeme">;
	readonly reading: Dumling.Reading<"de", "Lexeme">;
};

/** The der pillar's forms; the ein pillar's cells spell other words. */
const definiteArticleForms = new Set([
	"der",
	"die",
	"das",
	"dem",
	"den",
	"des",
]);

/** The reviewed definite article cell for a name's case, number and gender. */
function definiteArticleCell(cell: {
	readonly case: string;
	readonly number: string;
	readonly gender: string | null;
}) {
	return authoredMembers.find(({ lemma }) => {
		const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
		return (
			lemma.kind === "DET" &&
			core.pronType === "Art" &&
			definiteArticleForms.has(lemma.canonicalForm) &&
			core.case === cell.case &&
			core.number === cell.number &&
			(core.gender ?? null) === cell.gender
		);
	});
}

function componentSurface(
	lemma: Dumling.Lemma,
	normalizedSurface: string,
): Dumling.Surface<"de", "Lexeme"> {
	const parsed = parseUnit({
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: null,
	});
	if (
		!parsed.success ||
		parsed.chain.unitKind !== "Surface" ||
		parsed.chain.language !== "de" ||
		parsed.chain.family !== "Lexeme"
	)
		throw new Error("Expected a German Lexeme Surface.");
	return parsed.chain.value as Dumling.Surface<"de", "Lexeme">;
}

/**
 * An authored member as a grammatical component: its Reading and the
 * Canonical Surface spelled `spelled`, its Canonical Form by default.
 */
export function authoredComponent(
	member: AuthoredMember,
	spelled: string = member.lemma.canonicalForm,
): GrammaticalComponent {
	return {
		surface: componentSurface(structuredClone(member.lemma), spelled),
		reading: structuredClone(member.reading) as Dumling.Reading<
			"de",
			"Lexeme"
		>,
	};
}

/**
 * The grammatical component a Surface brings without a model: the definite
 * article of a name cited with one (die Schweiz) in a marked case, or the
 * subject expletive `es` of a verb that has one. A common noun's article is
 * attested evidence (system ADR 0040), not derived here.
 */
export function deriveGrammaticalComponent(
	surface: Dumling.Surface,
): GrammaticalComponent | null {
	if (surface.language !== "de" || surface.lemma.family !== "Lexeme")
		return null;
	const bag = (
		"inflectionalFeatures" in surface ? surface.inflectionalFeatures : null
	) as Readonly<Record<string, unknown>> | null;
	if (surface.lemma.kind === "PROPN") {
		const core = surface.lemma.coreFeatures as Readonly<
			Record<string, unknown>
		>;
		if (core.article !== "Definite" || !bag?.case) return null;
		if (typeof bag.number !== "string")
			throw new Error("An article needs its name's number.");
		const member = definiteArticleCell({
			case: String(bag.case),
			number: bag.number,
			gender:
				bag.number === "Plur"
					? null
					: ((core.gender as string | null | undefined) ?? null),
		});
		if (!member) throw new Error("Missing reviewed definite article cell.");
		return authoredComponent(member);
	}
	if (bag?.expletive !== "Subject") return null;
	const member = authoredMembers.find((candidate) =>
		sameValue(candidate.reading, subjectExpletiveEs.reading),
	);
	if (member?.lemma.kind !== "PRON")
		throw new Error("Missing reviewed nonreferential subject es Reading.");
	return authoredComponent(member, "es");
}
