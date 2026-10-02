/**
 * Scores the German Segment stage against gold Segments by exact source
 * spans, and units over predicted Segments by the gold Segments they map
 * to (#701's raw mode).
 */
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
	Unit,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import type { GermanSegmentation } from "../../segment/de/segments.js";

type Segment = SegmentInUnitsInput["segments"][number];

/** UTF-16 coordinates, matching String.slice and the persisted offsets. */
export type SourceSpan = {
	readonly start: number;
	readonly end: number;
};

/** The Segment stage's output as the evaluator reads it. */
export type GermanSource = {
	readonly input: SegmentInUnitsInput;
	/** One coordinate per input Segment, including whitespace and punctuation. */
	readonly spans: readonly SourceSpan[];
	/** Segments whose written run kept its spelling undecided; see `GermanSegmentation`. */
	readonly unresolved: readonly number[];
};

/** A Segment stage result with its spans in its Stitched Text. */
export function germanSourceOf(segmentation: GermanSegmentation): GermanSource {
	const segments = segmentation.segments.map(({ kind, text, surface }) => ({
		kind,
		text,
		...(surface === undefined ? {} : { surface }),
	}));
	return {
		input: { language: "de", segments },
		spans: sourceSpans(segments),
		unresolved: segmentation.unresolved,
	};
}

export type SourceEvaluation = {
	readonly textPreserved: boolean;
	readonly boundaryExact: boolean;
	readonly kindExact: boolean;
	/** Every effective surface, including unannotated gold words, must match. */
	readonly strictSurfaceExact: boolean;
	/** Only surfaces explicitly present in gold constrain recovery. */
	readonly annotatedSurfaceExact: boolean;
	readonly goldSegments: number;
	readonly predictedSegments: number;
	readonly boundaryMatches: number;
	readonly kindMatches: number;
	readonly goldSurfaceAssertions: number;
	readonly matchedSurfaceAssertions: number;
	readonly unresolvedSegments: number;
};

export type SourceUnitEvaluation = {
	readonly source: SourceEvaluation;
	/** Predicted Segment index → exact gold span, spelling and render-kind match, or null. */
	readonly segmentMapping: readonly (number | null)[];
	readonly units: {
		readonly contractPass: boolean;
		readonly gold: number;
		readonly predicted: number;
		readonly groupingMatches: number;
		/** Exact span/kind membership and route, independent of spelling recovery. */
		readonly routeMatches: number;
		readonly strictRecoveryMatches: number;
		readonly annotatedRecoveryMatches: number;
		readonly wrongSegments: number;
		readonly wrongRoute: number;
		readonly missing: number;
		readonly abstained: number;
		readonly unresolved: number;
		readonly unmappable: number;
		/** Unmatched predictions; not penalized as extras in a Partial gold record. */
		readonly unmatched: number;
		readonly extra: number;
		readonly fullPass: boolean;
	};
};

/** Recover coordinates from source spelling only; no normalization is applied. */
export function sourceSpans(segments: readonly Segment[]): SourceSpan[] {
	let start = 0;
	return segments.map(({ text }) => {
		const span = { start, end: start + text.length };
		start = span.end;
		return span;
	});
}

const spanKey = ({ start, end }: SourceSpan) => `${start}:${end}`;
const overlaps = (a: SourceSpan, b: SourceSpan) =>
	a.start < b.end && b.start < a.end;

function aligned(input: SegmentInUnitsInput, source: GermanSource) {
	const goldSpans = sourceSpans(input.segments);
	const actualSpans = sourceSpans(source.input.segments);
	const goldBySpan = new Map(
		goldSpans.map((span, index) => [spanKey(span), index]),
	);
	const boundaryMapping = source.spans.map((span, index) => {
		const actual = actualSpans[index];
		return actual?.start === span.start && actual.end === span.end
			? (goldBySpan.get(spanKey(span)) ?? null)
			: null;
	});
	const mapping = boundaryMapping.map((gold, index) =>
		gold !== null &&
		input.segments[gold]?.kind === source.input.segments[index]?.kind &&
		input.segments[gold]?.text === source.input.segments[index]?.text
			? gold
			: null,
	);
	return { goldSpans, boundaryMapping, mapping };
}

/**
 * Scores boundaries, render kinds, strict recovery and explicitly annotated
 * recovery separately. Abstention never removes a source run from a denominator.
 */
export function evaluateSource(
	input: SegmentInUnitsInput,
	source: GermanSource,
): SourceEvaluation {
	const text = input.segments.map(({ text }) => text).join("");
	const { boundaryMapping, mapping } = aligned(input, source);
	const actualSpans = sourceSpans(source.input.segments);
	const textPreserved =
		source.input.segments.map(({ text }) => text).join("") === text &&
		source.spans.length === actualSpans.length &&
		actualSpans.every((span, index) => {
			const supplied = source.spans[index];
			return supplied?.start === span.start && supplied.end === span.end;
		});
	const boundaryMatches = boundaryMapping.filter(
		(index) => index !== null,
	).length;
	const kindMatches = mapping.filter((index) => index !== null).length;
	const boundaryExact =
		textPreserved &&
		boundaryMatches === input.segments.length &&
		boundaryMatches === source.input.segments.length;
	const kindExact = boundaryExact && kindMatches === input.segments.length;
	const goldSurfaceAssertions = input.segments.filter(
		({ surface }) => surface !== undefined,
	).length;
	const matchedSurfaceAssertions = mapping.filter(
		(gold, predicted) =>
			gold !== null &&
			input.segments[gold]?.surface !== undefined &&
			input.segments[gold]?.surface ===
				(source.input.segments[predicted]?.surface ??
					source.input.segments[predicted]?.text),
	).length;
	return {
		textPreserved,
		boundaryExact,
		kindExact,
		strictSurfaceExact:
			kindExact &&
			mapping.every(
				(gold, predicted) =>
					gold !== null &&
					(input.segments[gold]?.surface ??
						input.segments[gold]?.text) ===
						(source.input.segments[predicted]?.surface ??
							source.input.segments[predicted]?.text),
			),
		annotatedSurfaceExact:
			textPreserved && matchedSurfaceAssertions === goldSurfaceAssertions,
		goldSegments: input.segments.length,
		predictedSegments: source.input.segments.length,
		boundaryMatches,
		kindMatches,
		goldSurfaceAssertions,
		matchedSurfaceAssertions,
		unresolvedSegments: source.unresolved.length,
	};
}

