import { parseUnit } from "dumling";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { AuthoredMember } from "../src/concrete-lang/de/authored-closed-sets/member.js";
import { validateAuthoredRealizations } from "../src/concrete-lang/de/authored-closed-sets/realizations.js";

function field(value: unknown, key: string): unknown {
	return value && typeof value === "object" && key in value
		? (value as Record<string, unknown>)[key]
		: undefined;
}

/** Fails the build before packaging invalid or incomplete authored Knowledge. */
export function validateAuthoredCatalog(
	members: readonly AuthoredMember[],
): void {
	for (const member of members) {
		const unit = parseUnit(member.reading);
		if (!unit.success) throw unit.error;
		const knowledge = parseReadingKnowledge({
			source: member.reading,
			knowledge: member.knowledge,
		});
		if (!knowledge.success) throw knowledge.error;
		const { language, family, kind, canonicalForm } = member.lemma;
		const selected = selectKnowledge({
			route: {
				language,
				family,
				kind,
			} as Dumrel.KnowledgeSelectionInput["route"],
		});
		if (!selected.success) throw selected.error;
		const invalid = (path: string): never => {
			throw Error(
				`Incomplete authored Knowledge for ${language}/${family}/${kind}/${canonicalForm}: ${path}`,
			);
		};
		for (const [aspect, selection] of Object.entries(selected.value)) {
			const content = field(member.knowledge, aspect);
			const coverage = field(member.coverage, aspect);
			if (selection === null) {
				if (content === undefined || coverage !== "Authored")
					invalid(aspect);
				continue;
			}
			for (const leaf of Object.keys(selection)) {
				const value = field(content, leaf);
				const status = field(coverage, leaf);
				const path = `${aspect}/${leaf}`;
				if (aspect === "semanticRelations") {
					if (status === "ReviewedEmpty") {
						if (
							value !== undefined &&
							(!Array.isArray(value) || value.length)
						)
							invalid(path);
					} else if (
						status !== "Authored" ||
						!Array.isArray(value) ||
						!value.length
					) {
						invalid(path);
					}
				} else if (value === undefined || status !== "Authored") {
					invalid(path);
				}
			}
		}
		if (
			member.coverage.semanticRelationTargetKind !==
			(member.knowledge.semanticRelations?.targetKind ?? "lemma")
		) {
			invalid("semanticRelationTargetKind");
		}
	}
}

if (import.meta.main) {
	const { authoredMembers } = await import(
		"../src/concrete-lang/de/authored-closed-sets/inventory.js"
	);
	validateAuthoredCatalog(authoredMembers);
	validateAuthoredRealizations();
	console.log(
		`Validated ${authoredMembers.length} authored catalog members.`,
	);
}
