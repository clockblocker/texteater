import { stableJson } from "promptsmith";
import type { GrammarOutput } from "../src/concrete-lang/de/grammatical-resolution/project.js";
import type { DumgenOptions } from "../src/types.js";
import { choiceAnswers } from "./execution-fixture.js";

/** Inject a reviewed expected analysis as separate bounded answers and requested text. */
export function grammarFixture(
	expected: unknown,
	overrides: Record<string, string> = {},
): DumgenOptions {
	const output = expected as GrammarOutput;
	return {
		judge: async (request) => {
			if (expected instanceof Error) throw expected;
			if (
				!output ||
				typeof output !== "object" ||
				(!("decision" in output) && (!output.lemma || !output.surface))
			)
				return {
					model: "malformed",
					usage: { input_tokens: 0, output_tokens: 0 },
					answers: {},
				} as import("promptsmith/typesafe").SystemOneResult<
					typeof request.questions
				>;
			const state = request.state as {
				members: string[];
				canonicalCandidates: string[];
				reviewedIdentities: {
					canonicalForm: string;
					coreFeatures: unknown;
				}[];
				candidates?: Record<string, string[]>;
			};
			return choiceAnswers(request.questions, (id) => {
				if (overrides[id]) return overrides[id];
				if (id === "support")
					return "decision" in output ? "Unresolved" : "Supported";
				if ("decision" in output) return "Unresolved";
				if (id === "spelling") return String(output.surface.spelling);
				if (id === "historicalStatus")
					return output.surface.surfaceFeatures
						? "Archaic"
						: "Current";
				if (id === "inflection")
					return output.surface.inflectionalFeatures
						? "Marked"
						: "Citation";
				if (id === "coverage") return output.realizationCoverage;
				if (id === "identity") {
					const index = state.reviewedIdentities.findIndex(
						(lemma) =>
							lemma.canonicalForm ===
								output.lemma.canonicalForm &&
							stableJson(lemma.coreFeatures) ===
								stableJson(output.lemma.coreFeatures),
					);
					return index === -1 ? "NoMatch" : `identity_${index}`;
				}
				if (id === "canonical") {
					const index = state.canonicalCandidates.indexOf(
						String(output.lemma.canonicalForm),
					);
					return index === -1 ? "Generate" : `copy_${index}`;
				}
				if (id.startsWith("orthography_"))
					return output.memberOrthographies[Number(id.slice(12))]!;
				if (id.startsWith("normalization_")) {
					const index = Number(id.slice(14)),
						raw = state.members[index]!,
						normalized = output.normalizedMembers[index];
					if (raw === normalized) return "Keep";
					if (
						raw.slice(0, 1).toLocaleLowerCase("de") +
							raw.slice(1) ===
						normalized
					)
						return "LowerInitial";
					if (
						raw.slice(0, 1).toLocaleUpperCase("de") +
							raw.slice(1) ===
						normalized
					)
						return "UpperInitial";
					return "Generate";
				}
				if (state.candidates?.[id])
					return `text_${state.candidates[id]!.indexOf(String((output.lemma.coreFeatures as Record<string, unknown>)[id]))}`;
				let value: unknown = output;
				for (const key of id.split("."))
					value =
						value && typeof value === "object"
							? (value as Record<string, unknown>)[key]
							: undefined;
				if (id.endsWith("hasSepPrefix") || id.endsWith("hasGovPrep"))
					return value ? "Present" : "Absent";
				return value === undefined
					? "Unresolved"
					: value === null
						? "Unmarked"
						: String(value);
			});
		},
		execute: async (request) => {
			const needed = (request.input as { needed: Record<string, string> })
				.needed;
			if (!needed)
				throw Error(
					"Generation must contain only requested missing text",
				);
			return {
				output: Object.fromEntries(
					Object.keys(needed).map((key) => [
						key,
						key === "canonicalForm"
							? output.lemma.canonicalForm
							: output.normalizedMembers[Number(key.slice(7))],
					]),
				),
			};
		},
	};
}
