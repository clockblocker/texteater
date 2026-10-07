import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { grammarCases } from "../../lab/evaluation/resolve-grammar/cases.js";
import { goldWritten } from "../../lab/evaluation/resolve-grammar/oracle.js";
import { createDumgen } from "../../src/create-dumgen.js";
import { InvalidModelOutput } from "../../src/errors.js";
import { picked } from "./support.js";

const seed = 952;

/** mulberry32: a small seeded generator, so a seed always draws the same answers. */
function generator(start: number): () => number {
	let state = start >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Any option of a Choice but Unresolved, drawn at random. */
function anyOption(question: Question, random: () => number): string {
	if (question.type !== "choice")
		throw Error(`resolve.grammar asked a ${question.type} question`);
	const options = Object.keys(question.criteria).filter(
		(option) => option !== "Unresolved",
	);
	return options[Math.floor(random() * options.length)] ?? "Unresolved";
}

/**
 * A judge that picks any valid option and a writer that answers as gold
 * does: answers that contradict each other are Unresolved, so whatever
 * Dumling still rejects is Dumgen's own bug (#952). Luna refusing a
 * spelling gold wrote for other answers is allowed.
 */
test("no combination of valid answers makes an invalid Attestation", async () => {
	const { dev, heldout } = grammarCases();
	const cases = [...dev, ...heldout];
	const random = generator(seed);
	const tally: Record<string, number> = {};
	const failures: string[] = [];
	for (const goldCase of cases) {
		const dumgen = createDumgen({
			jev: async (request) => ({
				model: request.model,
				answers: Object.fromEntries(
					Object.entries(request.questions).map(([id, question]) => [
						id,
						picked(anyOption(question, random)),
					]),
				),
				usage: { input_tokens: 0, output_tokens: 0 },
			}),
			luna: async (request) => ({
				output: goldWritten(goldCase, request.input),
			}),
		});
		const exit = await Effect.runPromiseExit(
			dumgen.resolve.grammar({
				language: "de",
				sentence: goldCase.sentence,
				unit: goldCase.unit,
				neighbours: {},
				lemmaCandidates: [],
			}),
		);
		const outcome = Exit.isSuccess(exit)
			? exit.value._tag
			: Cause.squash(exit.cause) instanceof InvalidModelOutput
				? "InvalidModelOutput"
				: "Defect";
		tally[outcome] = (tally[outcome] ?? 0) + 1;
		if (outcome === "Defect" && Exit.isFailure(exit))
			failures.push(`${goldCase.id}: ${Cause.squash(exit.cause)}`);
	}
	expect(cases.length).toBeGreaterThan(2000);
	expect(tally.Resolved ?? 0).toBeGreaterThan(cases.length / 4);
	expect(failures).toEqual([]);
	// Over 2,000 resolutions take about two seconds alone, and several
	// times that while Turbo runs other packages' gates alongside.
}, 30_000);
