import type * as Dumling from "dumling/types";
import { inflectionalBagOf } from "../../inflectional-bag.js";
import type { AuthoredMember } from "../member.js";
import { germanArticles } from "./determiner-paradigms.js";
import { member as subjectExpletiveEs } from "./members/lexeme/pronoun/personal/es-subject-expletive.js";

type ComponentKind = "DET" | "PRON";

/**
 * A grammatical component a Surface brings with it, as a dictionary entry:
 * a definite article or the subject expletive `es`.
 */
export type GrammaticalComponent = {
	readonly surface: Dumling.Surface<"de", "Lexeme", ComponentKind>;
	readonly reading: Dumling.Reading<"de", "Lexeme", ComponentKind>;
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

const cellKey = (
	grammaticalCase: string,
	number: string,
	gender: string | null,
): string => `${grammaticalCase}|${number}|${gender ?? ""}`;

let definiteArticleIndex: ReadonlyMap<string, AuthoredMember> | undefined;

function definiteArticlesByCell(): ReadonlyMap<string, AuthoredMember> {
	if (definiteArticleIndex !== undefined) return definiteArticleIndex;
	const index = new Map<string, AuthoredMember>();
	for (const member of germanArticles) {
		const { lemma } = member;
		if (!definiteArticleForms.has(lemma.canonicalForm)) continue;
		const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
		const key = cellKey(
			String(core.case),
			String(core.number),
			typeof core.gender === "string" ? core.gender : null,
		);
		if (!index.has(key)) index.set(key, member);
	}
	definiteArticleIndex = index;
	return index;
}

/** The reviewed definite article cell for a name's case, number and gender. */
function definiteArticleCell(cell: {
	readonly case: string;
	readonly number: string;
	readonly gender: string | null;
}) {
	return definiteArticlesByCell().get(
		cellKey(cell.case, cell.number, cell.gender),
	);
}

/** The Canonical Surface fields every component shares; its Lemma spells the rest. */
const canonical = {
	unitKind: "Surface",
	language: "de",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: null,
} as const;

/**
 * An authored DET or PRON member as a grammatical component: its Reading
 * and the Canonical Surface its Canonical Form spells, both copies, so a
 * stored entry never shares the inventory's objects. Throws for any other
 * member.
 */
export function authoredComponent(
	member: AuthoredMember,
): GrammaticalComponent {
	const lemma = structuredClone(member.lemma);
	const { emojiDescription } = member.reading;
	// Each branch narrows the Lemma to one route, so each literal type-checks.
	if (lemma.family === "Lexeme" && lemma.kind === "DET")
		return {
			surface: {
				...canonical,
				lemma,
				normalizedSurface: lemma.canonicalForm,
			},
			reading: { unitKind: "Reading", lemma, emojiDescription },
		};
	if (lemma.family === "Lexeme" && lemma.kind === "PRON")
		return {
			surface: {
				...canonical,
				lemma,
				normalizedSurface: lemma.canonicalForm,
			},
			reading: { unitKind: "Reading", lemma, emojiDescription },
		};
	throw new Error("A grammatical component is a DET or PRON Lexeme.");
}

/**
 * The grammatical component a Surface brings without a model: the definite
 * article of a name cited with one (die Schweiz) in a marked case, or the
 * subject expletive `es` of a verb that has one. A common noun's article is
 * attested evidence (system ADR 0040), not derived here. Throws when the
 * name's number is unmarked.
 */
export function deriveGrammaticalComponent(
	surface: Dumling.Surface,
): GrammaticalComponent | null {
	if (surface.language !== "de" || surface.lemma.family !== "Lexeme")
		return null;
	const bag = inflectionalBagOf(surface);
	if (surface.lemma.kind === "PROPN") {
		const core: Readonly<Record<string, unknown>> =
			surface.lemma.coreFeatures;
		if (core.article !== "Definite" || !bag?.case) return null;
		if (typeof bag.case !== "string")
			throw new Error("An article needs its name's one case.");
		if (typeof bag.number !== "string")
			throw new Error("An article needs its name's number.");
		const member = definiteArticleCell({
			case: bag.case,
			number: bag.number,
			gender:
				bag.number === "Plur"
					? null
					: typeof core.gender === "string"
						? core.gender
						: null,
		});
		if (!member) throw new Error("Missing reviewed definite article cell.");
		return authoredComponent(member);
	}
	return bag?.expletive === "Subject"
		? authoredComponent(subjectExpletiveEs)
		: null;
}
