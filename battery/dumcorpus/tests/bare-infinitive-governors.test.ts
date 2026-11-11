import { describe, expect, test } from "bun:test";
import {
	closedVerbForms,
	germanBareInfinitiveGovernors,
} from "../src/inventories.js";

describe("the German verbs that govern a bare infinitive", () => {
	test("are lassen, gehen, bleiben, lernen, sehen, hören and helfen", () => {
		expect(Object.keys(germanBareInfinitiveGovernors)).toEqual([
			"lassen",
			"gehen",
			"bleiben",
			"lernen",
			"sehen",
			"hören",
			"helfen",
		]);
	});

	test("list each finite form once, the plural spelled like the infinitive and an imperative among them, and no participle", () => {
		for (const [infinitive, forms] of Object.entries(
			germanBareInfinitiveGovernors,
		)) {
			expect(new Set(forms).size).toBe(forms.length);
			expect(forms).toContain(infinitive);
		}
		const participles = [
			"gelassen",
			"gegangen",
			"geblieben",
			"gelernt",
			"gesehen",
			"gehört",
			"geholfen",
		];
		for (const forms of Object.values(germanBareInfinitiveGovernors))
			for (const participle of participles)
				expect(forms).not.toContain(participle);
		expect(germanBareInfinitiveGovernors.lassen).toContain("lass");
		expect(germanBareInfinitiveGovernors.sehen).toContain("sieh");
		expect(germanBareInfinitiveGovernors.helfen).toContain("hilf");
	});

	test("share no form with a modal or an auxiliary, whose closed tables hold theirs", () => {
		const closed = new Set(Object.values(closedVerbForms).flat());
		for (const forms of Object.values(germanBareInfinitiveGovernors))
			for (const form of forms) expect(closed.has(form)).toBe(false);
	});
});
