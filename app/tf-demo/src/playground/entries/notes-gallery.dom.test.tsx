import "../../../tests/support/dom";
import { describe, expect, test } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render } from "@testing-library/react";
import {
	DEFAULT_NOTE_SECTION_CHROME,
	NOTE_SECTION_CHROMES,
	type NoteSectionChrome,
} from "lego";
import { useEffect, useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PlaygroundSnapshot } from "../../../tooling/playground-snapshot";
import type { NoteDataFor } from "../../notes/universal/note/data";
import { MorphStudio, NotesGallery } from "./notes-gallery";

async function flushMotionFrame() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 32));
	});
}

function readingFixture(): NoteDataFor<"Reading"> {
	return {
		kind: "Reading",
		target: { kind: "Reading", readingId: "reading-1" as Id<"readings"> },
		reading: {
			unitKind: "Reading",
			ownerKind: "Reading",
			ownerKey: "reading-1",
			readingId: "reading-1" as Id<"readings">,
			emojiDescription: "🏦",
			lemma: {
				unitKind: "Lemma",
				ownerKind: "Lemma",
				ownerKey: "lemma-1",
				lemmaId: "lemma-1" as Id<"lemmas">,
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem" },
			},
		},
		knowledgeState: { status: "Full", activity: "Idle" },
		personalAnnotation: "",
		knowledge: {
			transcription: "baŋk",
			translations: {
				en: [[{ kind: "Text", text: "bank" }]],
				ru: [[{ kind: "Text", text: "банк" }]],
			},
			definition: "Ein Geldinstitut.",
		},
		knowledgeUpdatedAt: null,
		definitionText: { state: "Plain" },
		relations: [],
		relationsTruncated: false,
		grammaticalAlternatives: [],
		pendingRelations: [],
		structuralReferences: [],
		sourceLinks: [],
		sourceContexts: { page: [], continueCursor: "", isDone: true },
	};
}

function playgroundSnapshotFixture(): PlaygroundSnapshot {
	const reading = readingFixture();
	return {
		catalog: {
			visitorId: "visitor-1",
			entries: [
				{
					readingKey: "reading-1",
					readingId: "reading-1" as Id<"readings">,
					lemmaId: "lemma-1" as Id<"lemmas">,
					attestationId: null,
					canonicalForm: "Bank",
					normalizedSurface: "bank",
					emojiDescription: "🏦",
					family: "Lexeme",
					kind: "NOUN",
				},
			],
			shadows: [],
		},
		notes: {
			"Reading:reading-1": reading,
		},
		scrolls: {},
	};
}

