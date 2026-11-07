import { describe, expect, test } from "bun:test";
import { TABLE_CSS } from "./styles";

describe("the Table's stylesheet", () => {
	test("leaves no CSS transition or animation on any element the Table moves", () => {
		const rule =
			/([^{}]+)\{transition:none!important;animation:none!important\}/.exec(
				TABLE_CSS,
			);
		const own = rule?.[1]?.trim().split(",") ?? [];
		for (const element of [
			"[data-tabletop-slot]",
			"[data-tabletop-seat]",
			"[data-tabletop-body]",
			"[data-tabletop-shell]",
			"[data-tabletop-face]",
			"[data-tabletop-part]",
			"[data-tabletop-glare]",
			"[data-tabletop-veils] *",
		])
			expect(own).toContain(element);
	});
});
