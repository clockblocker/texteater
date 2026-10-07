/**
 * How the German grammar stages ask and read: a questionnaire collects one
 * request's Choices and the policy paragraphs they cite, and a reading of
 * its answers stops the click at the first deciding question jev left
 * Unresolved (ADR 0023: nothing is asked again). A speculative question,
 * asked in the same request in case it applies, is read only where it
 * does.
 */
import type { EntryType, Questions } from "@typesafe-ai/sdk";
import { type Answers, choice, choiceOf } from "../../segment/ask.js";
import { type PolicyName, policy, question } from "./prompts.js";

declare const options: unique symbol;

/**
 * A Choice the questionnaire asked: its id, typed by the options jev may
 * answer, Unresolved aside.
 */
export type Choice<Option extends string = string> = {
	readonly id: string;
	readonly [options]?: Option;
};

/** The handle of a Choice that offers a table's options. */
export type ChoiceOf<Table> = Choice<keyof Table & string>;

/** The options `keys` names, labelled from `labels`, in `keys`' order. */
export function optionsOf<Option extends string>(
	keys: readonly Option[],
	labels: Readonly<Record<Option, string>>,
): Partial<Record<Option, string>> {
	const chosen: Partial<Record<Option, string>> = {};
	for (const key of keys) chosen[key] = labels[key];
	return chosen;
}

const idOf = (asked: Choice | string) =>
	typeof asked === "string" ? asked : asked.id;

/** Why a click came back Unresolved; caught where the click's outcome is decided. */
export class UnresolvedAnswer extends Error {
	readonly reason: string;
	constructor(reason: string) {
		super(reason);
		this.reason = reason;
		this.name = "UnresolvedAnswer";
	}
}

export class Questionnaire {
	readonly questions: Questions = {};
	readonly #policies = new Set<PolicyName>();

	/**
	 * Adds a Choice with its options and Unresolved, citing `policies`, and
	 * returns its handle, which reads the answer as one of those options.
	 */
	choice<const Criteria extends Readonly<Record<string, string | null>>>(
		id: string,
		instructions: string,
		criteria: Criteria,
		policies: readonly PolicyName[] = [],
	): Choice<keyof Criteria & string> {
		this.questions[id] = choice(instructions, {
			...criteria,
			Unresolved: question.unresolved,
		});
		for (const name of policies) this.#policies.add(name);
		return { id };
	}

	cite(...policies: readonly PolicyName[]): void {
		for (const name of policies) this.#policies.add(name);
	}

	get empty(): boolean {
		return Object.keys(this.questions).length === 0;
	}

	/** The policy block: the unit paragraph and every paragraph a question cites. */
	policyBlock(): Record<string, EntryType> {
		return Object.fromEntries(
			["unit" as const, ...this.#policies].map((name) => [
				name,
				policy[name],
			]),
		);
	}
}

/** One request's answers, read question by question. */
export class Answered {
	readonly answers: Answers;
	constructor(answers: Answers) {
		this.answers = answers;
	}

	/** A deciding answer: Unresolved stops the click. */
	pick<Option extends string>(asked: Choice<Option>): Option;
	pick(id: string): string;
	pick(asked: Choice | string): string {
		const id = idOf(asked);
		const { choice: answer } = choiceOf(this.answers, id);
		if (answer === "Unresolved")
			throw new UnresolvedAnswer(`Unresolved ${id}`);
		return answer;
	}

	/**
	 * A deciding answer's other options jev gave some weight, most likely
	 * first, its own and Unresolved left out: code holding hard evidence
	 * against the answer reads on to the likeliest option the evidence
	 * allows, instead of asking again (ADR 0023).
	 */
	alternatives<Option extends string>(
		asked: Choice<Option>,
		floor?: number,
	): readonly Option[];
	alternatives(id: string, floor?: number): readonly string[];
	alternatives(asked: Choice | string, floor = 0.05): readonly string[] {
		const { choice: answer, probabilities } = choiceOf(
			this.answers,
			idOf(asked),
		);
		return Object.entries(probabilities)
			.filter(
				([option, probability]) =>
					option !== answer &&
					option !== "Unresolved" &&
					probability >= floor,
			)
			.sort(([, left], [, right]) => right - left)
			.map(([option]) => option);
	}

	/** A speculative answer, undefined when it was not asked or came back Unresolved. */
	peek<Option extends string>(asked: Choice<Option>): Option | undefined;
	peek(id: string): string | undefined;
	peek(asked: Choice | string): string | undefined {
		const id = idOf(asked);
		if (!(id in this.answers)) return undefined;
		const { choice: answer } = choiceOf(this.answers, id);
		return answer === "Unresolved" ? undefined : answer;
	}
}
