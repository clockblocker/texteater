/// <reference lib="dom" />
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, test } from "@playwright/test";

/*
 * Hovering or focusing one word of a unit lights up every word of that unit,
 * discontinuous ones included, from the units the reader already holds. The
 * Text is stored with its units through `convex run`, so no jev is asked. It
 * lands on the deployment `.env.local` selects, or on the one named by
 * TF_DEMO_E2E_CONVEX_ENV_FILE (a `convex --env-file`); point the app at the
 * same deployment with VITE_CONVEX_URL.
 */

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const submissionKey = "e2e:unit-hover";

type Route = { language: "de"; family: "Lexeme"; kind: string };
const lexeme = (kind: string): Route => ({
	language: "de",
	family: "Lexeme",
	kind,
});

/** One stored Sentence: its words as Segments, and its units by Segment index. */
function sentence(
	position: number,
	words: readonly string[],
	units: readonly { segments: number[]; route: Route }[],
) {
	return {
		segmentedSentenceId: `${submissionKey}:${position}`,
		position,
		paragraph: 0,
		language: "de",
		stitchedText: words.join(""),
		segments: words.map((text) => ({
			kind: /^\s+$/.test(text)
				? "Whitespace"
				: /^\p{P}+$/u.test(text)
					? "Punctuation"
					: "ResolvableText",
			text,
		})),
		units,
	};
}

// `Der … Rauch` and `gibt … frei` interleave; `hat … müssen` spans `lange warten`.
const sentences = [
	sentence(
		0,
		[
			"Der",
			" ",
			"dichte",
			" ",
			"Rauch",
			" ",
			"gibt",
			" ",
			"die",
			" ",
			"Sicht",
			" ",
			"nicht",
			" ",
			"frei",
			".",
		],
		[
			{ segments: [0, 4], route: lexeme("NOUN") },
			{ segments: [2], route: lexeme("ADJ") },
			{ segments: [6, 14], route: lexeme("VERB") },
			{ segments: [8, 10], route: lexeme("NOUN") },
			{ segments: [12], route: lexeme("PART") },
		],
	),
	sentence(
		1,
		["Sie", " ", "hat", " ", "lange", " ", "warten", " ", "müssen", "."],
		[
			{ segments: [0], route: lexeme("PRON") },
			{ segments: [2, 8], route: lexeme("AUX") },
			{ segments: [4], route: lexeme("ADV") },
			{ segments: [6], route: lexeme("VERB") },
		],
	),
];

/** Stores the Text once per deployment; a rerun finds it by its submissionKey. */
function seedText(): void {
	const envFile = process.env.TF_DEMO_E2E_CONVEX_ENV_FILE;
	const output = execFileSync(
		"bunx",
		[
			"convex",
			"run",
			...(envFile ? ["--env-file", envFile] : []),
			"persistence:persistSubmittedText",
			JSON.stringify({
				submissionKey,
				sourceText: sentences.map((s) => s.stitchedText).join(" "),
				sentences,
			}),
		],
		{
			cwd: appRoot,
			env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" },
			encoding: "utf8",
		},
	);
	if (!output.includes('"textId"'))
		throw new Error(`Seeding stored no Text: ${output}`);
}

/** Everything the page sends: HTTP requests and frames on any WebSocket, Convex's included. */
function recordTraffic(page: Page): string[] {
	const sent: string[] = [];
	page.on("request", (request) =>
		sent.push(`${request.method()} ${request.url()}`),
	);
	page.on("websocket", (socket) =>
		socket.on("framesent", ({ payload }) =>
			sent.push(`ws ${socket.url()} ${String(payload).slice(0, 200)}`),
		),
	);
	return sent;
}

/** Waits until the page has sent nothing for `quietMs`. */
async function settle(page: Page, sent: readonly string[], quietMs = 750) {
	let count = -1;
	await expect
		.poll(
			async () => {
				const stable = sent.length === count;
				count = sent.length;
				if (!stable) await page.waitForTimeout(quietMs);
				return stable;
			},
			{ timeout: 10_000, intervals: [0] },
		)
		.toBe(true);
}

