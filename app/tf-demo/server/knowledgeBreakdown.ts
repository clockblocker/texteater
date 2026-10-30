import { isRecord } from "common-utils";
import { authoredFor, closedRoute } from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type {
	KnowledgeFailure,
	KnowledgeProduction,
} from "./knowledgeProduction";

/**
 * A Reading's Breakdown in a Knowledge run (ADR 0050, ADR 0051, Dumgen ADR
 * 0007). The host asks Knowledge for the Source first, inside the run's
 * `knowledge.produce`. A Reading with a Source runs neither segmenter, and
 * one whose `source` failed or is Unresolved holds both. A Source that
 * publication drops for pointing back (#1279) counts as none. Any other runs
 * `segment.inConstituents`, and a single-word Lexeme it finds none for is a
 * bottom word, which `segment.inMorphemes` splits. Each piece links to a
 * Unit Shadow, so nothing is generated for a part the learner hasn't met
 * (D20). The Breakdown stays outside the coverage request, as the Source
 * does: a failure leaves the Reading Partial, and its retry asks again.
 */

/** The Families whose Readings have a Breakdown; a Morpheme or Foreign one has none. */
const BREAKDOWN_FAMILIES: ReadonlySet<string> = new Set([
	"Lexeme",
	"Locution",
	"Saying",
]);

/**
 * Whether one Knowledge run asks for the Reading's Breakdown: a base run of
 * a Lexeme, Locution or Saying that stores neither a Breakdown nor a
 * Source. An authored or Closed Route member carries authored Breakdowns,
 * so neither segmenter runs on it (ADR 0021).
 */
export function asksBreakdown(
	reading: { readonly lemma: Dumling.Lemma<"de"> },
	options: { readonly topUpOnly: boolean; readonly knowledge: unknown },
): boolean {
	const { lemma } = reading;
	if (options.topUpOnly || !BREAKDOWN_FAMILIES.has(lemma.family))
		return false;
	if (closedRoute(lemma) || authoredFor(lemma).length > 0) return false;
	const stored = isRecord(options.knowledge) ? options.knowledge : {};
	if (stored.source !== undefined) return false;
	const breakdown = isRecord(stored.breakdown) ? stored.breakdown : {};
	return (
		breakdown.constituents === undefined &&
		breakdown.morphemes === undefined
	);
}

/** The definition a Reading already stores, for a retried Breakdown (ADR 0050). */
export function storedDefinitionOf(knowledge: unknown): {
	readonly storedDefinition?: string;
} {
	const definition = isRecord(knowledge) ? knowledge.definition : undefined;
	return typeof definition === "string" && definition.length > 0
		? { storedDefinition: definition }
		: {};
}

/**
 * What `knowledge.produce` answered for the Source decides whether the
 * segmenters run. A Source that publication drops for pointing back counts
 * as none (#1279), so `pointsBack` is asked about the produced one.
 */
export function segmentsAfterSource<E, R>(
	production: Pick<KnowledgeProduction, "changes" | "failures">,
	pointsBack: (
		change: KnowledgeProduction["changes"][number],
	) => Effect.Effect<boolean, E, R>,
): Effect.Effect<boolean, E, R> {
	if (production.failures.some(({ aspect }) => aspect === "source"))
		return Effect.succeed(false);
	const source = production.changes.find(
		(change) => change.aspect === "source" && change.kind !== "Retract",
	);
	return source ? pointsBack(source) : Effect.succeed(true);
}

/** One produced piece: shown letters and, unless filler, a Unit Shadow. */
type ProducedPiece = {
	readonly letters: string;
	readonly target?: Dumrel.UnitShadow;
};

/** A model failure as Dumgen's operations report it. */
type ModelFailure = {
	readonly _tag: "ProviderFailure" | "InvalidModelOutput";
	readonly message: string;
};

/** The two segmenters a run reaches, Dumgen's in production and fakes in tests. */
export type Segmenters<R> = {
	readonly inConstituents: (input: {
		readonly reading: Dumling.Reading<"de">;
		readonly sentence?: string;
		readonly definition?: string;
	}) => Effect.Effect<
		| {
				readonly kind: "Constituents";
				readonly pieces: readonly ProducedPiece[];
		  }
		| { readonly kind: "NoConstituents" },
		ModelFailure,
		R
	>;
	readonly inMorphemes: (input: {
		readonly reading: Dumling.Reading<"de">;
		readonly sentence?: string;
		readonly definition?: string;
	}) => Effect.Effect<readonly ProducedPiece[], ModelFailure, R>;
};

type BreakdownPart = "constituents" | "morphemes";
type Produced = Pick<KnowledgeProduction, "changes" | "failures">;

