/**
 * `createDumgen`, the one factory every host builds Dumgen with (#859). Its
 * operations are Effects whose error channel holds only `ProviderFailure`
 * and `InvalidModelOutput` (#552); a host `yield*`s them in its own
 * programs. For now it offers `segment.inUnits`; `resolve.grammar`,
 * `resolve.reading` and `knowledge.produce` follow.
 */
import type * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "./call.js";
import type { LunaAsk } from "./luna.js";
import type { OperationTrace } from "./operation-trace.js";
import type { GermanInventory } from "./segment/de/inventory.js";
import { productionUnitSettings } from "./segment/de/units.js";
import { type InUnitsInput, segmentText } from "./segment/in-units.js";
import { isFloatingModel, type JevAsk, pinnedJevModel } from "./segment/jev.js";
import type { SegmentedText } from "./segment/segmented-sentence.js";

export type DumgenOptions = {
	/** jev (TypeSafe System One): `createTypeSafeAsk` in production. */
	readonly jev: JevAsk;
	/**
	 * Luna, for the operations that write; none of today's needs it, and
	 * segmentation never receives it.
	 */
	readonly luna?: LunaAsk;
	/**
	 * The model calls one instance keeps in flight, jev and Luna together;
	 * 16 by default. A call holds its permit for its transport only.
	 */
	readonly requestBudget?: number;
	/** Receives each operation's trace once the operation exits. */
	readonly onOperation?: (trace: OperationTrace) => void;
	/** Keeps every call's request and answer in its trace; off by default. */
	readonly tracePayloads?: boolean;
	/** The jev version every request names; a floating alias is refused. */
	readonly jevModel?: string;
	/** The German Authored Inventories the unit stage reads; dumspec's by default. */
	readonly inventory?: GermanInventory;
};

export type Dumgen = {
	readonly segment: {
		/**
		 * Segments every Sentence and groups its Segments into biggest
		 * units. A Sentence whose model calls fail comes back marked
		 * `failed`, and the others are kept. Another language than German
		 * or a blank Sentence is a Defect, raised before anything is asked.
		 */
		readonly inUnits: (input: InUnitsInput) => Effect.Effect<SegmentedText>;
	};
};

export function createDumgen(options: DumgenOptions): Dumgen {
	const model = options.jevModel ?? pinnedJevModel;
	if (isFloatingModel(model))
		throw Error(
			`${model} floats between jev versions; pin one, such as ${pinnedJevModel}`,
		);
	const operations = {
		budget: requestBudget(options.requestBudget ?? 16),
		payloads: options.tracePayloads ?? false,
		...(options.onOperation ? { onOperation: options.onOperation } : {}),
	};
	const settings =
		options.inventory === undefined
			? productionUnitSettings
			: { ...productionUnitSettings, inventory: options.inventory };
	const jev = { ask: options.jev, model };
	return {
		segment: {
			inUnits: (input) =>
				runOperation("segment.inUnits", operations, (scope) =>
					segmentText(scope, jev, settings, input),
				),
		},
	};
}
