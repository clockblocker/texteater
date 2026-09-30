/** Exact group support and routing shared by segmentation experiments. */
import { type Answers, choice, noul, noulOf } from "../lab/jev.js";
import {
	type ArmContext,
	joinRefs,
	judgeState,
	type RouteJudgment,
	readRoutes,
	routeQuestions,
} from "./arm.js";
import { closedClassQuestion, closedClassRoute } from "./closed-class.js";
import { identityCandidates } from "./identity.js";
import { groupKey, type Partition } from "./partition.js";
import { allRoutes, routeCriteria } from "./routes.js";
import { markedText, type Sentence } from "./sentence.js";

export type UnitGroupJudgments = {
	readonly routes: ReadonlyMap<string, RouteJudgment>;
	readonly closedRoutes: ReadonlyMap<string, RouteJudgment>;
	readonly support: readonly {
		readonly group: readonly number[];
		readonly probability: number;
	}[];
	/** Selected authored candidate groups, before policy acceptance and cell refinement. */
	readonly identityHints: readonly {
		readonly sourceSegment: number;
		readonly candidateGroup: string;
		readonly share: number;
		readonly confidence: number;
	}[];
	readonly answers: Answers;
	/** Inventory coverage and disagreement are diagnostics, never proof of Family. */
	readonly inventoryDecisions: readonly {
		readonly group: readonly number[];
		readonly source: "identity" | "closed";
		readonly openRoute: RouteJudgment["choice"];
		readonly proposedRoute: RouteJudgment["choice"];
		readonly applied: boolean;
	}[];
};

const supportId = (group: readonly number[]) => `support_${group.join("_")}`;
const closedId = (piece: number) => `ownership_cc_${piece}`;

