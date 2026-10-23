/**
 * The resolve.reading tests' shared fixture: the Reading gold cases, a dev
 * sample, a frozen set root and transports that answer as gold does.
 */
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isRecord } from "common-utils";
import {
	armsOf,
	freezeReadingSets,
	type ReadingCase,
	readingCases,
} from "../../../lab/evaluation/resolve-reading/cases.js";
import {
	goldReadingAnswers,
	readingOracle,
} from "../../../lab/evaluation/resolve-reading/oracle.js";
import type { LunaAsk } from "../../../src/luna.js";
import { markedSentence } from "../../../src/resolve/reading.js";
import type { JevAsk } from "../../../src/segment/jev.js";

const repository = resolve(import.meta.dir, "../../../../..");
export const { dev, heldout } = readingCases();

const find = (test: (goldCase: ReadingCase) => boolean, what: string) => {
	const found = dev.find(test);
	if (!found) throw Error(`No dev case ${what}`);
	return found;
};

/** An open case with another gold Reading, one with none, an authored one with several, and es gibt. */
export const sample = [
	find(
		(goldCase) => !goldCase.authored && goldCase.lemmaReadings.length > 1,
		"of an open Lemma with two gold Readings",
	),
	find(
		(goldCase) =>
			!goldCase.authored &&
			goldCase.lemmaReadings.length === 1 &&
			goldCase.rejected.length === 0,
		"of an open Lemma with one gold Reading",
	),
	find(
		(goldCase) =>
			goldCase.authored &&
			goldCase.attestation.surface.lemma.canonicalForm === "doch",
		"of authored doch",
	),
	find((goldCase) => goldCase.rejected.length > 0, "of es gibt"),
];

export async function frozenRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "resolve-reading-"));
	await freezeReadingSets(join(root, "sets"), repository, {
		dev: sample,
		heldout: heldout.slice(0, 1),
	});
	return root;
}

/**
 * The case a request is about, found by its marked Sentence and Lemma; a
 * Canonical Form call that drafts the description carries no Lemma, only
 * the marked Sentence in `emojiDescriptionInput`.
 */
const caseOf = (input: unknown) => {
	const fields = isRecord(input) ? input : {};
	const draft = isRecord(fields.emojiDescriptionInput)
		? fields.emojiDescriptionInput
		: undefined;
	const marked = draft ? draft.markedSentence : fields.markedSentence;
	const found = sample.find(
		(goldCase) =>
			markedSentence(
				goldCase.sentence.segments,
				goldCase.unit.segments,
			) === marked &&
			(draft !== undefined ||
				goldCase.attestation.surface.lemma.canonicalForm ===
					fields.lemma),
	);
	if (!found) throw Error("No case for this request");
	return found;
};

/** Gold's answer to a Luna request: the drafting Canonical Form call's, or the description alone. */
export const lunaGold = (input: unknown) =>
	readingOracle.written({ goldCase: caseOf(input), arm: "present" }, input);

/** Every attempt of the sample, three repetitions each. */
export const sampleAttempts = sample.reduce(
	(sum, goldCase) => sum + armsOf(goldCase).length * 3,
	0,
);

/**
 * Transports that answer as gold does, counting their calls. `wrong`
 * makes the judge's nth answer pick another stored option than gold's.
 */
export function goldTransports(wrong?: number) {
	const counter = { jev: 0, luna: 0, drafts: 0 };
	const jev: JevAsk = async (request) => {
		counter.jev++;
		const goldCase = caseOf(request.state);
		const answers = goldReadingAnswers(
			{ goldCase, arm: "present" },
			request.questions,
		);
		const right =
			answers.reading?.type === "choice" && answers.reading.choice;
		const question = request.questions.reading;
		const other = Object.keys(
			question?.type === "choice" ? question.criteria : {},
		).find((option) => option !== right && option !== "NoMatch");
		return {
			model: request.model,
			answers:
				counter.jev === wrong && other
					? {
							reading: {
								type: "choice",
								choice: other,
								confidence: 1,
								probabilities: { [other]: 1 },
							},
						}
					: answers,
			usage: { input_tokens: 500, output_tokens: 1 },
		};
	};
	const luna: LunaAsk = async (request) => {
		counter.luna++;
		if (isRecord(request.input) && "emojiDescriptionInput" in request.input)
			counter.drafts++;
		return {
			output: lunaGold(request.input),
			metadata: { usage: { input_tokens: 900, output_tokens: 4 } },
		};
	};
	return { jev, luna, counter };
}