describe("MorphStudio MotionValue pipeline and section chrome modes", () => {
	test("scrubs smoothly through 0..1 via MotionValues without t = 0.5 snap or Note subtree re-renders", async () => {
		let headingRenders = 0;
		let bodyRenders = 0;
		let headingMounts = 0;
		let headingUnmounts = 0;
		let bodyMounts = 0;
		let bodyUnmounts = 0;

		function HeadingProbe() {
			headingRenders += 1;
			useEffect(() => {
				headingMounts += 1;
				return () => {
					headingUnmounts += 1;
				};
			}, []);
			return <h1 data-probe-heading="">Bank</h1>;
		}

		function BodyProbe() {
			bodyRenders += 1;
			useEffect(() => {
				bodyMounts += 1;
				return () => {
					bodyUnmounts += 1;
				};
			}, []);
			return (
				<div data-probe-body="">
					<p>Ein Geldinstitut.</p>
				</div>
			);
		}

		const headingNode = <HeadingProbe />;
		const bodyNode = <BodyProbe />;

		function StudioHost() {
			const [chrome, setChrome] = useState<NoteSectionChrome>(
				DEFAULT_NOTE_SECTION_CHROME,
			);
			return (
				<MorphStudio
					label="Reading"
					columnRem={40}
					unifiedHeading={headingNode}
					unifiedBody={bodyNode}
					sectionChrome={chrome}
					onSectionChromeChange={setChrome}
					onBack={() => {}}
					onClear={() => {}}
				/>
			);
		}

		const view = render(<StudioHost />);
		await flushMotionFrame();

		const slider = view.getByRole("slider", {
			name: "Morph progress",
		}) as HTMLInputElement;
		const readout = view.container.querySelector<HTMLElement>(
			"[data-morph-readout]",
		);
		const toggle = view.container.querySelector<HTMLButtonElement>(
			"[data-morph-toggle]",
		);
		const box = view.container.querySelector<HTMLElement>(
			'[data-presentation="morph"]',
		);
		const surface = view.container.querySelector<HTMLElement>(
			"[data-note-surface]",
		);
		const initialHeadingEl = view.container.querySelector(
			"[data-probe-heading]",
		);
		const initialBodyEl = view.container.querySelector("[data-probe-body]");

		if (!readout || !toggle || !box || !surface) {
			throw new Error("Expected MorphStudio DOM elements.");
		}

		expect(readout.textContent).toBe("0%");
		expect(toggle.textContent).toBe("Morph to Sheet");
		expect(surface.getAttribute("data-note-surface")).toBe("card");
		expect(surface.getAttribute("data-morphing")).toBeNull();
		expect(surface.style.getPropertyValue("--note-morph")).toBe("0");
		expect(box.style.backgroundColor).toBe("var(--paper-elevated)");
		expect(headingRenders).toBe(1);
		expect(bodyRenders).toBe(1);

		// Scrub across the entire interior including t = 0.5:
		// --note-morph and readout update continuously, data-morphing stays active,
		// surface/target NEVER snap at 0.5, and the Note subtree renders 0 extra times.
		for (const step of [0.2, 0.4, 0.5, 0.6, 0.8]) {
			fireEvent.input(slider, { target: { value: step.toString() } });
			await flushMotionFrame();

			expect(readout.textContent).toBe(
				`${Math.round(step * 100).toString()}%`,
			);
			expect(slider.getAttribute("aria-valuetext")).toBe(
				`${Math.round(step * 100).toString()}%`,
			);
			expect(
				Number.parseFloat(
					surface.style.getPropertyValue("--note-morph"),
				),
			).toBeCloseTo(step, 4);
			expect(surface.getAttribute("data-morphing")).toBe("true");
			expect(surface.getAttribute("data-note-surface")).toBe("card");
			expect(box.getAttribute("data-morph-target")).toBe("card");
			expect(toggle.textContent).toBe("Morph to Sheet");
			expect(box.style.getPropertyValue("--note-bg")).toContain(
				"color-mix",
			);
			expect(view.container.querySelector("[data-probe-heading]")).toBe(
				initialHeadingEl,
			);
			expect(view.container.querySelector("[data-probe-body]")).toBe(
				initialBodyEl,
			);
			expect(headingRenders).toBe(1);
			expect(bodyRenders).toBe(1);
		}

		// Settling at the Sheet endpoint (1) switches cleanly without unmounting.
		fireEvent.input(slider, { target: { value: "1" } });
		await flushMotionFrame();

		expect(readout.textContent).toBe("100%");
		expect(surface.style.getPropertyValue("--note-morph")).toBe("1");
		expect(surface.getAttribute("data-morphing")).toBeNull();
		expect(surface.getAttribute("data-note-surface")).toBe("sheet");
		expect(box.getAttribute("data-morph-target")).toBe("cover");
		expect(box.style.backgroundColor).toBe("var(--paper)");
		expect(toggle.textContent).toBe("Morph to Card");
		expect(view.container.querySelector("[data-probe-heading]")).toBe(
			initialHeadingEl,
		);
		expect(view.container.querySelector("[data-probe-body]")).toBe(
			initialBodyEl,
		);
		expect(headingRenders).toBe(1);
		expect(bodyRenders).toBe(1);

		// Settling back to Card (0) restores Card resting state without unmounting.
		fireEvent.input(slider, { target: { value: "0" } });
		await flushMotionFrame();

		expect(readout.textContent).toBe("0%");
		expect(surface.style.getPropertyValue("--note-morph")).toBe("0");
		expect(surface.getAttribute("data-morphing")).toBeNull();
		expect(surface.getAttribute("data-note-surface")).toBe("card");
		expect(box.getAttribute("data-morph-target")).toBe("card");
		expect(box.style.backgroundColor).toBe("var(--paper-elevated)");
		expect(headingMounts).toBe(1);
		expect(headingUnmounts).toBe(0);
		expect(bodyMounts).toBe(1);
		expect(bodyUnmounts).toBe(0);
	});

	test("toggles Card <-> Sheet and slow-motion playback without unmounting or re-rendering the Note tree", async () => {
		let headingRenders = 0;
		let bodyRenders = 0;

		function HeadingProbe() {
			headingRenders += 1;
			return <h1 data-probe-heading="">Bank</h1>;
		}

		function BodyProbe() {
			bodyRenders += 1;
			return <div data-probe-body="">Body</div>;
		}

		const headingNode = <HeadingProbe />;
		const bodyNode = <BodyProbe />;

		const view = render(
			<MorphStudio
				label="Reading"
				columnRem={40}
				unifiedHeading={headingNode}
				unifiedBody={bodyNode}
				sectionChrome="reveal"
				onSectionChromeChange={() => {}}
				onBack={() => {}}
				onClear={() => {}}
			/>,
		);

		const toggle = view.container.querySelector<HTMLButtonElement>(
			"[data-morph-toggle]",
		);
		const slowButton = view.getByRole("button", { name: "1× Spring" });
		const surface = view.container.querySelector<HTMLElement>(
			"[data-note-surface]",
		);
		const initialHeadingEl = view.container.querySelector(
			"[data-probe-heading]",
		);
		const initialBodyEl = view.container.querySelector("[data-probe-body]");

		if (!toggle || !surface) {
			throw new Error("Expected MorphStudio controls and surface.");
		}

		// Toggle slow-motion mode on and off cleanly.
		expect(slowButton.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(slowButton);
		expect(slowButton.getAttribute("aria-pressed")).toBe("true");
		expect(slowButton.textContent).toBe("0.25× Slow");

		// Trigger Morph to Sheet (in slow motion so it stays in flight during inspection).
		fireEvent.click(toggle);
		expect(toggle.textContent).toBe("Morph to Card");
		expect(surface.getAttribute("data-note-surface")).toBe("sheet");
		expect(surface.getAttribute("data-morphing")).toBe("true");

		await flushMotionFrame();
		await flushMotionFrame();

		expect(view.container.querySelector("[data-probe-heading]")).toBe(
			initialHeadingEl,
		);
		expect(view.container.querySelector("[data-probe-body]")).toBe(
			initialBodyEl,
		);
		expect(headingRenders).toBe(1);
		expect(bodyRenders).toBe(1);

		// Interrupt mid-flight back to Card: stays mounted with zero extra Note renders.
		fireEvent.click(toggle);
		expect(toggle.textContent).toBe("Morph to Sheet");
		expect(surface.getAttribute("data-note-surface")).toBe("card");
		await flushMotionFrame();

		expect(view.container.querySelector("[data-probe-heading]")).toBe(
			initialHeadingEl,
		);
		expect(view.container.querySelector("[data-probe-body]")).toBe(
			initialBodyEl,
		);
		expect(headingRenders).toBe(1);
		expect(bodyRenders).toBe(1);
	});

	test("switches all three sectionChrome modes across MorphStudio and static Card, Card Tail, and Cover stages", () => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		queryClient.setQueryData(
			["playground-notes"],
			playgroundSnapshotFixture(),
		);

		const view = render(
			<QueryClientProvider client={queryClient}>
				<NotesGallery
					route={{
						segments: ["reading", "reading-1"],
						setSegments: () => {},
					}}
				/>
			</QueryClientProvider>,
		);

		const studio = view.container.querySelector<HTMLElement>(
			"[data-morph-studio]",
		);
		if (!studio) throw new Error("Expected MorphStudio in NotesGallery.");

		for (const option of NOTE_SECTION_CHROMES) {
			const button = studio.querySelector<HTMLButtonElement>(
				`[data-section-chrome-option="${option.id}"]`,
			);
			if (!button) {
				throw new Error(`Missing section chrome option: ${option.id}`);
			}
			fireEvent.click(button);

			expect(button.getAttribute("aria-pressed")).toBe("true");
			expect(studio.textContent).toContain(option.summary);

			// MorphStudio + static Card, Card Tail, and Cover stages all carry the selected chrome mode.
			for (const presentation of [
				"morph",
				"card",
				"tail-above",
				"cover",
			]) {
				const stageBox = view.container.querySelector<HTMLElement>(
					`[data-presentation="${presentation}"]`,
				);
				const stageSurface = stageBox?.querySelector<HTMLElement>(
					"[data-section-chrome]",
				);
				expect(stageSurface?.getAttribute("data-section-chrome")).toBe(
					option.id,
				);
			}
		}
	});
});
