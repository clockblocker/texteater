/**
 * What every lab arm shares: its contract, the judge state it builds from a
 * Sentence, and the route stage that gives each unit of a partition its
 * route, with closed-class identity asked beside it.
 */
import type { EntryType, Questions } from "promptsmith/typesafe";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import {
	type Answers,
	type CallRecord,
	choice,
	choiceOf,
	type Jev,
	noul,
} from "../lab/jev.js";
import type { Luna } from "../lab/luna.js";
import { demonstrations, ruleStatements, unitGuide } from "./guide.js";
import { identityCandidates } from "./identity.js";
import { argmax, groupKey, type Partition } from "./partition.js";
import {
	allRoutes,
	type RouteKey,
	routeCriteria,
	routeDescriptions,
	singletonRoutes,
} from "./routes.js";
import {
	type Piece,
	pieceTable,
	type Sentence,
	taggedText,
} from "./sentence.js";

export type ArmOptions = Readonly<Record<string, string>>;

export type ArmContext = {
	readonly jev: Jev;
	readonly luna?: Luna;
	readonly repetition: number;
	readonly calls: CallRecord[];
	readonly options: ArmOptions;
	/** The gold units, handed only to oracle arms. */
	readonly oracle?: SegmentInUnitsOutput;
	/** Other sentences of the set, for the state-noise limit test. */
	readonly noise?: readonly string[];
};

/** One route answer, kept for calibration. */
export type RouteJudgment = {
	readonly group: readonly number[];
	readonly choice: RouteKey;
	readonly confidence: number;
	readonly share: number;
	readonly source: "open" | "identity";
};

/** One membership probability between two pieces, kept for calibration. */
export type LinkJudgment = {
	readonly left: number;
	readonly right: number;
	readonly probability: number;
};

export type ArmResult = {
	/** One output per assembly policy, all from the same answers. */
	readonly outputs: Readonly<Record<string, SegmentInUnitsOutput>>;
	/** The policy the arm's headline numbers use. */
	readonly primary: string;
	readonly routes?: readonly RouteJudgment[];
	readonly links?: readonly LinkJudgment[];
};

export type Arm = {
	readonly id: string;
	readonly summary: string;
	readonly needsOracle?: boolean;
	readonly usesLuna?: boolean;
	readonly run: (
		input: SegmentInUnitsInput,
		context: ArmContext,
	) => Promise<ArmResult>;
};

export const option = (
	options: ArmOptions,
	key: string,
	fallback: string,
): string => options[key] ?? fallback;

export const numberOption = (
	options: ArmOptions,
	key: string,
	fallback: number,
): number => {
	const value = options[key];
	return value === undefined ? fallback : Number(value);
};

/** How questions name a piece, matching the state's rendering. */
export type Reference = (piece: Piece) => string;

/**
 * The judge state for a Sentence. `render=list` (default) gives the plain
 * sentence and a `pieces` table questions reference by path;
 * `render=tagged` tags each piece inline. `guide` is `guide` (default),
 * `none`, `rules` (every Rule statement) or `rules+noise` (and 30 unrelated
 * sentences). `routes=state` moves the route descriptions into state.
 */
export function judgeState(
	sentence: Sentence,
	context: Pick<ArmContext, "options" | "noise">,
): { readonly state: Record<string, EntryType>; readonly ref: Reference } {
	const render = option(context.options, "render", "list");
	const guide = option(context.options, "guide", "guide");
	const state: Record<string, EntryType> =
		render === "tagged"
			? { sentence: taggedText(sentence) }
			: { sentence: sentence.text, pieces: pieceTable(sentence) };
	if (
		guide === "guide" ||
		guide === "demos" ||
		guide === "rules" ||
		guide === "rules+noise"
	)
		state.units = unitGuide;
	if (guide === "demos")
		state.examples = demonstrations.map(({ sentence: text, units }) => ({
			sentence: text,
			units: [...units],
		}));
	if (guide === "rules" || guide === "rules+noise")
		state.rules = ruleStatements();
	if (guide === "rules+noise")
		state.unrelated_sentences = [...(context.noise ?? [])];
	if (option(context.options, "routes", "question") === "state")
		state.routes = { ...routeDescriptions };
	const ref: Reference =
		render === "tagged"
			? (piece) => `"${piece.text}" [${piece.id}]`
			: (piece) => `\`pieces.p${piece.id}\` ("${piece.text}")`;
	return { state, ref };
}

export const joinRefs = (
	sentence: Sentence,
	ref: Reference,
	group: readonly number[],
): string =>
	group
		.map((id) => {
			const piece = sentence.pieces[id - 1];
			if (!piece) throw Error(`No piece p${id}`);
			return ref(piece);
		})
		.join(", ");

const routeId = (group: readonly number[]) => `r_${group.join("_")}`;
const identityId = (id: number) => `i_${id}`;
const adjectiveTestId = (id: number) => `ta_${id}`;
const modifierTestId = (id: number) => `tm_${id}`;

/**
 * Route questions for each group (restricted to Lexeme and Foreign routes
 * for a one-piece group), and identity questions for each one-piece group
 * whose spelling realizes authored DET or PRON members.
 */
