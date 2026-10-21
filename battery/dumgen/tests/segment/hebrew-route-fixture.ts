import { expect } from "bun:test";
import * as Effect from "effect/Effect";
import type { Ask, AskRequest } from "../../src/segment/ask.js";
import { segmentHebrewUnits } from "../../src/segment/he/units.js";
import type { Route } from "../../src/segment/segmented-sentence.js";
import { picked } from "./hebrew-choices.js";

/** Exact local fixture answers, not a linguistic classifier. Unlisted units
 * deliberately abstain: boundary-only fixtures do not establish their identity. */
export function routeAnswers(
	request: AskRequest,
	choices: Readonly<Record<string, string>> = {},
) {
	expect(request.stage).toBe("route");
	expect(request.state).not.toHaveProperty("candidates");
	const units = request.state.units as Readonly<Record<string, string>>;
	return Object.fromEntries(
		Object.entries(request.questions).map(([id, question]) => {
			expect(id).toStartWith("route_");
			expect(question.type).toBe("choice");
			const unit = units[id.replace("route_", "unit_")];
			expect(unit).toBeString();
			const text =
				unit
					?.split(" | ")
					.map((member) => member.slice(member.indexOf(":") + 1))
					.join(" + ") ?? "";
			const answer = choices[text] ?? "Unresolved";
			if (question.type === "choice")
				expect(question.criteria).toHaveProperty(answer);
			return [id, picked(answer)];
		}),
	);
}

/** Preserve membership-only callbacks; answer the distinct route protocol with
 * explicit abstention unless this case also supplies a grammatical identity. */
export function segmentHebrewMembership(
	segmentation: Parameters<typeof segmentHebrewUnits>[0],
	membership: Ask,
	choices: Readonly<Record<string, string>> = {},
) {
	return segmentHebrewUnits(segmentation, (request) => {
		if (request.stage === "route")
			return Effect.succeed(routeAnswers(request, choices));
		expect(request.stage).toBe("units");
		expect(request.state).toHaveProperty("candidates");
		return membership(request);
	});
}

type HebrewLexemeRoute = Extract<Route<"he">, { family: "Lexeme" }>;
export const lexeme = (kind: HebrewLexemeRoute["kind"]): HebrewLexemeRoute => ({
	language: "he",
	family: "Lexeme",
	kind,
});