/** Callers exclude uncertain source members and apply their own assembly/acceptance policy. */
export async function judgeUnitGroups(
	sentence: Sentence,
	groups: Partition,
	context: ArmContext,
	stage = "ownership-final",
): Promise<UnitGroupJudgments> {
	const routeGuide = context.options.routeguide;
	const finalContext =
		routeGuide === undefined
			? context
			: {
					...context,
					options: { ...context.options, guide: routeGuide },
				};
	const finalState = judgeState(sentence, finalContext);
	// Authored candidates describe the recovered word, while every question
	// still names the source letters and their original piece coordinate.
	const identitySentence = {
		...sentence,
		pieces: sentence.pieces.map((piece) => ({
			...piece,
			text: piece.surface,
		})),
	};
	const sourceRef = (piece: (typeof sentence.pieces)[number]) =>
		finalState.ref(sentence.pieces[piece.id - 1] ?? piece);
	const finalQuestions = routeQuestions(
		identitySentence,
		groups,
		sourceRef,
		context,
	);
	const closed = context.options.closed === "1";
	for (const group of groups) {
		const routeId = `r_${group.join("_")}`;
		if (group.length === 1 && context.options.singletonRoutes === "all")
			finalQuestions[routeId] = choice(
				`In \`sentence\`, the attested member ${joinRefs(sentence, finalState.ref, group)} forms one biggest unit. Which route does that whole unit take? A single member may attest a Partial Locution or Saying when other fixed material is genuinely missing, shared, or replaced; an abbreviation may also stand for a whole Locution. Judge the whole unit in context, including that possibility.`,
				routeCriteria(allRoutes, context.options.routes !== "state"),
			);
		const routeQuestion = finalQuestions[routeId];
		if (
			routeQuestion?.type !== "choice" ||
			routeQuestion.instructions === undefined
		)
			throw Error(`Missing route question ${routeId}`);
		finalQuestions[routeId] = choice(routeQuestion.instructions, {
			...routeQuestion.criteria,
			Unresolved:
				"No route is defensible for this unit: unintelligible text, a nonce word with no plausible lexical analysis, or material broken off without a recoverable whole",
		});
		finalQuestions[supportId(group)] = noul(
			`In \`sentence\`, are all and only the marked pieces in \`groups.g${group.join("_")}\` the attested members of one biggest unit? Every member present in this sentence must be marked, and every marked piece must belong to that unit. A fragment missing present members, extra free words, or several separate units is false. Intervening free words need not be marked. Material genuinely elided, shared with another unit, or replaced in a licensed Modification does not make its remaining attested members incomplete.`,
			{
				true: "Exactly one biggest unit's complete attested membership",
				false: "Missing present members, extra members, several units, or no defensible unit",
			},
		);
		const [only] = group;
		if (closed && group.length === 1 && only !== undefined) {
			const piece = sentence.pieces[only - 1];
			const question = piece && closedClassQuestion(piece);
			if (piece && question)
				finalQuestions[closedId(only)] = choice(
					question.instructions(finalState.ref(piece)),
					{ ...question.criteria },
				);
		}
	}
	const finalAnswers: Answers = await context.jev.ask({
		stage,
		state: {
			...finalState.state,
			groups: Object.fromEntries(
				groups.map((group) => [
					`g${group.join("_")}`,
					markedText(sentence, group),
				]),
			),
		},
		questions: finalQuestions,
		repetition: context.repetition,
		calls: context.calls,
	});
	const read = readRoutes(identitySentence, groups, finalAnswers);
	const routes = new Map(read.open);
	const inventoryDecisions: UnitGroupJudgments["inventoryDecisions"][number][] = [];
	for (const [key, inferred] of read.identity) {
		const open = read.open.get(key);
		if (!open) continue;
		// A closed identity names a word only after its independent route has
		// selected a standalone Lexeme. It cannot overturn a partial expression,
		// quoted foreign word, or abstention merely because its letters match.
		const applied =
			open.choice.startsWith("Lexeme/") &&
			(inferred.source !== "identity" ||
				open.choice === "Lexeme/DET" ||
				open.choice === "Lexeme/PRON" ||
				open.choice === inferred.choice);
		if (applied) routes.set(key, inferred);
		if (inferred.source === "identity")
			inventoryDecisions.push({
				group: inferred.group,
				source: "identity",
				openRoute: open.choice,
				proposedRoute: inferred.choice,
				applied,
			});
	}
	const identityHints = groups.flatMap((group) => {
		const [only] = group;
		if (group.length !== 1 || only === undefined) return [];
		const piece = sentence.pieces[only - 1];
		const answer = finalAnswers[`i_${only}`];
		if (
			!piece ||
			answer?.type !== "choice" ||
			!/^c\d+$/u.test(answer.choice)
		)
			return [];
		const candidate = identityCandidates(piece.surface)[
			Number(answer.choice.slice(1))
		];
		return candidate
			? [
					{
						sourceSegment: piece.segment,
						candidateGroup: candidate.key,
						share: answer.probabilities[answer.choice] ?? 0,
						confidence: answer.confidence,
					},
				]
			: [];
	});
	const support = groups.map((group) => ({
		group,
		probability: noulOf(finalAnswers, supportId(group)),
	}));
	const closedRoutes = new Map<string, RouteJudgment>();
	if (closed)
		for (const group of groups) {
			const [only] = group;
			if (group.length !== 1 || only === undefined) continue;
			const piece = sentence.pieces[only - 1];
			if (!piece) continue;
			const answer = finalAnswers[closedId(only)];
			const chosen = closedClassRoute(
				piece,
				answer?.type === "choice" ? answer.choice : undefined,
			);
			if (chosen) {
				const open = read.open.get(groupKey(group));
				const applied = open?.choice.startsWith("Lexeme/") ?? false;
				inventoryDecisions.push({
					group,
					source: "closed",
					openRoute: open?.choice ?? "Unresolved",
					proposedRoute: chosen,
					applied,
				});
				if (applied) closedRoutes.set(groupKey(group), {
					group,
					choice: chosen,
					confidence:
						answer?.type === "choice" ? answer.confidence : 1,
					share:
						answer?.type === "choice"
							? (answer.probabilities[answer.choice] ?? 0)
							: 1,
					source: "identity",
				});
			}
		}
	return {
		routes,
		closedRoutes,
		support,
		identityHints,
		answers: finalAnswers,
		inventoryDecisions,
	};
}
