import { expect, test } from "bun:test";
import { validateAuthoredCatalog } from "../codegen/validate-authored-catalog.js";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import type { AuthoredMember } from "../src/concrete-lang/de/authored-closed-sets/member.js";

const member = authoredMembers[0];
if (!member) throw Error("Expected the authored catalog to contain a member");

const complete: AuthoredMember = {
	...member,
	knowledge: {
		...member.knowledge,
		transcription: "deːɐ̯",
		translations: {
			...member.knowledge.translations,
			ru: ["определённый артикль"],
		},
	},
	coverage: {
		...member.coverage,
		transcription: "Authored",
		translations: { ...member.coverage.translations, ru: "Authored" },
	},
};

test.each(["transcription", "definition"] as const)(
	"the build rejects missing required %s",
	(aspect) => {
		const knowledge = { ...complete.knowledge };
		delete knowledge[aspect];
		expect(() =>
			validateAuthoredCatalog([{ ...complete, knowledge }]),
		).toThrow(aspect);
	},
);

test.each(["en", "ru"] as const)(
	"the build rejects missing advertised translation %s",
	(language) => {
		const translations = { ...complete.knowledge.translations };
		delete translations[language];
		expect(() =>
			validateAuthoredCatalog([
				{
					...complete,
					knowledge: { ...complete.knowledge, translations },
				},
			]),
		).toThrow(`translations/${language}`);
	},
);

test("the build rejects unreviewed relation coverage", () => {
	expect(() =>
		validateAuthoredCatalog([
			{
				...complete,
				coverage: {
					...complete.coverage,
					semanticRelations: {
						...complete.coverage.semanticRelations,
						antonym: "Unauthored",
					},
				},
			},
		]),
	).toThrow("semanticRelations/antonym");
});

test("the build rejects a ReviewedEmpty claim with stored relation targets", () => {
	expect(() =>
		validateAuthoredCatalog([
			{
				...complete,
				coverage: {
					...complete.coverage,
					semanticRelations: {
						...complete.coverage.semanticRelations,
						synonym: "ReviewedEmpty",
					},
				},
			},
		]),
	).toThrow("semanticRelations/synonym");
});

test("the build rejects unauthored coverage for stored required text", () => {
	expect(() =>
		validateAuthoredCatalog([
			{
				...complete,
				coverage: { ...complete.coverage, transcription: "Unauthored" },
			},
		]),
	).toThrow("transcription");
});

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
