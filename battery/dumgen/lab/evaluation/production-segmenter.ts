/**
 * `segment.inUnits` as the evaluations run it: through `createDumgen`, the
 * factory every host builds Dumgen with, so an evaluation sends the
 * requests production sends, chunked, checked and budgeted as production
 * does. The evaluation supplies only the transport, the lab's cached,
 * retrying jev (`lab/segmentation/harness/jev-cache.ts`), as a host supplies the TypeSafe ask.
 *
 * - `segmentSentence`, raw mode: one Sentence as written goes into
 *   `segment.inUnits`. A Sentence production marks failed rejects with its
 *   failure, so the run records its case as failed.
 * - `groupSegments`, gold mode: gold Segments skip the Segment stage and go
 *   into production's unit stage under the same operation, call adapter and
 *   setting. `createDumgen` offers no entry that takes Segments, since no
 *   host has them before intake.
 */
import { isRecord } from "common-utils";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../src/call.js";
import { createDumgen } from "../../src/create-dumgen.js";
import { askThrough } from "../../src/jev-call.js";
import type { LunaAsk } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../../src/segment/de/units.js";
import { type JevAsk, pinnedJevModel } from "../../src/segment/jev.js";
import type { Segment, Unit } from "../../src/segment/segmented-sentence.js";

/** Segmentation never receives Luna; `createDumgen` still asks for one. */
const noLuna: LunaAsk = () =>
	Promise.reject(Error("segment.inUnits never asks Luna"));

export type ProductionJev = {
	readonly ask: JevAsk;
	/** The pinned jev version; `pinnedJevModel` by default. */
	readonly model?: string;
};

/** One Sentence as `segment.inUnits` segmented it, with what its trace adds. */
export type SegmentedRaw = {
	readonly segments: readonly Segment[];
	readonly units: readonly Unit[];
	/** Indices of the Segments the Segment stage kept unresolved. */
	readonly unresolved: readonly number[];
};

const unresolvedOf = (traces: readonly OperationTrace[]) =>
	traces
		.flatMap((trace) => trace.events ?? [])
		.filter((event) => event.name === "UnresolvedSegments")
		.flatMap(({ data }) => {
			const segments = isRecord(data) ? data.segments : undefined;
			if (
				!Array.isArray(segments) ||
				!segments.every((index) => typeof index === "number")
			)
				throw Error(
					"An UnresolvedSegments event names its Segments by index",
				);
			return segments;
		});

/** Raw mode: the Sentence as written, through `createDumgen`'s `segment.inUnits`. */
export async function segmentSentence(
	jev: ProductionJev,
	sentence: string,
): Promise<SegmentedRaw> {
	const traces: OperationTrace[] = [];
	const text = await Effect.runPromise(
		createDumgen({
			jev: jev.ask,
			luna: noLuna,
			...(jev.model ? { jevModel: jev.model } : {}),
			onOperation: (trace) => traces.push(trace),
		}).segment.inUnits({
			language: "de",
			paragraphs: [{ sentences: [sentence] }],
		}),
	);
	const segmented = text.paragraphs[0]?.sentences[0];
	if (!segmented) throw Error("segment.inUnits returned no Sentence");
	if (segmented.failed) {
		const failure = traces
			.flatMap((trace) => trace.sentences)
			.find((outcome) => outcome.outcome === "Failed");
		throw Error(
			failure?.outcome === "Failed"
				? `${failure.failure.tag}: ${failure.failure.message}`
				: "segment.inUnits marked the Sentence failed",
		);
	}
	return {
		segments: segmented.segments,
		units: segmented.units,
		unresolved: unresolvedOf(traces),
	};
}

/**
 * Gold mode: given Segments through production's unit stage, under the
 * `segment.inUnits` operation and the call adapter `createDumgen` builds.
 * A failed request rejects with its `ProviderFailure` or
 * `InvalidModelOutput`.
 */
export function groupSegments(
	jev: ProductionJev,
	segments: readonly Segment[],
): Promise<Unit[]> {
	const settings = { ask: jev.ask, model: jev.model ?? pinnedJevModel };
	return Effect.runPromise(
		runOperation(
			"segment.inUnits",
			{ budget: requestBudget(16), payloads: false },
			(scope) =>
				segmentGermanUnits(
					{ segments },
					askThrough(scope, settings),
					productionUnitSettings,
				),
		),
	);
}