export function routeQuestions(
	sentence: Sentence,
	groups: Partition,
	ref: Reference,
	context: Pick<ArmContext, "options">,
): Questions {
	const described = option(context.options, "routes", "question") !== "state";
	const questions: Questions = {};
	for (const group of groups) {
		const single = group.length === 1;
		const keys = single ? singletonRoutes : allRoutes;
		questions[routeId(group)] = choice(
			single
				? `In \`sentence\`, the word ${joinRefs(sentence, ref, group)} is a unit on its own. Which route does it take?`
				: `In \`sentence\`, the pieces ${joinRefs(sentence, ref, group)} together form one unit. Which route does that whole unit take?`,
			routeCriteria(keys, described),
		);
		const [only] = group;
		if (single && only !== undefined) {
			const piece = sentence.pieces[only - 1];
			const candidates = piece ? identityCandidates(piece.text) : [];
			if (piece && option(context.options, "tests", "0") === "1") {
				// Rule de/adjective-stays-adj: a word that can inflect as an
				// attributive adjective is an ADJ, also used adverbially.
				if (/^\p{Ll}/u.test(piece.text) && candidates.length === 0)
					questions[adjectiveTestId(only)] = noul(
						`Can the word ${ref(piece)}, in the form of its dictionary entry, also stand before a noun as an attributive adjective with an inflection ending (laut: ein lauter Ruf; schnell: der schnelle Hund)?`,
					);
				// Rule de/pron-or-det-by-use: DET modifies a noun, PRON stands for one.
				const kinds = new Set(
					candidates.map((candidate) => candidate.kind),
				);
				if (kinds.has("DET") && kinds.has("PRON"))
					questions[modifierTestId(only)] = noul(
						`In \`sentence\`, does ${ref(piece)} directly modify a noun that follows it (dieser Mann, jeglicher Zweifel), rather than standing for a whole noun phrase on its own?`,
					);
			}
			if (piece && candidates.length > 0)
				questions[identityId(only)] = choice(
					`In \`sentence\`, which word is ${ref(piece)}?`,
					{
						...Object.fromEntries(
							candidates.map((candidate, position) => [
								`c${position}`,
								candidate.description,
							]),
						),
						Other: "None of these: a different word or use",
					},
				);
		}
	}
	return questions;
}

/**
 * Reads the route answers: `open` takes the route Choice; `identity` lets a
 * winning non-article identity candidate imply the route.
 */
export function readRoutes(
	sentence: Sentence,
	groups: Partition,
	answers: Answers,
): {
	readonly open: Map<string, RouteJudgment>;
	readonly identity: Map<string, RouteJudgment>;
	/** Each group's full route distribution, for policies that restrict it. */
	readonly distributions: Map<string, Readonly<Record<string, number>>>;
} {
	const open = new Map<string, RouteJudgment>();
	const identity = new Map<string, RouteJudgment>();
	const distributions = new Map<string, Readonly<Record<string, number>>>();
	for (const group of groups) {
		const answer = choiceOf(answers, routeId(group));
		const top = argmax(answer.probabilities);
		const judged: RouteJudgment = {
			group,
			choice: answer.choice,
			confidence: answer.confidence,
			share: top.share,
			source: "open",
		};
		open.set(groupKey(group), judged);
		identity.set(groupKey(group), judged);
		distributions.set(groupKey(group), answer.probabilities);
		const [only] = group;
		const id = only === undefined ? undefined : identityId(only);
		if (group.length !== 1 || id === undefined || !(id in answers))
			continue;
		const piece = sentence.pieces[(only ?? 0) - 1];
		const candidates = piece ? identityCandidates(piece.text) : [];
		const picked = choiceOf(answers, id);
		const position = Number(picked.choice.slice(1));
		const candidate =
			picked.choice === "Other" ? undefined : candidates[position];
		if (candidate && candidate.pronType !== "Art")
			identity.set(groupKey(group), {
				group,
				choice: `Lexeme/${candidate.kind}`,
				confidence: picked.confidence,
				share: argmax(picked.probabilities).share,
				source: "identity",
			});
	}
	// Rule tests, when asked, override the Kind between ADV and ADJ and
	// between DET and PRON.
	for (const group of groups) {
		const [only] = group;
		if (group.length !== 1 || only === undefined) continue;
		const current = identity.get(groupKey(group));
		if (!current) continue;
		const adjective = answers[adjectiveTestId(only)];
		if (
			adjective?.type === "noul" &&
			current.choice === "Lexeme/ADV" &&
			adjective.noul >= 0.5
		)
			identity.set(groupKey(group), { ...current, choice: "Lexeme/ADJ" });
		const modifier = answers[modifierTestId(only)];
		if (
			modifier?.type === "noul" &&
			(current.choice === "Lexeme/DET" ||
				current.choice === "Lexeme/PRON")
		)
			identity.set(groupKey(group), {
				...current,
				choice: modifier.noul >= 0.5 ? "Lexeme/DET" : "Lexeme/PRON",
			});
	}
	return { open, identity, distributions };
}

/** Asks the route stage for every group of every partition, deduplicated. */
export async function judgeRoutes(
	sentence: Sentence,
	partitions: readonly Partition[],
	context: ArmContext,
	stage = "route",
): Promise<ReturnType<typeof readRoutes>> {
	// `routeguide` gives the route stage its own guide level (`rules`), so
	// only this request pays for the full Rule statements.
	const routeGuide = context.options.routeguide;
	const { state, ref } = judgeState(
		sentence,
		routeGuide === undefined
			? context
			: {
					...context,
					options: { ...context.options, guide: routeGuide },
				},
	);
	const unique = new Map<string, readonly number[]>();
	for (const partition of partitions)
		for (const group of partition) unique.set(groupKey(group), group);
	const groups = [...unique.values()];
	const answers = await context.jev.ask({
		stage,
		state,
		questions: routeQuestions(sentence, groups, ref, context),
		repetition: context.repetition,
		calls: context.calls,
	});
	return readRoutes(sentence, groups, answers);
}

export const routeFrom =
	(judged: ReadonlyMap<string, RouteJudgment>) =>
	(group: readonly number[]): RouteKey =>
		judged.get(groupKey(group))?.choice ?? "Unresolved";
