import { expect, test } from "bun:test";
import {
	createRegistryLookup,
	registeredBlockMap,
} from "../src/notes/renderer-registry";

const heading = () => null;

test("a new language registers content without changing universal route dispatch", () => {
	const lookup = createRegistryLookup({
		future: {
			Surface: { Heading: heading },
			Reading: { Lexeme: { NOUN: { Heading: heading } } },
		},
	});
	expect(lookup({ language: "future", noteKind: "Surface" })?.Heading).toBe(
		heading,
	);
	expect(
		lookup({
			language: "future",
			noteKind: "Reading",
			family: "Lexeme",
			kind: "NOUN",
		})?.Heading,
	).toBe(heading);
	expect(lookup({ language: "missing", noteKind: "Surface" })).toBeNull();
	expect(
		lookup({
			language: "future",
			noteKind: "Reading",
			family: "Lexeme",
			kind: "VERB",
		}),
	).toBeNull();
	expect(lookup({ language: "future", noteKind: "Reading" })).toBeNull();
});

test("German keeps its language-owned noun and verb overrides", () => {
	const noun = registeredBlockMap({
		language: "de",
		noteKind: "Reading",
		family: "Lexeme",
		kind: "NOUN",
	});
	const verb = registeredBlockMap({
		language: "de",
		noteKind: "Reading",
		family: "Lexeme",
		kind: "VERB",
	});
	expect(noun?.Heading).toBeFunction();
	expect(verb?.Heading).toBeFunction();
	expect(noun?.Heading).not.toBe(verb?.Heading);
});
