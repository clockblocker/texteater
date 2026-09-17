import { parseUnit } from "dumling";
import { parseReadingKnowledge } from "dumrel";
import type { AuthoredMember } from "../src/concrete-lang/de/authored-closed-sets/member.js";
import { validateAuthoredRealizations } from "../src/concrete-lang/de/authored-closed-sets/realizations.js";

/** Fails the build before packaging an invalid authored Reading or its Knowledge. */
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
