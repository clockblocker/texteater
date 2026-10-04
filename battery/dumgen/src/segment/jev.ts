/**
 * jev (TypeSafe System One) as `segment.inUnits` reaches it: one request of
 * state and questions to a pinned model, answered with the model that
 * answered and the tokens it used. `createDumgen` sends every request of
 * the segmenter through a `JevAsk` in chunks of `questionsPerRequest`.
 * `createTypeSafeAsk` sends them to the TypeSafe API; a test passes a fake.
 */
import type { EntryType, Questions } from "@typesafe-ai/sdk";
import type { Answers } from "./ask.js";

/**
 * The jev version `segment.inUnits` requests unless told otherwise. The
 * lab's runs pin the same version, so its cached answers replay.
 */
export const pinnedJevModel = "jev-1.13.0";

/**
 * Questions per jev request; a larger request is split in order. The
 * evaluations' cache keys each answer by its question, so the chunking
 * never decides a cache hit.
 */
export const questionsPerRequest = 300;

/** A floating alias such as `jev-latest` may be answered by any version. */
export const isFloatingModel = (model: string) => model.endsWith("-latest");

/** One System One request body, exactly as the TypeSafe API takes it. */
export type JevRequest = {
	readonly model: string;
	readonly state: Readonly<Record<string, EntryType>>;
	readonly questions: Questions;
};

/** One System One answer, as the TypeSafe API returns it. */
export type JevResponse = {
	/** The jev version that answered. */
	readonly model: string;
	readonly answers: Answers;
	readonly usage: {
		readonly input_tokens: number;
		readonly output_tokens: number;
	};
};

/**
 * Sends one request to jev. `stage` names the segmenter's request
 * (`segments`, `candidates`, `route`, …) for a host's ledger or cache; it
 * is not part of the request body. When `signal` aborts, the request must
 * settle promptly: Dumgen waits for it before it lets an interrupted
 * operation end. Anything it throws or rejects with is a `ProviderFailure`.
 */
export type JevAsk = (
	request: JevRequest,
	context: { readonly stage: string; readonly signal: AbortSignal },
) => Promise<JevResponse>;
