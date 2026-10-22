/**
 * Golden requests (#1271): the operations no evaluate experiment's request
 * diff covers (`language.detect`, `translate.sentence`,
 * `knowledge.accumulateTranslations`) run on fixed inputs against fake
 * transports that record every request they are sent, whole, and answer
 * it deterministically. Each scenario's requests, in sorted order, and its
 * result are kept in `fixtures/<operation>.json`.
 *
 * A refactor that moves no request matches the fixtures unchanged; the
 * Effect core's slices (#1267) are held to them. Rewrite them only for a
 * change that is meant to move requests: run the tests with
 * `DUMGEN_WRITE_GOLDEN=1`, then `bun run fix` to format the JSON.
 */
import { expect } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Question } from "@typesafe-ai/sdk";
import { messageOf } from "common-utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { createDumgen, type Dumgen } from "../../src/create-dumgen.js";
import type { LunaAsk, LunaRequest } from "../../src/luna.js";
import type { JevAsk, JevRequest } from "../../src/segment/jev.js";

/** One request a transport was sent, whole, with the stage that sent it. */
type GoldenRequest =
	| {
			readonly executor: "jev";
			readonly stage: string;
			readonly request: JevRequest;
	  }
	| {
			readonly executor: "luna";
			readonly stage: string;
			readonly request: LunaRequest;
	  };

/** What a fake jev answers one question: a Choice's option, or a Noul. */
type JevPick = string | { readonly noul: number };

/** Answers each jev question from its request, its id and the question. */
export type JevAnswerer = (args: {
	readonly stage: string;
	readonly state: JevRequest["state"];
	readonly id: string;
	readonly question: Question;
}) => JevPick;

/** Answers each Luna request with an output, from the request alone. */
export type LunaAnswerer = (args: {
	readonly stage: string;
	readonly input: unknown;
}) => unknown;

const neverJev: JevAnswerer = ({ stage }) => {
	throw Error(`No jev answer for ${stage}`);
};
const neverLuna: LunaAnswerer = ({ stage }) => {
	throw Error(`No Luna answer for ${stage}`);
};

/** The order requests are kept in: concurrent calls may send theirs in any order. */
const sorted = (requests: readonly GoldenRequest[]) =>
	requests
		.map((request) => ({ request, key: JSON.stringify(request) }))
		.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
		.map(({ request }) => request);

/**
 * Runs `operation` on a Dumgen whose jev and Luna record each request and
 * answer it as `jev` and `luna` say; a request either has no answer for
 * fails its call. Out come the requests, sorted, and the result, or the
 * failure's message.
 */
export async function recorded(
	operation: (dumgen: Dumgen) => Effect.Effect<unknown, unknown>,
	answer: { readonly jev?: JevAnswerer; readonly luna?: LunaAnswerer },
) {
	const requests: GoldenRequest[] = [];
	const answerJev = answer.jev ?? neverJev;
	const answerLuna = answer.luna ?? neverLuna;
	const jev: JevAsk = async (request, { stage }) => {
		requests.push({ executor: "jev", stage, request });
		const answers = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				const pick = answerJev({
					stage,
					state: request.state,
					id,
					question,
				});
				return [
					id,
					typeof pick === "string"
						? {
								type: "choice",
								choice: pick,
								confidence: 0.9,
								probabilities: { [pick]: 0.9 },
							}
						: { type: "noul", noul: pick.noul },
				];
			}),
		);
		return {
			model: request.model,
			answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		};
	};
	const luna: LunaAsk = async (request, { stage }) => {
		requests.push({ executor: "luna", stage, request });
		return {
			output: answerLuna({ stage, input: request.input }),
			metadata: { usage: { input_tokens: 40, output_tokens: 12 } },
		};
	};
	const exit = await Effect.runPromiseExit(
		operation(createDumgen({ jev, luna })),
	);
	return {
		requests: sorted(requests),
		result:
			exit._tag === "Success"
				? exit.value
				: { failure: messageOf(Cause.squash(exit.cause)) },
	};
}

const fixturesDirectory = join(import.meta.dir, "fixtures");

/**
 * Checks `scenarios` against `fixtures/<name>.json`, key order included,
 * since jev reads its request in the order it is written; with
 * `DUMGEN_WRITE_GOLDEN=1`, writes them there instead.
 */
export async function expectGolden(
	name: string,
	scenarios: Readonly<Record<string, unknown>>,
) {
	const path = join(fixturesDirectory, `${name}.json`);
	if (process.env.DUMGEN_WRITE_GOLDEN === "1") {
		await writeFile(path, `${JSON.stringify(scenarios, null, "\t")}\n`);
		return;
	}
	const golden: unknown = JSON.parse(await readFile(path, "utf8"));
	// Equal values first, for a readable diff; then equal key order.
	expect(JSON.parse(JSON.stringify(scenarios))).toEqual(golden);
	expect(JSON.stringify(scenarios)).toBe(JSON.stringify(golden));
}
