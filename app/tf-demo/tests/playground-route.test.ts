import { describe, expect, test } from "bun:test";
import { PLAYGROUND_EXPERIMENTS } from "../src/playground/playground-registry";
import {
	playgroundExperimentHref,
	playgroundRouteFromPathname,
} from "../src/playground/playground-route";

describe("playground routes", () => {
	test("keeps the registry and experiments outside the application URL", () => {
		expect(playgroundRouteFromPathname("/")).toBeNull();
		expect(playgroundRouteFromPathname("/texts/example")).toBeNull();
		expect(playgroundRouteFromPathname("/playground")).toEqual({
			kind: "Index",
		});
		expect(
			playgroundRouteFromPathname("/playground/sheet-workspace"),
		).toEqual({
			kind: "Experiment",
			experimentId: "sheet-workspace",
		});
	});

	test("builds encoded experiment and detail URLs", () => {
		expect(playgroundExperimentHref("layout study")).toBe(
			"/playground/layout%20study",
		);
		expect(
			playgroundRouteFromPathname("/playground/layout%20study"),
		).toEqual({
			kind: "Experiment",
			experimentId: "layout study",
		});
		expect(
			playgroundExperimentHref("notes-study", "Daemmerung/reading/🌒"),
		).toBe("/playground/notes-study/Daemmerung/reading/%F0%9F%8C%92");
		expect(
			playgroundRouteFromPathname(
				"/playground/notes-study/Daemmerung/reading/%F0%9F%8C%92",
			),
		).toEqual({
			kind: "Experiment",
			experimentId: "notes-study",
			detailId: "Daemmerung/reading/🌒",
		});
		expect(playgroundExperimentHref("notes-study", "%")).toBe(
			"/playground/notes-study/%25",
		);
		expect(
			playgroundRouteFromPathname("/playground/notes-study/%25"),
		).toEqual({
			kind: "Experiment",
			experimentId: "notes-study",
			detailId: "%",
		});
		expect(
			playgroundRouteFromPathname("/playground/one/two/three"),
		).toEqual({
			kind: "Experiment",
			experimentId: "one",
			detailId: "two/three",
		});
	});

	test("registers stable, unique experiment IDs", () => {
		const ids = PLAYGROUND_EXPERIMENTS.map((experiment) => experiment.id);
		expect(ids).toContain("sheet-workspace");
		expect(new Set(ids).size).toBe(ids.length);
	});
});
