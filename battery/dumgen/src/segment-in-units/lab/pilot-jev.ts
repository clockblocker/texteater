import { type Answers, Jev } from "./jev.js";

const framingAllowance = 4096;
const serializedBytes = (value: unknown) =>
	Buffer.byteLength(JSON.stringify(value), "utf8");

/**
 * UTF-8 bytes bound tokens conservatively, with extra room for service framing.
 * Split batches only; a single overlong question fails before dispatch.
 */
export class PilotJev extends Jev {
	override async ask(args: Parameters<Jev["ask"]>[0]): Promise<Answers> {
		const entries = Object.entries(args.questions);
		if (entries.length === 0) return {};
		const stateBytes = serializedBytes(args.state);
		for (const [, question] of entries)
			if (
				stateBytes + serializedBytes(question) + framingAllowance >
				32_768
			)
				throw Error(
					"Pilot state plus longest question exceeds the conservative 32K bound",
				);
		const maximumQuestions = args.questionsPerCall ?? this.questionsPerCall;
		const chunks: (typeof entries)[] = [];
		let chunk: typeof entries = [];
		for (const entry of entries) {
			const proposed = [...chunk, entry];
			const requestBytes = serializedBytes({
				model: this.model,
				state: args.state,
				questions: Object.fromEntries(proposed),
			});
			if (
				chunk.length > 0 &&
				(proposed.length > maximumQuestions ||
					requestBytes + framingAllowance > 65_536)
			) {
				chunks.push(chunk);
				chunk = [entry];
			} else chunk = proposed;
		}
		if (chunk.length > 0) chunks.push(chunk);
		const answers: Record<string, Answers[string]> = {};
		for (const [index, questions] of chunks.entries()) {
			const result = await super.ask({
				...args,
				// Sequential batches need separate latency stages in the inherited metrics.
				stage: `${args.stage}:batch${index}`,
				questions: Object.fromEntries(questions),
				questionsPerCall: questions.length,
			});
			Object.assign(answers, result);
		}
		return answers;
	}
}
