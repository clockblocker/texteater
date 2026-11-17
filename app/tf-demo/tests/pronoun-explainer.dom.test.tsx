import "./support/dom";
import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { RegistryProvider } from "@effect/atom-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { ConvexProvider, type ConvexReactClient } from "convex/react";
import { useRef } from "react";
import { PronounExplainer } from "../src/views/pronoun-explainer";
import { explainerModifierKey } from "../src/views/pronoun-explainer-atoms";
import {
	ReaderSentence,
	type ReaderSentenceData,
} from "../src/views/reader-sentence";

const route = (kind: string) => ({ language: "de", family: "Lexeme", kind });

const unitOf = (index: number, kind: string) => ({
	segments: [index],
	route: route(kind),
});

/** "Der Hund bellt." and "Er schläft.", every word its own routed unit. */
const sentences = [
	{
		sentenceId: "s1",
		language: "de",
		stitchedText: "Der Hund bellt.",
		segments: [
			{
				index: 0,
				kind: "ResolvableText",
				text: "Der",
				unit: unitOf(0, "DET"),
			},
			{ index: 1, kind: "Whitespace", text: " " },
			{
				index: 2,
				kind: "ResolvableText",
				text: "Hund",
				unit: unitOf(2, "NOUN"),
			},
			{ index: 3, kind: "Whitespace", text: " " },
			{
				index: 4,
				kind: "ResolvableText",
				text: "bellt",
				unit: unitOf(4, "VERB"),
			},
			{ index: 5, kind: "Punctuation", text: "." },
		],
	},
	{
		sentenceId: "s2",
		language: "de",
		stitchedText: "Er schläft.",
		segments: [
			{
				index: 0,
				kind: "ResolvableText",
				text: "Er",
				unit: unitOf(0, "PRON"),
			},
			{ index: 1, kind: "Whitespace", text: " " },
			{
				index: 2,
				kind: "ResolvableText",
				text: "schläft",
				unit: unitOf(2, "VERB"),
			},
			{ index: 3, kind: "Punctuation", text: "." },
		],
	},
] as unknown as ReaderSentenceData[];

const resolved = [
	{
		sentenceId: "s2",
		pronoun: [0],
		state: "Resolved",
		antecedents: [{ sentenceId: "s1", segments: [2] }],
	},
];

beforeEach(() => {
	// happy-dom lays nothing out: every word gets one box.
	const box = {
		left: 10,
		top: 10,
		right: 50,
		bottom: 30,
		width: 40,
		height: 20,
	};
	spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(
		box as DOMRect,
	);
	spyOn(Element.prototype, "getClientRects").mockReturnValue([
		box,
	] as unknown as DOMRectList);
});

afterEach(() => {
	cleanup();
	window.dispatchEvent(new Event("blur"));
});

function Reader({ onClick }: { readonly onClick: (index: number) => void }) {
	const reader = useRef<HTMLDivElement>(null);
	return (
		<PronounExplainer scrollId="scroll-1" reader={reader}>
			<div ref={reader} data-scroller="">
				{sentences.map((sentence) => (
					<ReaderSentence
						key={sentence.sentenceId}
						sentence={sentence}
						selectedSegmentKey={null}
						onSegmentClick={(_, index) => onClick(index)}
					/>
				))}
			</div>
		</PronounExplainer>
	);
}

/** The reader over stored `explanations`, recording requests and ordinary clicks. */
function reader(explanations: unknown[] = []) {
	const asked: unknown[] = [];
	const clicked: number[] = [];
	const client: Pick<ConvexReactClient, "mutation"> = {
		mutation: async (_reference, args) => {
			asked.push(args);
			return { kind: "Asked" };
		},
	};
	const queries = new QueryClient({
		defaultOptions: {
			queries: { retry: false, queryFn: async () => explanations },
		},
	});
	const view = render(
		<RegistryProvider>
			<ConvexProvider client={client as ConvexReactClient}>
				<QueryClientProvider client={queries}>
					<Reader onClick={(index) => clicked.push(index)} />
				</QueryClientProvider>
			</ConvexProvider>
		</RegistryProvider>,
	);
	return { view, asked, clicked };
}

const hold = (type: "keydown" | "keyup") =>
	act(() => {
		window.dispatchEvent(
			new KeyboardEvent(type, { key: explainerModifierKey() }),
		);
	});

const badge = () => document.querySelector('[data-slot="explainer-badge"]');
const marks = () =>
	document.querySelectorAll('[data-slot="pen-marks"] [data-antecedent]');

test("without the key, a pronoun reads and clicks as any word", async () => {
	const { view, asked, clicked } = reader();
	const er = view.getByText("Er");
	fireEvent.mouseEnter(er);
	expect(er.closest("button")?.dataset.state).toBe("unknown-preview");
	expect(badge()).toBeNull();
	fireEvent.click(er);
	expect(clicked).toEqual([0]);
	expect(asked).toEqual([]);
});

test("with the key held, a hovered pronoun is badged and a click asks to explain it", async () => {
	const { view, asked, clicked } = reader();
	await hold("keydown");
	const hund = view.getByText("Hund");
	fireEvent.mouseEnter(hund);
	// No other word previews or selects.
	expect(hund.closest("button")?.dataset.state).toBeUndefined();
	fireEvent.click(hund);
	fireEvent.mouseLeave(hund);
	const er = view.getByText("Er");
	fireEvent.mouseEnter(er);
	expect(badge()?.textContent).toBe("?");
	expect(er.closest("button")?.className).toContain("text-shadow");
	fireEvent.click(er);
	expect(clicked).toEqual([]);
	expect(asked).toEqual([
		{ visitorId: expect.any(String), sentenceId: "s2", pronoun: [0] },
	]);
	await hold("keyup");
	expect(badge()).toBeNull();
});

test("a resolved pronoun shows its pen marks at once, until the key is let go", async () => {
	const { view, asked } = reader(resolved);
	await waitFor(() => expect(view.getByText("Er")).toBeTruthy());
	await hold("keydown");
	fireEvent.mouseEnter(view.getByText("Er"));
	await waitFor(() => expect(marks()).toHaveLength(1));
	expect(marks()[0]?.getAttribute("data-antecedent")).toBe("s1:2");
	expect(asked).toEqual([]);
	await hold("keyup");
	expect(marks()).toHaveLength(0);
});

test("a pronoun that refers to nothing is badged with ∅ and draws no marks", async () => {
	const { view } = reader([{ ...resolved[0], antecedents: [] }]);
	await hold("keydown");
	fireEvent.mouseEnter(view.getByText("Er"));
	await waitFor(() => expect(badge()?.textContent).toBe("∅"));
	expect(marks()).toHaveLength(0);
});