/** The words in the reader that wear a rule now: previewed or selected. */
function underlinedWords(reader: Locator) {
	return reader
		.locator('[data-slot="reader-segment"]')
		.evaluateAll((elements) =>
			elements
				.filter((element) =>
					getComputedStyle(element).textDecorationLine.includes(
						"underline",
					),
				)
				.map((element) => element.textContent),
		);
}

test.use({
	viewport: { width: 1280, height: 800 },
	deviceScaleFactor: 2,
	contextOptions: { reducedMotion: "reduce" },
});

test("hovering or focusing a word highlights its whole unit with no network call", async ({
	page,
}, testInfo) => {
	test.setTimeout(60_000);
	seedText();
	const sent = recordTraffic(page);

	await page.goto("/");
	await page
		.getByRole("button", {
			name: /^Der dichte Rauch gibt die Sicht nicht frei\./,
		})
		.first()
		.click();
	const reader = page.locator('[data-slot="text-reader"]');
	const word = (text: string) =>
		reader
			.locator('[data-slot="reader-segment"]')
			.filter({ hasText: new RegExp(`^${text}$`) });
	await expect(word("gibt")).toBeVisible();
	await expect(word("müssen")).toBeVisible();
	await expect.poll(() => underlinedWords(reader)).toEqual([]);
	await settle(page, sent);
	// The recorder hears Convex's socket: the reader's queries went over it.
	expect(sent.some((line) => /^ws \S+\/sync /.test(line))).toBe(true);
	const beforeHover = sent.length;

	await word("gibt").hover();
	await expect.poll(() => underlinedWords(reader)).toEqual(["gibt", "frei"]);
	await expect(word("gibt")).toHaveAttribute("data-state", "unknown-preview");
	await expect(word("frei")).toHaveAttribute("data-state", "unknown-preview");
	await expect(word("die")).not.toHaveAttribute("data-state", /./);
	const hovered = testInfo.outputPath("gibt-frei-hovered.png");
	await reader.locator("article").screenshot({ path: hovered });
	await testInfo.attach("gibt-frei-hovered", {
		path: hovered,
		contentType: "image/png",
	});

	await word("Rauch").hover();
	await expect.poll(() => underlinedWords(reader)).toEqual(["Der", "Rauch"]);
	await word("frei").hover();
	await expect.poll(() => underlinedWords(reader)).toEqual(["gibt", "frei"]);
	await page.mouse.move(2, 2);
	await expect.poll(() => underlinedWords(reader)).toEqual([]);

	// Keyboard focus previews the unit just as hover does.
	await word("müssen").focus();
	await expect.poll(() => underlinedWords(reader)).toEqual(["hat", "müssen"]);
	await word("müssen").blur();
	await expect.poll(() => underlinedWords(reader)).toEqual([]);

	await page.waitForTimeout(500);
	expect(sent.slice(beforeHover)).toEqual([]);

	// A click selects the whole unit, and its card names it. The same
	// recorder hears the click's mutation, so its silence above is real.
	await word("frei").click();
	await expect
		.poll(() =>
			sent
				.slice(beforeHover)
				.some((line) =>
					line.includes("resolutionSessions:selectSegment"),
				),
		)
		.toBe(true);
	const card = page
		.getByRole("article")
		.filter({ has: page.getByRole("heading", { name: "gibt … frei" }) })
		.first();
	await expect(card).toBeVisible();
	await expect(card.getByRole("status")).toHaveText(
		"Readings are paused while click resolution is rebuilt.",
	);
	await expect(word("gibt")).toHaveAttribute("data-state", "selected");
	await expect(word("frei")).toHaveAttribute("data-state", "selected");
	await expect(word("gibt")).toHaveAttribute("aria-pressed", "true");
	await expect(reader.locator('[aria-pressed="true"]')).toHaveCount(2);
	await expect.poll(() => underlinedWords(reader)).toEqual(["gibt", "frei"]);
	const selected = testInfo.outputPath("gibt-frei-selected.png");
	await page.screenshot({ path: selected });
	await testInfo.attach("gibt-frei-selected", {
		path: selected,
		contentType: "image/png",
	});
});
