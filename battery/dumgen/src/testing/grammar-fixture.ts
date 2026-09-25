import { stableJson } from "promptsmith";
import type { GrammarOutput } from "../concrete-lang/de/grammatical-resolution/project.js";
import type { DumgenOptions } from "../types.js";
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
				canonicalFormCandidate?: string;
				canonicalFormAlternatives?: string[];
				sentence?: string;
				target?: { memberSegmentIndices: number[] };
				reviewedIdentities: {
					canonicalForm: string;
					coreFeatures: unknown;
				}[];
				candidates?: Record<string, string[]>;
				lexicalStringCandidates?: Record<string, string[]>;
				referentCells?: Record<string, Record<string, unknown>>;
			};
			const moreContext =
				"decision" in output &&
				output.decision === "MoreContextRequired";
			return choiceAnswers(request.questions, (id) => {
				if (overrides[id]) return overrides[id];
				if (id === "referent") {
					if (moreContext) return "MoreContextRequired";
					const cells = Object.entries(state.referentCells ?? {});
					const core = (
						"lemma" in output ? output.lemma.coreFeatures : {}
					) as Record<string, unknown>;
					// A cell the expected Lemma takes, else any: code ignores the
					// answer when the judged Core lands outside the split.
					return (
						cells.find(([, cell]) =>
							Object.entries(cell).every(
								([name, value]) => core[name] === value,
							),
						)?.[0] ??
						cells[0]?.[0] ??
						"Unresolved"
					);
				}
				if (id === "support")
					return "decision" in output && !moreContext
						? "Unresolved"
						: "Supported";
				if ("decision" in output) return "Unresolved";
				if (id === "attachment") {
					const evidence = output.articleEvidence;
					if (!evidence) return "None";
					const sourceIndex =
						evidence.kind === "Owned"
							? state.target?.memberSegmentIndices[
									evidence.member
								]
							: evidence.kind === "Shared"
								? [
										...(state.sentence ?? "").matchAll(
											/<s(\d+)>(.*?)<\/s\d+>/gu,
										),
									].find(
										(match) =>
											match[2] ===
											evidence.article.attested,
									)?.[1]
								: undefined;
					const question = request.questions[id];
					if (question?.type !== "choice")
						throw Error("Expected attachment choice");
					// A spelling standing for several articles ('n) names its form.
					const keys = Object.keys(question.criteria).filter((key) =>
						new RegExp(`_s${sourceIndex}(?:_|$)`, "u").test(key),
					);
					return (
						(keys.length > 1
							? keys.find((key) =>
									output.normalizedMembers.some((member) =>
										key.endsWith(`_${member}`),
									),
								)
							: keys[0]) ?? "Unresolved"
					);
				}
				if (id.startsWith("surface_")) {
					const question = request.questions[id];
					if (question?.type !== "choice")
						throw Error("Expected surface choice");
					const normalized =
						output.normalizedMembers[Number(id.slice(8))];
					return (
						Object.entries(question.criteria).find(
							([, surface]) => surface === normalized,
						)?.[0] ?? "Unresolved"
					);
				}
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
				const governed = output.valencyEvidence?.find(
					(slot) => slot.member !== null,
				);
				if (id === "governedPreposition")
					return governed ? `member_${governed.member}` : "Absent";
				if (id === "governedCase")
					return governed?.complement.case ?? "Unresolved";
				if (id === "realizedCase")
					return (
						output.valencyEvidence?.find(
							(slot) =>
								slot.member === null &&
								slot.complement.kind === "Case",
						)?.realizedCase ?? "None"
					);
				if (id === "governedReferent")
					return governed?.complement.referent === "Either"
						? "Unresolved"
						: (governed?.complement.referent ?? "Unresolved");
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
				if (
					id === "canonical" &&
					state.canonicalFormAlternatives?.includes(
						String(output.lemma.canonicalForm),
					)
				)
					return `candidate_${state.canonicalFormAlternatives.indexOf(String(output.lemma.canonicalForm))}`;
				if (id === "canonical")
					return state.canonicalFormCandidate ===
						output.lemma.canonicalForm
						? "CandidateIsCanonical"
						: "CandidateIsNotCanonical";
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
				if (id.startsWith("text.")) {
					// Speculative lexical string in the features round trip.
					const key = id.slice("text.".length);
					const expected = (
						output.lemma.coreFeatures as Record<string, unknown>
					)[key];
					const index =
						expected === null || expected === undefined
							? -1
							: (state.lexicalStringCandidates?.[key]?.indexOf(
									String(expected),
								) ?? -1);
					return index === -1 ? "Unresolved" : `text_${index}`;
				}
				let value: unknown = output;
				for (const key of id.split("."))
					value =
						value && typeof value === "object"
							? (value as Record<string, unknown>)[key]
							: undefined;
				if (id.endsWith("hasSepPrefix"))
					return value ? "Present" : "Absent";
				return value === undefined
					? "Unresolved"
					: value === null
						? "Unmarked"
						: String(value);
			});
		},
		execute: async (request) => {
			if (request.stage === "generateCanonicalForm")
				return { output: output.lemma.canonicalForm };
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
