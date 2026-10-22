/**
 * How the cached jev (`jev-cache.ts`) keys and keeps its answers: requests
 * spelled as canonical JSON and hashed, and the bucket files that hold one
 * model, state and repetition's answers.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { EntryType, Question, Questions } from "@typesafe-ai/sdk";
import { canonicalJson } from "common-utils";
import { z } from "zod";
import type { Answer, Answers } from "../../../src/segment/ask.js";
import { answerSchema, storedAs } from "../../stored-json.js";

export function hashOf(value: unknown): string {
	return hashOfText(canonicalJson(value));
}

export const hashOfText = (text: string) =>
	createHash("sha256").update(text).digest("hex");

/**
 * The canonical JSON of an object whose members are spelled already:
 * `canonicalJson`'s object rule, keys in UTF-16 code-unit order. A key is
 * the hash of such an object, so it equals `hashOf` of the object itself.
 */
export function canonicalObject(
	members: readonly (readonly [key: string, text: string])[],
): string {
	return `{${[...members]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([key, text]) => `${JSON.stringify(key)}:${text}`)
		.join(",")}}`;
}

/**
 * A request's state and each of its questions as canonical JSON, and each
 * question's key in its bucket (`hashOf({ id, question })`), spelled once
 * on the way in: its bucket, prompt hash, lookups and size are all taken
 * from these, however many chunks and repetitions it is looked up in.
 */
export type Spelling = {
	readonly state: string;
	readonly questions: ReadonlyMap<string, string>;
	readonly keys: ReadonlyMap<string, string>;
};

export function spell(state: EntryType, questions: Questions): Spelling {
	const texts = new Map(
		Object.entries(questions).map(([id, question]) => [
			id,
			canonicalJson(question),
		]),
	);
	const keys = new Map(
		[...texts].map(([id, question]) => [
			id,
			hashOfText(
				canonicalObject([
					["id", JSON.stringify(id)],
					["question", question],
				]),
			),
		]),
	);
	return { state: canonicalJson(state), questions: texts, keys };
}

/** What a spelling's map holds for question `id`; one it lacks throws. */
export function spelledAt(
	texts: ReadonlyMap<string, string>,
	id: string,
): string {
	const text = texts.get(id);
	if (text === undefined) throw Error(`Question ${id} was not spelled`);
	return text;
}

/** The text `canonicalJson({ state, questions })` spells for `asked`, some of the spelled questions. */
export function requestText(spelling: Spelling, asked: Questions): string {
	const questions = Object.keys(asked).map(
		(id) => [id, spelledAt(spelling.questions, id)] as const,
	);
	return canonicalObject([
		["questions", canonicalObject(questions)],
		["state", spelling.state],
	]);
}

/**
 * The bucket at `path`; undefined when it is missing or not JSON. A bucket
 * of another shape throws.
 */
export async function readBucket(path: string): Promise<Bucket | undefined> {
	let value: unknown;
	try {
		value = JSON.parse(await readFile(path, "utf8"));
	} catch {
		return undefined;
	}
	return storedAs(bucketSchema, value, path);
}

/** Writes beside the target and renames, so no reader sees half a file. */
export async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.${randomUUID()}.tmp`;
	await writeFile(temporary, JSON.stringify(value));
	await rename(temporary, path);
}

/** A fresh request's answers as `#send` returns them, before they are kept. */
export type Sent = {
	readonly model: string;
	readonly answers: Answers;
	readonly usage: {
		readonly input_tokens: number;
		readonly output_tokens: number;
	};
	readonly latencyMs: number;
};

/**
 * The cached answers of one model, state and repetition: each answer with
 * the request that brought it, and each request's size, tokens and latency.
 */
export type Bucket = {
	readonly requests: readonly {
		readonly model: string;
		readonly questions: number;
		readonly usage: Sent["usage"];
		readonly latencyMs: number;
	}[];
	readonly answers: Readonly<
		Record<string, { readonly answer: Answer; readonly request: number }>
	>;
};

const bucketSchema = z.object({
	requests: z.array(
		z.object({
			model: z.string(),
			questions: z.number(),
			usage: z.object({
				input_tokens: z.number(),
				output_tokens: z.number(),
			}),
			latencyMs: z.number(),
		}),
	),
	answers: z.record(
		z.string(),
		z.object({ answer: answerSchema, request: z.number() }),
	),
}) satisfies z.ZodType<Bucket>;

export const emptyBucket: Bucket = { requests: [], answers: {} };

/** What the cache found for a request's questions. */
export type Lookup = {
	readonly found: Record<string, Answer>;
	readonly missing: Questions;
	/** The tokens and latency the found answers cost when first asked. */
	readonly usage: { input_tokens: number; output_tokens: number };
	readonly latencyMs: number;
	readonly models: readonly string[];
};

/** The bucket's answers to `questions`, and the questions it lacks; `keys` holds each question's key. */
export function lookupIn(
	bucket: Bucket,
	questions: Questions,
	keys: ReadonlyMap<string, string>,
): Lookup {
	const found: Record<string, Answer> = {};
	const missing: Record<string, Question> = {};
	const byRequest = new Map<number, number>();
	for (const [id, question] of Object.entries(questions)) {
		const cached = bucket.answers[spelledAt(keys, id)];
		if (!cached) {
			missing[id] = question;
			continue;
		}
		found[id] = cached.answer;
		byRequest.set(cached.request, (byRequest.get(cached.request) ?? 0) + 1);
	}
	const usage = { input_tokens: 0, output_tokens: 0 };
	let latencyMs = 0;
	const models = new Set<string>();
	for (const [index, count] of byRequest) {
		const request = bucket.requests[index];
		if (!request) continue;
		// A request's whole question set costs what it cost; part of it
		// costs its share.
		const share =
			count >= request.questions ? 1 : count / request.questions;
		usage.input_tokens += Math.round(request.usage.input_tokens * share);
		usage.output_tokens += Math.round(request.usage.output_tokens * share);
		latencyMs = Math.max(latencyMs, request.latencyMs);
		models.add(request.model);
	}
	return { found, missing, usage, latencyMs, models: [...models] };
}
