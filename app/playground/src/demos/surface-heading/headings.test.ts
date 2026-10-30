import { expect, test } from "bun:test";
import {
	cases,
	type HeadingOption,
	type HeadingToken,
	headingOf,
} from "./cases";

function text(id: string, option: HeadingOption): string {
	const surface = cases.find((each) => each.id === id);
	if (!surface) throw new Error(`No case ${id}.`);
	return headingOf(surface, option).map(tokenText).join(" ");
}

function tokenText(token: HeadingToken): string {
	if (token.kind === "gap") return "…";
	if (token.kind !== "slot") return token.text;
	const run = token.preposition
		? `${token.preposition} ${token.text}`
		: token.text;
	return token.optional ? `(${run})` : run;
}

test("the stored form is the Surface as stored", () => {
	expect(text("hatte", "stored")).toBe("mit zu tun hatte");
	expect(text("erinnert", "stored")).toBe("erinnert");
});

test("gaps mark wherever some Reading puts a slot", () => {
	expect(text("hatte", "gaps")).toBe("… mit … zu tun hatte");
	expect(text("erinnert", "gaps")).toBe("… erinnert");
	expect(text("anfaengt", "gaps")).toBe("… anfängt");
});

test("the common line is the line of the Reading with the most Attestations", () => {
	expect(text("hatte", "common")).toBe("jD mit jM zu tun hatte");
	expect(text("erinnert", "common")).toBe("jD sich (an jN) erinnert");
});

test("a Surface whose Readings have no frame reads the same under every option", () => {
	for (const option of ["stored", "gaps", "common"] as const)
		expect(text("kindern", option)).toBe("Kindern");
});
