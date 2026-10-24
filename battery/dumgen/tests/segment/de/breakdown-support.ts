import type { Question } from "@typesafe-ai/sdk";
import type * as Dumling from "dumling/types";
import type { Answers, AskRequest } from "../../../src/segment/ask.js";
import type {
	BreakdownInput,
	ProducedPiece,
} from "../../../src/segment/breakdown.js";
import { asked, noul, picked } from "./fake-judge.js";

/** A German Reading to break down. */
export const input = (
	family: string,
	kind: string,
	canonicalForm: string,
	emojiDescription = "🧪",
): BreakdownInput => ({
	reading: {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family,
			kind,
			canonicalForm,
			coreFeatures: {},
		},
		emojiDescription,
	} as Dumling.Reading,
});

/**
 * A judge that picks, in every Choice, the option `wanted` names for its
 * id (`r_0=Lexeme/PRON`), else the option whose text is among `wanted`,
 * else the last one, and says yes to a Noul that quotes a wanted
 * text. It records every request.
 */
export function judgeWanting(...wanted: string[]) {
	const requests: AskRequest[] = [];
	const ask = asked((request) => {
		requests.push(request);
		return Object.fromEntries(
			Object.entries(request.questions).map(
				([id, question]: [string, Question]) => {
					if (question.type === "noul")
						return [
							id,
							noul(
								wanted.some((text) =>
									String(question.instructions).includes(
										`"${text}"`,
									),
								)
									? 0.9
									: 0.1,
							),
						];
					const criteria =
						question.type === "choice" ? question.criteria : {};
					const keys = Object.keys(criteria);
					const byId = wanted
						.find((text) => text.startsWith(`${id}=`))
						?.slice(id.length + 1);
					if (byId !== undefined) return [id, picked(byId)];
					const hit = keys.find(
						(key) =>
							wanted.includes(key) ||
							wanted.includes(String(criteria[key])),
					);
					return [id, picked(hit ?? keys.at(-1) ?? "")];
				},
			),
		) satisfies Answers;
	});
	return {
		ask,
		stages: () => requests.map(({ stage }) => stage),
		requests: (): readonly AskRequest[] => requests,
	};
}

/** Pieces as `letters→Family/Kind:form`, filler as its letters. */
export const shown = (pieces: readonly ProducedPiece[]) =>
	pieces.map(({ letters, target }) =>
		target
			? `${letters}→${target.family}/${target.kind}:${target.canonicalForm}`
			: letters,
	);
