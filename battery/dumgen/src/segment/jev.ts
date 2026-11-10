/**
 * jev (TypeSafe System One) as `segment.inUnits` reaches it: one request of
 * state and questions to a pinned model, answered with the model that
 * answered and the tokens it used. `Jev` sends every request of the
 * segmenter through the host's `JevAsk` in chunks `chunkQuestions` cuts by
 * their estimated tokens. `JevTransport.typeSafe` sends them to the
 * TypeSafe API; a test passes a fake through `JevTransport.fromAsk`.
 */
import type { EntryType, Question, Questions } from "@typesafe-ai/sdk";

/**
 * The jev version `segment.inUnits` requests unless told otherwise. The
 * lab's runs pin the same version, so its cached answers replay.
 */
export const pinnedJevModel = "jev-1.13.0";

/**
 * The estimated input tokens one chunk of a jev request may reach; a larger
 * request is split in order. TypeSafe refuses a request over 65,536 input
 * tokens (`max_tokens_exceeded`, #1213); this is half that, so a chunk
 * whose estimate falls short by up to half still fits. The densest chunk
 * measured, 93 slot Choices, billed 34,359 tokens at an estimate of 32,415.
 * Chunk size moves answers no more than repetition noise (the lab's
 * limit-qpc test, 25 to 3,000 questions a chunk), and the evaluations'
 * cache keys each answer by its question, so the chunking never decides a
 * cache hit.
 */
export const tokensPerRequest = 32_768;

const encoder = new TextEncoder();

/**
 * An estimate of the input tokens `value`'s JSON costs jev: its UTF-8 bytes
 * over two. jev billed 2.3 to 3.8 bytes of canonical JSON a token across
 * 2,073 cached segmentation requests of every stage, 2.95 on average, plus
 * about 24 tokens a request, and 1.9 for a chunk of nothing but slot
 * Choices, whose criteria are short ids and words (#1324).
 */
export const estimatedTokens = (value: unknown): number =>
	Math.ceil(encoder.encode(JSON.stringify(value) ?? "").length / 2);

/**
 * How `chunkQuestions` bounds a chunk: by its estimated tokens, the judge
 * state's included, and by a question count. Production bounds tokens
 * only; the lab's limit tests bound questions.
 */
export type ChunkLimit = {
	readonly tokens?: number;
	readonly questions?: number;
};

/**
 * A request's questions in order, cut into chunks that each fit `limit`
 * with the state sent beside them. A question that alone passes the limit
 * goes in a chunk of its own; an empty request is no chunk.
 */
export function chunkQuestions(
	state: JevRequest["state"],
	questions: Questions,
	limit: ChunkLimit = { tokens: tokensPerRequest },
): (readonly [string, Question])[][] {
	const tokens = limit.tokens ?? Number.POSITIVE_INFINITY;
	const count = limit.questions ?? Number.POSITIVE_INFINITY;
	const base = estimatedTokens(state);
	const chunks: (readonly [string, Question])[][] = [];
	let chunk: (readonly [string, Question])[] = [];
	let size = base;
	for (const entry of Object.entries(questions)) {
		const cost = estimatedTokens(entry);
		if (
			chunk.length > 0 &&
			(size + cost > tokens || chunk.length >= count)
		) {
			chunks.push(chunk);
			chunk = [];
			size = base;
		}
		chunk.push(entry);
		size += cost;
	}
	if (chunk.length > 0) chunks.push(chunk);
	return chunks;
}

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
	/**
	 * The answers by question id, unchecked: Dumgen's call adapter checks
	 * each against its question (`checkedAnswers`) before a stage reads it.
	 */
	readonly answers: Readonly<Record<string, unknown>>;
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
