import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { GovernedPrepositionDraft } from "./attestedGovernment";
import type { ClickEncounter } from "./clickResolution";
import type { CatalogMissSignal } from "./resolutionGrammar";

/**
 * The Knowledge production port: the model work that fills one Reading's
 * Knowledge from one occurrence. tf-demo owns the request, coverage,
 * publication and dictionary planning around it.
 *
 * It is idle while resolution is rebuilt on the new Dumgen (#701, #848): a
 * click creates no Reading, so no Knowledge is asked for, and the
 * production producer refuses rather than call a model.
 */

/** Which Knowledge aspects and leaves a run asks for. */
export type KnowledgeRequest = Dumrel.KnowledgeRequestMask;

/** One aspect or leaf a run could not produce, and why. */
export type KnowledgeFailure = {
	readonly aspect:
		| "transcription"
		| "definition"
		| "translations"
		| "semanticRelations"
		| "valency"
		| "participleSource"
		| "pluralPattern"
		| "morphologicalTree"
		| "lexicalBreakdown";
	readonly leaf?: string;
	readonly candidate?: string;
	readonly code:
		| "InvalidInput"
		| "ProviderFailure"
		| "InvalidModelOutput"
		| "Unresolved"
		| "NotImplemented"
		| "CatalogMiss";
	readonly message: string;
};

/** What one run produced: Knowledge changes, pending relations and failures. */
export type KnowledgeProduction = {
	readonly failures: readonly KnowledgeFailure[];
	readonly changes: readonly Dumrel.KnowledgeChange<Dumling.Reading<"de">>[];
	readonly pendingRelations: readonly (Dumrel.PendingSemanticRelation & {
		readonly target: { readonly language: "de" };
	})[];
};

/** One run's input: the occurrence, its Reading and what to produce. */
export type KnowledgeInput = {
	readonly encounter: ClickEncounter;
	readonly reading: Dumling.Reading<"de">;
	readonly request: KnowledgeRequest;
	/** Government this occurrence attests that the stored frame may lack. */
	readonly attestedGovernment?: readonly GovernedPrepositionDraft[];
	/** The Plural Pattern this occurrence attests that the stored plural may lack. */
	readonly attestedPluralPattern?: Dumrel.PluralPattern;
};

/**
 * Knowledge text drafted from the clicked Sentence and Lemma while the
 * Reading was still being resolved, handed to the run that follows.
 */
export type KnowledgeDraft = {
	readonly sourceFingerprint: string;
	readonly relations?: {
		readonly requested: readonly string[];
		readonly candidates: readonly string[];
	};
	readonly texts: readonly {
		readonly aspect: "definition" | "transcription" | "translations";
		readonly language?: string;
		readonly text: string;
	}[];
};

export type KnowledgeProducer = (
	input: KnowledgeInput,
	options: {
		readonly draft?: KnowledgeDraft;
		/** Receives each batch of changes as soon as it is produced. */
		readonly onContribution: (
			changes: KnowledgeProduction["changes"],
		) => void;
	},
) => Effect.Effect<KnowledgeProduction | CatalogMissSignal, unknown>;

/** Production while Knowledge is idle: it refuses every run and calls no model. */
export const idleKnowledgeProducer: KnowledgeProducer = () =>
	Effect.fail(
		new Error(
			"Knowledge generation is idle while click resolution is rebuilt.",
		),
	);
