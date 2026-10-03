/**
 * How the German grammar stages ask and read: a questionnaire collects one
 * request's Choices and the policy paragraphs they cite, and a reading of
 * its answers stops the click at the first deciding question jev left
 * Unresolved (ADR 0023: nothing is asked again). A speculative question,
 * asked in the same request in case it applies, is read only where it
 * does.
 */
import type { EntryType, Questions } from "promptsmith/typesafe";
import { type Answers, choice, choiceOf } from "../../segment/ask.js";
import { type PolicyName, policy, question } from "./prompts.js";

/** Why a click came back Unresolved; caught where the click's outcome is decided. */
export class UnresolvedAnswer extends Error {
	constructor(readonly reason: string) {
		super(reason);
		this.name = "UnresolvedAnswer";
	}
}

export class Questionnaire {
	readonly questions: Questions = {};
	readonly #policies = new Set<PolicyName>();

	/** Adds a Choice with its options and Unresolved, citing `policies`. */
	choice(
		id: string,
		instructions: string,
		criteria: Readonly<Record<string, string | null>>,
		policies: readonly PolicyName[] = [],
	): void {
		this.questions[id] = choice(instructions, {
			...criteria,
			Unresolved: question.unresolved,
		});
		for (const name of policies) this.#policies.add(name);
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
	constructor(readonly answers: Answers) {}

	/** A deciding answer: Unresolved stops the click. */
	pick(id: string): string {
		const { choice: answer } = choiceOf(this.answers, id);
		if (answer === "Unresolved")
			throw new UnresolvedAnswer(`Unresolved ${id}`);
		return answer;
	}

	/** A speculative answer, undefined when it was not asked or came back Unresolved. */
	peek(id: string): string | undefined {
		if (!(id in this.answers)) return undefined;
		const { choice: answer } = choiceOf(this.answers, id);
		return answer === "Unresolved" ? undefined : answer;
	}
}