const memberKey = (members: readonly number[]) =>
	[...members].sort((a, b) => a - b).join(",");
const sameRoute = (a: Unit["route"], b: Unit["route"]) =>
	a === "Unresolved" || b === "Unresolved"
		? a === b
		: a.language === b.language &&
			a.family === b.family &&
			a.kind === b.kind;

/**
 * Maps predicted ownership by exact source spans, spelling and render kinds, never by
 * predicted indices. A wrong boundary stays an unmappable prediction and makes
 * every affected gold unit wrong or missing; it cannot disappear during mapping.
 * routeMatches excludes recovery and counts every explicit gold unit, including
 * Unresolved and Foreign units the legacy lab can leave unscored;
 * strictRecoveryMatches and annotatedRecoveryMatches report that extra constraint.
 */
export function evaluateSourceAndUnits(
	input: SegmentInUnitsInput,
	idealOutput: SegmentInUnitsOutput,
	source: GermanSource,
	output: SegmentInUnitsOutput,
	coverage: "Full" | "Partial" = "Partial",
): SourceUnitEvaluation {
	const { goldSpans, mapping } = aligned(input, source);
	const sourceScore = evaluateSource(input, source);
	const claimed = output.units.flatMap(({ segments }) => segments);
	const clickable = source.input.segments.flatMap(({ kind }, index) =>
		kind === "ResolvableText" ? [index] : [],
	);
	const contractPass =
		output.units.every(
			({ segments }) =>
				segments.length > 0 &&
				segments.every(
					(index) =>
						Number.isInteger(index) &&
						index >= 0 &&
						index < source.input.segments.length,
				),
		) &&
		new Set(claimed).size === claimed.length &&
		claimed.length === clickable.length &&
		claimed.every((index) => clickable.includes(index));
	const predicted = output.units.map((unit) => {
		const members = unit.segments.map(
			(segment) => mapping[segment] ?? null,
		);
		const valid =
			unit.segments.length > 0 &&
			new Set(unit.segments).size === unit.segments.length &&
			members.every((member) => member !== null);
		return {
			unit,
			members,
			key: valid
				? memberKey(members.filter((member) => member !== null))
				: null,
		};
	});
	const used = new Set<number>();
	let groupingMatches = 0;
	let routeMatches = 0;
	let strictRecoveryMatches = 0;
	let annotatedRecoveryMatches = 0;
	let wrongSegments = 0;
	let wrongRoute = 0;
	let missing = 0;
	let abstained = 0;
	for (const gold of idealOutput.units) {
		const key = memberKey(gold.segments);
		const index = predicted.findIndex(
			(prediction, index) => !used.has(index) && prediction.key === key,
		);
		const prediction = predicted[index];
		if (!prediction) {
			const touched = gold.segments.some((goldSegment) => {
				const span = goldSpans[goldSegment];
				return (
					span &&
					predicted.some(({ unit }) =>
						unit.segments.some((segment) => {
							const other = source.spans[segment];
							return other && overlaps(span, other);
						}),
					)
				);
			});
			if (touched) wrongSegments++;
			else missing++;
			continue;
		}
		used.add(index);
		groupingMatches++;
		if (!sameRoute(gold.route, prediction.unit.route)) {
			if (prediction.unit.route === "Unresolved") abstained++;
			else wrongRoute++;
			continue;
		}
		routeMatches++;
		const recovered = (strict: boolean) =>
			prediction.unit.segments.every((segment) => {
				const goldSegment = input.segments[mapping[segment] ?? -1];
				const actual = source.input.segments[segment];
				if (!goldSegment || !actual) return false;
				return (
					(!strict && goldSegment.surface === undefined) ||
					(goldSegment.surface ?? goldSegment.text) ===
						(actual.surface ?? actual.text)
				);
			});
		if (recovered(true)) strictRecoveryMatches++;
		if (recovered(false)) annotatedRecoveryMatches++;
	}
	const unmatched = predicted.length - used.size;
	const extra = coverage === "Full" ? unmatched : 0;
	return {
		source: sourceScore,
		segmentMapping: mapping,
		units: {
			contractPass,
			gold: idealOutput.units.length,
			predicted: predicted.length,
			groupingMatches,
			routeMatches,
			strictRecoveryMatches,
			annotatedRecoveryMatches,
			wrongSegments,
			wrongRoute,
			missing,
			abstained,
			unresolved: output.units.filter(
				({ route }) => route === "Unresolved",
			).length,
			unmappable: predicted.filter(({ key }) => key === null).length,
			unmatched,
			extra,
			fullPass:
				coverage === "Full" &&
				contractPass &&
				sourceScore.textPreserved &&
				routeMatches === idealOutput.units.length &&
				extra === 0,
		},
	};
}
