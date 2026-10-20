import { expect, test } from "bun:test";
import { isRecord } from "common-utils";
import {
	knowledgeInput,
	knowledgeJev,
	knowledgeLuna,
	produceOnce,
} from "./support.js";

const noun = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Strauß",
	coreFeatures: { gender: "Masc" },
};
test("relation candidates are judged in one request that states the policy once; each relation keeps its three most confident claims (#697, ADR 0003)", async () => {
	const candidates = [
		"Gaul",
		"Ross",
		"Mähre",
		"Klepper",
		"Pferd",
		"Tier",
		"Huftier",
		"auf dem hohen Ross sitzen",
	];
	// "Pferd" is the source and drops out, so indices count from "Gaul".
	const picks: Record<string, { choice: string; confidence: number }> = {
		relation_0: { choice: "synonym", confidence: 0.9 },
		relation_1: { choice: "synonym", confidence: 0.8 },
		relation_2: { choice: "synonym", confidence: 0.7 },
		relation_3: { choice: "synonym", confidence: 0.95 },
		relation_4: { choice: "hypernym", confidence: 0.9 },
		relation_5: { choice: "Unsure", confidence: 0.6 },
		relation_6: { choice: "None", confidence: 0.9 },
	};
	const jev = knowledgeJev((id) =>
		id.startsWith("kind_")
			? id === "kind_6"
				? "VERB"
				: "NOUN"
			: picks[id],
	);
	const luna = knowledgeLuna({ relationCandidates: candidates });
	const { result } = await produceOnce(
		{ jev: jev.ask, luna: luna.ask },
		knowledgeInput(
			{
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Pferd",
				coreFeatures: { gender: "Neut" },
			},
			"🐎",
			"Das Pferd wiehert.",
			["Pferd"],
			{
				request: {
					semanticRelations: { synonym: null, hypernym: null },
				},
			},
		),
	);
	expect(result.failures).toEqual([]);
	expect(result.pendingRelations).toEqual([
		{
			relation: "synonym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Klepper",
			},
		},
		{
			relation: "synonym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Gaul",
			},
		},
		{
			relation: "synonym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Ross",
			},
		},
		{
			relation: "hypernym",
			target: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Tier",
			},
		},
	]);
	expect(jev.stages()).toEqual(["relationJudgment"]);
	const request = jev.sent[0];
	// The source itself is never a candidate.
	expect(request?.state.candidates).not.toContain("Pferd");
	// The policy and definitions are stated once, in the state.
	expect(request?.state).toHaveProperty("policy");
	expect(
		Object.keys(
			isRecord(request?.state.relations) ? request.state.relations : {},
		),
	).toEqual(["synonym", "hypernym"]);
	const questions = Object.values(request?.questions ?? {});
	const text = JSON.stringify(questions);
	expect(text).not.toContain("Oberbegriff");
	// No bare or undefined Kinds: no AUX, PUNCT or Collocation option (#669).
	const kindOptions = new Set(
		questions.flatMap((question) =>
			question.type === "choice"
				? Object.keys(question.criteria ?? {})
				: [],
		),
	);
	for (const bare of ["AUX", "PUNCT", "SYM", "Collocation"])
		expect(kindOptions.has(bare)).toBe(false);
	expect(
		Object.keys(isRecord(request?.state.kinds) ? request.state.kinds : {}),
	).toContain("NOUN");
	// A multiword candidate is a Locution, a one-word one a Lexeme.
	expect(JSON.stringify(request?.questions.kind_6?.instructions)).toContain(
		"Locution",
	);
	expect(JSON.stringify(request?.questions.kind_0?.instructions)).toContain(
		"Lexeme",
	);
});

test("a failed candidate call fails every requested relation at once, as one failure with no leaf", async () => {
	const { result } = await produceOnce(
		{
			jev: knowledgeJev().ask,
			luna: knowledgeLuna({
				relationCandidates: new Error("Luna is down"),
			}).ask,
		},
		knowledgeInput(noun, "💐", "Sie bekam einen Strauß.", ["Strauß"], {
			request: { semanticRelations: { synonym: null } },
		}),
	);
	expect(result.failures).toEqual([
		{
			aspect: "semanticRelations",
			code: "ProviderFailure",
			message: "Luna is down",
		},
	]);
});
