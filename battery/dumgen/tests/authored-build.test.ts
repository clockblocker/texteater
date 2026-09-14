import { expect, test } from "bun:test";
import { validateAuthoredCatalog } from "../codegen/validate-authored-catalog.js";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";

const member = authoredMembers[0]!;

test("the build accepts the complete authored catalog without changing its data", () => {
	const before = JSON.stringify(authoredMembers);
	validateAuthoredCatalog(authoredMembers);
	expect(JSON.stringify(authoredMembers)).toBe(before);
});

test("the build rejects a structurally typed Reading with invalid emoji content", () => {
	expect(() =>
		validateAuthoredCatalog([
			{
				...member,
				reading: { ...member.reading, emojiDescription: "invalid" },
			},
		]),
	).toThrow();
});

test("the build rejects invalid Knowledge even when its owning Reading is valid", () => {
	expect(() =>
		validateAuthoredCatalog([
			{ ...member, knowledge: { translations: { en: [] } } },
		]),
	).toThrow();
});
