/**
 * `createDumgen`, the one factory every host builds Dumgen with (#859). Its
 * operations are Effects whose error channel holds only `ProviderFailure`
 * and `InvalidModelOutput` (#552); a host `yield*`s them in its own
 * programs. It offers `segment.inUnits`, `resolve.grammar`,
 * `resolve.reading` and `knowledge.produce`, whose error channel holds
 * only the host's own `onContribution` error (#883).
 */
import type * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "./call.js";
import type { InvalidModelOutput, ProviderFailure } from "./errors.js";
import { produceKnowledge } from "./knowledge/produce.js";
import type {
	KnowledgeProduction,
	ProduceKnowledgeInput,
} from "./knowledge/types.js";
import { languageModules } from "./languages.js";
import {
	defaultLunaConfiguration,
	type LunaAsk,
	type LunaConfiguration,
} from "./luna.js";
import type { OperationTrace } from "./operation-trace.js";
import { resolveGrammar } from "./resolve/grammar.js";
import { resolveReading } from "./resolve/reading.js";
import type {
	GrammarResolution,
	ReadingResolution,
	ResolveGrammarInput,
	ResolveReadingInput,
} from "./resolve/types.js";
import type { GermanInventory } from "./segment/de/inventory.js";
import { type InUnitsInput, segmentText } from "./segment/in-units.js";
import { isFloatingModel, type JevAsk, pinnedJevModel } from "./segment/jev.js";
import type { SegmentedText } from "./segment/segmented-sentence.js";

export type DumgenOptions = {
	/** jev (TypeSafe System One): `createTypeSafeAsk` in production. */
	readonly jev: JevAsk;
	/**
	 * Luna, for the operations that write: `resolve.grammar` writes Canonical
	 * Forms and spelling corrections with it and drafts Emoji Descriptions
	 * in the same call, `resolve.reading` writes those no draft supplies
	 * (#862), and `knowledge.produce` Knowledge text, plural and
	 * Präteritum forms, frames and relation candidates. Segmentation never
	 * receives it. `createOpenAILuna` in production.
	 */
	readonly luna: LunaAsk;
	/** The Luna model and settings; `defaultLunaConfiguration` unless given. */
	readonly lunaConfiguration?: LunaConfiguration;
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
	/** The German Authored Inventories the unit stage reads; dumcorpus's by default. */
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
	readonly resolve: {
		/**
		 * The grammar of the stored unit a click landed on (#859): its
		 * Attestation, or Unresolved, or a Catalog Miss, all as answers. A
		 * click is all-or-nothing: any failed call fails it and interrupts
		 * its other calls. Another language than German, a failed Sentence
		 * or a unit that is no unit of its Sentence is a Defect.
		 */
		readonly grammar: (
			input: ResolveGrammarInput,
		) => Effect.Effect<
			GrammarResolution,
			ProviderFailure | InvalidModelOutput
		>;
		/**
		 * The Reading a resolved click lands on (#859, ADR 0031): a stored
		 * Emoji Description it reuses, or a New one, or a Catalog Miss, all
		 * as answers. jev judges the stored candidates first; Luna writes
		 * only after NoMatch or when nothing is stored. Authored Lemmas take
		 * their authored Reading. A click is all-or-nothing, as in grammar.
		 * Bad input, a Foreign Attestation among it, is a Defect.
		 */
		readonly reading: (
			input: ResolveReadingInput,
		) => Effect.Effect<
			ReadingResolution,
			ProviderFailure | InvalidModelOutput
		>;
	};
	readonly knowledge: {
		/**
		 * The Knowledge one occurrence asks for its resolved Reading (#883):
		 * changes, Pending Semantic Relations and per-aspect failures, all
		 * values. Each aspect's changes reach `onContribution` as soon as it
		 * has them; its failure is the only error, and it interrupts the
		 * rest. Bad input is a Defect.
		 */
		readonly produce: <E = never>(
			input: ProduceKnowledgeInput<E>,
		) => Effect.Effect<KnowledgeProduction, E>;
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
	const modules = languageModules(options);
	const jev = { ask: options.jev, model };
	const luna = {
		ask: options.luna,
		configuration: options.lunaConfiguration ?? defaultLunaConfiguration,
	};
	return {
		segment: {
			inUnits: (input) =>
				runOperation("segment.inUnits", operations, (scope) =>
					segmentText(scope, jev, modules, input),
				),
		},
		resolve: {
			grammar: (input) =>
				runOperation("resolve.grammar", operations, (scope) =>
					resolveGrammar(scope, { jev, luna }, modules, input),
				),
			reading: (input) =>
				runOperation("resolve.reading", operations, (scope) =>
					resolveReading(scope, { jev, luna }, input),
				),
		},
		knowledge: {
			produce: (input) =>
				runOperation("knowledge.produce", operations, (scope) =>
					produceKnowledge(scope, { jev, luna }, modules, input),
				),
		},
	};
}
