import { afterAll, afterEach, beforeAll, expect, test } from "bun:test";
import { RegistryProvider } from "@effect/atom-react";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { SidebarProvider, TooltipProvider } from "lego";
import { AppSidebar } from "@/components/app-sidebar";
import { LoadingGallery } from "./entries/loading-gallery";
import { PaletteGallery } from "./entries/palette-gallery";
import { PLAYGROUND_ENTRIES, PLAYGROUND_GROUPS } from "./playground-registry";

beforeAll(() => {
	GlobalRegistrator.register({ url: "http://localhost/" });
});

afterEach(async () => {
	cleanup();
	// AtomRegistry drops subscribed atoms and window listeners on a later tick.
	await new Promise((resolve) => setTimeout(resolve, 20));
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

test("PLAYGROUND_GROUPS splits Live App Views from Experiments and flattens into PLAYGROUND_ENTRIES", () => {
	expect(
		PLAYGROUND_GROUPS.map((group) => ({
			key: group.key,
			label: group.label,
			entries: group.entries.map((entry) => entry.key),
		})),
	).toEqual([
		{
			key: "live",
			label: "Live App Views",
			entries: [
				"notes",
				"loading",
				"palette",
				"reflexives",
				"breakdowns",
			],
		},
		{
			key: "experiments",
			label: "Experiments",
			entries: [
				"deck-models",
				"deck-interactions",
				"deck-tricks",
				"card-to-cover",
				"tabletop",
			],
		},
	]);

	expect(PLAYGROUND_ENTRIES).toEqual(
		PLAYGROUND_GROUPS.flatMap((group) => group.entries),
	);
	expect(new Set(PLAYGROUND_ENTRIES.map((entry) => entry.key)).size).toBe(
		PLAYGROUND_ENTRIES.length,
	);
	for (const group of PLAYGROUND_GROUPS) {
		for (const entry of group.entries) {
			expect(entry.group).toBe(group.key);
		}
	}
});

test("AppSidebar renders separated Live App Views and Experiments groups", () => {
	const shown: string[] = [];
	const { getByRole } = render(
		<TooltipProvider>
			<SidebarProvider open>
				<AppSidebar
					playgroundActive
					onTogglePlayground={() => {}}
					playgroundGroups={PLAYGROUND_GROUPS.map((group) => ({
						key: group.key,
						label: group.label,
						pages: group.entries.map((entry) => ({
							key: entry.key,
							title: entry.title,
							icon: entry.icon,
							active: entry.key === "palette",
							onShow: () => shown.push(entry.key),
						})),
					}))}
				/>
			</SidebarProvider>
		</TooltipProvider>,
	);

	const nav = getByRole("navigation", { name: "Playground entries" });
	expect(
		within(nav).getByRole("heading", { name: "Live App Views" }),
	).toBeTruthy();
	expect(
		within(nav).getByRole("heading", { name: "Experiments" }),
	).toBeTruthy();
	expect(within(nav).getByRole("separator")).toBeTruthy();

	const liveList = within(nav).getByRole("list", { name: "Live App Views" });
	const experimentList = within(nav).getByRole("list", {
		name: "Experiments",
	});

	fireEvent.click(within(liveList).getByRole("button", { name: "Palette" }));
	fireEvent.click(
		within(experimentList).getByRole("button", { name: "Tabletop" }),
	);
	expect(shown).toEqual(["palette", "tabletop"]);
});

test("LoadingGallery renders live skeleton stages for Notes, Scroll and Section", () => {
	const { getByRole } = render(<LoadingGallery />);
	for (const label of [
		"Reading · Card",
		"Reading · Card Tail",
		"Reading · Cover",
		"Lemma · Cover",
		"Surface · Cover",
		"Attestation · Cover",
		"Shadow · Cover",
		"Scroll · Cover",
		"Section · Cover",
	]) {
		expect(getByRole("region", { name: label })).toBeTruthy();
	}
});

test("PaletteGallery renders the live interactive ReaderSentence and token swatches", () => {
	const { getByRole, unmount } = render(
		<RegistryProvider>
			<PaletteGallery />
		</RegistryProvider>,
	);

	const liveSection = getByRole("region", {
		name: "One meaning, one colour",
	});
	const knownWord = within(liveSection).getByRole("button", {
		name: "Morgen, part of a known occurrence",
	});
	expect(knownWord.getAttribute("aria-pressed")).toBe("false");
	fireEvent.click(knownWord);
	expect(knownWord.getAttribute("aria-pressed")).toBe("true");
	fireEvent.click(knownWord);
	expect(knownWord.getAttribute("aria-pressed")).toBe("false");

	const failedWord = within(liveSection).getByRole("button", {
		name: "verschlossen, could not be resolved",
	});
	expect((failedWord as HTMLButtonElement).disabled).toBe(true);
	unmount();
});
