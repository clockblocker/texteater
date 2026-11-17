/**
 * The routes the grouping reason of a unit implies (`codeRoutes`): a unit
 * that exists because a judge accepted a name, split adverb, correlator or
 * circumposition takes the route its Rule gives that unit, whatever Kind
 * the route Choice hears. The route Choice is still asked and its answers
 * still cached; routing only stops reading them for these units, so the
 * grouping and the route cannot disagree: [des, Schwäbischen, Meeres],
 * grouped as one name, is no NOUN Meer whose members hold Schwäbischen.
 *
 * A unit gets its fixed route only while it is exactly what its reason
 * built (a name with its articles, the two pieces of a split adverb, a
 * correlator's anchors). Once another link has joined it, it is some
 * other unit, and the route Choice decides.
 */
import { germanConjunctionLocutions } from "dumcorpus/inventories";
import { isArticle } from "./candidates.js";
import {
	anchoredUnits,
	plainCircumpositions,
	splitAdverbs,
	strandedAdverbs,
} from "./code-rules-words.js";
import { acceptedNames, type Nomination } from "./nomination.js";
import { groupKey } from "./partition.js";
import type { RouteKey } from "./routes.js";
import type { FixedRoute } from "./routing.js";

/** A route for each listed group, by its group key. */
const routesOf =
	(fixed: ReadonlyMap<string, RouteKey>): FixedRoute =>
	(group) =>
		fixed.get(groupKey(group));

/** The group key of a unit's pieces, in any order. */
const keyOf = (pieces: readonly number[]) =>
	groupKey([...pieces].sort((a, b) => a - b));

/**
 * The `name` rule's route (de/proper-noun-article, ADR 0039): a unit of
 * two or more pieces of one accepted multiword name, with nothing beside
 * them but articles, is one Lexeme PROPN whatever its length, its article
 * owned as a common noun owns one: [des, Schwäbischen, Meeres] is PROPN
 * Schwäbisches Meer, [die, Deutsche, Bank] PROPN Deutsche Bank. A name
 * read as a fixed expression is still a PROPN, never a Locution.
 */
export function nameRoutes(nomination: Nomination): FixedRoute {
	const names = acceptedNames(nomination.accepted).map(
		(name) => new Set(name),
	);
	const { pieces } = nomination.sentence;
	const article = (id: number) => {
		const piece = pieces[id - 1];
		return piece !== undefined && isArticle(piece);
	};
	return (group) =>
		names.some(
			(name) =>
				group.filter((id) => name.has(id)).length >= 2 &&
				group.every((id) => name.has(id) || article(id)),
		)
			? "Lexeme/PROPN"
			: undefined;
}

/**
 * The `split-adverb` rule's route (de/split-adverb-is-one-target): a unit
 * of exactly an accepted split adverb's two pieces is one Lexeme ADV, as
 * [Wo, hin] is wohin.
 */
export function splitAdverbRoutes(nomination: Nomination): FixedRoute {
	return routesOf(
		new Map(
			(splitAdverbs(nomination).closed ?? []).map((unit) => [
				keyOf(unit.pieces),
				"Lexeme/ADV",
			]),
		),
	);
}

/**
 * The `stranded-adverb` rule's route (de/pronominal-adverb-stands-alone):
 * the unit of a stranded preposition and the da, wo or hier before it is
 * one Lexeme ADV, as [Da, für] is dafür.
 */
export function strandedAdverbRoutes(nomination: Nomination): FixedRoute {
	return routesOf(
		new Map(
			(strandedAdverbs(nomination).closed ?? []).map((unit) => [
				keyOf(unit.pieces),
				"Lexeme/ADV",
			]),
		),
	);
}

/** The X-dass subordinators dumcorpus lists, in either spelling of dass. */
const dassConjunctions: ReadonlySet<string> = new Set(
	germanConjunctionLocutions.dass,
);

const zuInfinitives: ReadonlySet<string> = new Set(
	germanConjunctionLocutions.zuInfinitive,
);
const coordinatingCorrelators: ReadonlySet<string> = new Set([
	"entweder … oder",
	"weder … noch",
	"sowohl … als auch",
	"sowohl … wie auch",
	"nicht nur … sondern auch",
]);
const subordinatingCorrelators: ReadonlySet<string> = new Set([
	"je … desto",
	"je … umso",
	"je … je",
	"so … dass",
]);
const adverbialCorrelators: ReadonlySet<string> = new Set([
	"einerseits … andererseits",
	"teils … teils",
]);

/**
 * The Kind each anchored unit takes, by the name of the correlator or
 * conjunction it forms: de/correlator-anchors's CCONJ, SCONJ and ADV, the
 * zu-infinitive and X-dass conjunctions' Locution SCONJ, and so dass's
 * Lexeme SCONJ sodass (de/dass-conjunction). So and dass side by side
 * (`adjacent`) are sodass's spelling, whichever name proposed them: the
 * correlator so … dass is proposed for any two pieces so and dass. A name
 * no Rule gives a Kind (als ob, und zwar, kaum dass) is left to the route
 * Choice.
 */
function anchoredRoute(name: string, adjacent: boolean): RouteKey | undefined {
	const spelled = name.replace("daß", "dass");
	if (adjacent && (spelled === "so dass" || spelled === "so … dass"))
		return "Lexeme/SCONJ";
	if (
		dassConjunctions.has(spelled) ||
		zuInfinitives.has(spelled) ||
		subordinatingCorrelators.has(spelled)
	)
		return "Locution/SCONJ";
	if (coordinatingCorrelators.has(spelled)) return "Locution/CCONJ";
	if (adverbialCorrelators.has(spelled)) return "Locution/ADV";
	return undefined;
}

/**
 * The `anchors` rule's routes: a unit of exactly an accepted correlator's
 * or conjunction's anchors takes the Kind its Rule names
 * (`anchoredRoute`), and a unit of exactly an accepted circumposition's two
 * pieces that no zu-infinitive conjunction names is Locution ADP
 * (de/bracket-particle-or-circumposition): Von diesem Tag an is [Von, an]
 * ADP like von morgen an (#1162).
 */
export function anchorRoutes(nomination: Nomination): FixedRoute {
	const fixed = new Map<string, RouteKey>();
	for (const pair of plainCircumpositions(nomination))
		fixed.set(keyOf(pair), "Locution/ADP");
	const { pieces, segments } = nomination.sentence;
	const adjacent = (ids: readonly number[]) => {
		const [left, right] = ids.map((id) => pieces[id - 1]);
		return (
			ids.length === 2 &&
			left !== undefined &&
			right !== undefined &&
			segments
				.slice(left.segment + 1, right.segment)
				.every((segment) => segment.kind === "Whitespace")
		);
	};
	for (const unit of anchoredUnits(nomination)) {
		const route = anchoredRoute(unit.name, adjacent(unit.pieces));
		if (route) fixed.set(keyOf(unit.pieces), route);
	}
	return routesOf(fixed);
}