function failed(
	part: BreakdownPart,
	code: KnowledgeFailure["code"],
	message: string,
): Produced {
	return {
		changes: [],
		failures: [{ aspect: "breakdown", leaf: part, code, message }],
	};
}

/**
 * One half of the Breakdown as a change, once Dumrel accepts it for the
 * Reading: its letters spell the Canonical Form back and its targets fit
 * (ADR 0050). A rejected split is an unusable answer, so the rest of the
 * run still publishes.
 */
function contributed(
	reading: Dumling.Reading<"de">,
	part: BreakdownPart,
	pieces: readonly ProducedPiece[],
): Produced {
	const value = pieces.map(({ letters, target }) =>
		target ? { letters, target } : { letters },
	);
	const checked = parseReadingKnowledge({
		source: reading,
		knowledge: { breakdown: { [part]: value } },
	});
	if (!checked.success)
		return failed(part, "InvalidModelOutput", checked.error.message);
	return {
		changes: [
			{ kind: "Contribute", aspect: "breakdown", part, value },
		] as unknown as KnowledgeProduction["changes"],
		failures: [],
	};
}

/** A bottom word's morphemes are split only on a single-word Lexeme. */
const isSingleWordLexeme = (lemma: Dumling.Lemma<"de">) =>
	lemma.family === "Lexeme" && !/\s/u.test(lemma.canonicalForm);

/**
 * The Breakdown changes and failures for a Reading the run found no Source
 * for. A failed call is a failure of its part, never the run's error.
 */
export function produceBreakdown<R>(
	segmenters: Segmenters<R>,
	input: {
		readonly reading: Dumling.Reading<"de">;
		readonly sentence?: string;
		readonly definition?: string;
	},
): Effect.Effect<Produced, never, R> {
	const asFailure = (part: BreakdownPart) => (error: ModelFailure) =>
		Effect.succeed(failed(part, error._tag, error.message));
	return segmenters.inConstituents(input).pipe(
		Effect.flatMap(
			(constituents): Effect.Effect<Produced, ModelFailure, R> => {
				if (constituents.kind === "Constituents")
					return Effect.succeed(
						contributed(
							input.reading,
							"constituents",
							constituents.pieces,
						),
					);
				if (!isSingleWordLexeme(input.reading.lemma))
					return Effect.succeed({ changes: [], failures: [] });
				return segmenters.inMorphemes(input).pipe(
					Effect.map((pieces) =>
						contributed(input.reading, "morphemes", pieces),
					),
					Effect.catch(asFailure("morphemes")),
				);
			},
		),
		Effect.catch(asFailure("constituents")),
	);
}

/**
 * The definition the segmenters read: the one this run produced, which
 * `knowledge.produce` finished before they run, else the stored one, as on
 * a retry (ADR 0050).
 */
export function breakdownDefinition(
	production: Pick<KnowledgeProduction, "changes">,
	stored: string | undefined,
): string | undefined {
	const produced = production.changes.find(
		(change) => change.aspect === "definition" && change.kind !== "Retract",
	);
	const value = produced && "value" in produced ? produced.value : undefined;
	return typeof value === "string" && value.length > 0 ? value : stored;
}

/**
 * A run's production with its Breakdown added, when the run asks for one
 * and what `knowledge.produce` answered for the Source leaves the
 * segmenters to run. The segmenters read the Reading's definition, so a
 * run inside a wording is a part only when it keeps its meaning (ADR 0050).
 */
export function withBreakdown<E, R, RS>(
	segmenters: Segmenters<RS>,
	produced: KnowledgeProduction,
	input: {
		readonly reading: Dumling.Reading<"de">;
		readonly breakdown: boolean;
		readonly sentence?: string;
		readonly storedDefinition?: string;
	},
	pointsBack: (
		change: KnowledgeProduction["changes"][number],
	) => Effect.Effect<boolean, E, R>,
): Effect.Effect<KnowledgeProduction, E, R | RS> {
	return Effect.gen(function* () {
		if (
			!input.breakdown ||
			!(yield* segmentsAfterSource(produced, pointsBack))
		)
			return produced;
		const definition = breakdownDefinition(
			produced,
			input.storedDefinition,
		);
		const breakdown = yield* produceBreakdown(segmenters, {
			reading: input.reading,
			...(input.sentence === undefined
				? {}
				: { sentence: input.sentence }),
			...(definition === undefined ? {} : { definition }),
		});
		return {
			...produced,
			changes: [...produced.changes, ...breakdown.changes],
			failures: [...produced.failures, ...breakdown.failures],
		};
	});
}
