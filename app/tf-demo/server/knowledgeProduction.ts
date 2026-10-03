import type { OperationTrace } from "dumgen";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import type * as Effect from "effect/Effect";
import type { ClickEncounter } from "./clickResolution";

/**
 * The Knowledge production port: the model work that fills one Reading's
 * Knowledge from one occurrence. tf-demo owns the request, coverage,
 * publication and dictionary planning around it; Dumgen's
 * `knowledge.produce` does the model work (#883, #887).
 */

/** Which Knowledge aspects and leaves a run asks for: what coverage says is missing. */
export type KnowledgeRequest = Dumrel.KnowledgeRequestMask;

/**
 * One aspect or leaf a run could not produce, and why (#883 point 3). An
 * uncovered authored or Closed Route Reading comes back as a `CatalogMiss`.
 */
export type KnowledgeFailure = {
	readonly aspect:
		| "transcription"
		| "definition"
		| "translations"
		| "semanticRelations"
		| "valency"
		| "participleSource"
		| "plural"
		| "conjugationClass"
		| "locutionType"
		| "sayingType"
		| "formulaRole";
	readonly leaf?: string;
	readonly code:
		| "ProviderFailure"
		| "InvalidModelOutput"
		| "Unresolved"
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

/**
 * One run's input, `knowledge.produce`'s: the occurrence's Encounter and
 * Attestation, whose `valencyEvidence` is the attested government, its
 * Reading, whether the occurrence created the Reading (`New`) or reused it
 * (`TopUp`), and what to produce.
 */
export type KnowledgeInput = {
	readonly encounter: ClickEncounter;
	readonly reading: Dumling.Reading<"de">;
	readonly attestation: Dumling.Attestation<"de">;
	readonly origin: "New" | "TopUp";
	readonly request: KnowledgeRequest;
};

/**
 * Knowledge text drafted from the clicked Sentence and Lemma while the
 * Reading was still being resolved. The click orchestrator may still store
 * one; Knowledge production no longer reads it (#623: no drafts).
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

export type KnowledgeProducer = <E>(
	input: KnowledgeInput,
	options: {
		/**
		 * Receives each aspect's changes as soon as it has them, one at a
		 * time; the producer waits for its Effect, and its failure is the
		 * run's only error.
		 */
		readonly onContribution: (
			changes: KnowledgeProduction["changes"],
		) => Effect.Effect<void, E>;
		/** Receives each Dumgen operation's trace, for the run's evidence and DEV inspection. */
		readonly onOperation?: (trace: OperationTrace) => void;
		/** Keeps each call's prompt and answer in its trace: DEV inspection only. */
		readonly tracePayloads?: boolean;
	},
) => Effect.Effect<KnowledgeProduction, E>;
