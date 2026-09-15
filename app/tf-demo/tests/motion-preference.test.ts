import { expect, test } from "bun:test";
import {
	applyMotionPreference,
	isMotionPreference,
	readMotionPreference,
} from "../src/lib/motion-preference";

test("motion preference accepts only the two application policies", () => {
	expect(isMotionPreference("respect")).toBe(true);
	expect(isMotionPreference("ignore")).toBe(true);
	expect(isMotionPreference("system")).toBe(false);
	expect(isMotionPreference(null)).toBe(false);
});

test("motion preference respects the system by default", () => {
	expect(readMotionPreference(null)).toBe("respect");
	expect(
		readMotionPreference({ getItem: () => "an-invalid-preference" }),
	).toBe("respect");
	expect(readMotionPreference({ getItem: () => "ignore" })).toBe("ignore");
});

test("motion preference is applied to the document root", () => {
	const root = { dataset: {} as DOMStringMap };
	const document = { documentElement: root } as unknown as Document;

	applyMotionPreference("ignore", document);
	expect(root.dataset.motionPreference).toBe("ignore");

	applyMotionPreference("respect", document);
	expect(root.dataset.motionPreference).toBe("respect");
});
