/**
 * What an open-route click reports once jev has judged it (#1326): the
 * first request's answers as the Attestation will hold them, before the
 * headword is written. The report runs beside the rest of the click, which
 * waits for it before it returns.
 */
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import type * as Scope from "effect/Scope";
import type { JudgedGrammar, ResolveGrammarInput } from "../../types.js";
import type { Target } from "../target.js";
import type { FirstRead } from "./first-request.js";

/** The judged part of a click: its route and jev's answers, with what the headword may still change. */
function judgedGrammar(target: Target, first: FirstRead): JudgedGrammar {
	const nominal = first.block === "nominal" ? first : undefined;
	const pending: JudgedGrammar["pending"] = nominal?.noun
		? ["gender", "case"]
		: nominal && nominal.openCases.length > 1
			? ["case"]
			: [];
	return {
		route: target.route,
		coreFeatures: { ...first.core, ...first.tailCore },
		...(first.inflection === undefined
			? {}
			: { inflectionalFeatures: first.inflection }),
		surfaceFeatures: first.surfaceFeatures,
		spelling: first.spelling,
		members: target.members.map((member, at) => ({
			segment: member.segment,
			orthography: first.orthographies[at] ?? "Standard",
		})),
		realizationCoverage: first.coverage,
		pending,
	};
}

/**
 * Starts the host's report of the judged click, if it asked for one, and
 * returns what awaits it: the click's value once the report has settled.
 */
export const reportJudged = Effect.fnUntraced(function* (
	onJudged: ResolveGrammarInput["onJudged"],
	target: Target,
	first: FirstRead,
): Effect.fn.Return<<A>(value: A) => Effect.Effect<A>, never, Scope.Scope> {
	if (!onJudged) return Effect.succeed;
	const report = yield* Effect.forkScoped(
		onJudged(judgedGrammar(target, first)),
		{ startImmediately: true },
	);
	return (value) => Effect.as(Fiber.join(report), value);
});
