import { isRecord } from "common-utils";
import { normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";
import { parseKnowledgeChange } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { InvalidModelOutput } from "../../errors.js";

/** Keep independently valid cells unchanged; never infer a missing form or feature. */
export function knownHebrewParadigm(
	source: Dumling.Reading<"he">,
	output: unknown,
) {
	if (
		!isRecord(output) ||
		Object.keys(output).length !== 1 ||
		!Array.isArray(output.forms) ||
		output.forms.length < 1 ||
		output.forms.length > 100
	)
		return new InvalidModelOutput({
			stage: "hebrewParadigm",
			message: "Expected a Hebrew paradigm object with one to 100 forms",
		});
	const forms: NonNullable<
		Dumrel.ReadingKnowledge["hebrewParadigm"]
	>["forms"] = [];
	const indexes: number[] = [];
	const omitted: number[] = [];
	for (const [index, cell] of output.forms.entries()) {
		const parsed = parseKnowledgeChange({
			source,
			change: {
				kind: "Contribute",
				aspect: "hebrewParadigm",
				value: { forms: [cell] },
			},
		});
		if (
			!parsed.success ||
			parsed.value.kind !== "Contribute" ||
			parsed.value.aspect !== "hebrewParadigm"
		) {
			omitted.push(index);
			continue;
		}
		const form = parsed.value.value.forms[0]?.form;
		if (
			(source.lemma.kind === "NOUN" || source.lemma.kind === "ADJ") &&
			!/\s/u.test(source.lemma.canonicalForm) &&
			form !== undefined &&
			/\s/u.test(form.trim())
		) {
			omitted.push(index);
			continue;
		}
		forms.push(...parsed.value.value.forms);
		indexes.push(index);
	}
	// Competing Ind/Def claims cannot establish which one is true: omit both.
	// Ind/Cons syncretism is legitimate and does not establish a conflict.
	const seen = new Set<string>();
	const consistent = forms.filter((cell, index) => {
		if (
			source.lemma.kind === "NOUN" &&
			(cell.features.definite === "Def" ||
				cell.features.definite === "Ind") &&
			forms.some(
				(other) =>
					normalizeForm(other.form) === normalizeForm(cell.form) &&
					other.features.number === cell.features.number &&
					other.features.definite ===
						(cell.features.definite === "Def" ? "Ind" : "Def"),
			)
		) {
			omitted.push(indexes[index] ?? index);
			return false;
		}
		const { form, features } = cell;
		// Match Dumrel's uniqueness comparison, but retain the first literal form.
		const signature = JSON.stringify([
			normalizeForm(form),
			Object.entries(features).sort(([a], [b]) => a.localeCompare(b)),
		]);
		if (seen.has(signature)) {
			omitted.push(indexes[index] ?? index);
			return false;
		}
		seen.add(signature);
		return true;
	});
	if (consistent.length === 0)
		return new InvalidModelOutput({
			stage: "hebrewParadigm",
			message: "No independently valid Hebrew paradigm cells remain",
		});
	return { value: { forms: consistent }, omitted };
}
