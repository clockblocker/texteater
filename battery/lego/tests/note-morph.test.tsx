import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
	clampMorph,
	DEFAULT_NOTE_SECTION_CHROME,
	Ipa,
	interpolateMorph,
	LinkButton,
	morphForMode,
	NOTE_MORPH_TOKENS,
	NOTE_SECTION_CHROMES,
	NoteAnnotationField,
	NoteAside,
	NoteBone,
	NoteFrame,
	NoteList,
	NoteLoadMore,
	NoteProse,
	NoteSection,
	NoteSurface,
	NoteTags,
	NoteTitle,
	NoteTitleLink,
	NoteTitleRow,
	NoteTranslationList,
	NoteTranslationRow,
	noteMorphStyle,
	Quote,
} from "../src";

const STYLES_CSS = [
	readFileSync(resolve(import.meta.dir, "../src/styles.css"), "utf8"),
	readFileSync(resolve(import.meta.dir, "../src/note-morph.css"), "utf8"),
].join("\n");

/** Converts an OKLCH color (`L` in 0..1, `C` >= 0, `H` in degrees) to sRGB relative luminance. */
function oklchLuminance(l: number, c: number, hDeg: number): number {
	const hRad = (hDeg * Math.PI) / 180;
	const a = c * Math.cos(hRad);
	const b = c * Math.sin(hRad);

	const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = l - 0.0894841775 * a - 1.291485548 * b;

	const lc = l_ ** 3;
	const mc = m_ ** 3;
	const sc = s_ ** 3;

	const r = Math.max(
		0,
		Math.min(1, +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc),
	);
	const g = Math.max(
		0,
		Math.min(1, -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc),
	);
	const bl = Math.max(
		0,
		Math.min(1, -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc),
	);

	return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function wcagContrast(
	fg: readonly [number, number, number],
	bg: readonly [number, number, number],
): number {
	const l1 = oklchLuminance(fg[0], fg[1], fg[2]);
	const l2 = oklchLuminance(bg[0], bg[1], bg[2]);
	const lighter = Math.max(l1, l2);
	const darker = Math.min(l1, l2);
	return (lighter + 0.05) / (darker + 0.05);
}

function extractBlock(css: string, selector: string): string {
	const start = css.indexOf(`${selector} {`);
	if (start === -1) throw new Error(`Missing CSS block for ${selector}`);
	let depth = 0;
	for (let index = start; index < css.length; index += 1) {
		const ch = css[index];
		if (ch === "{") depth += 1;
		else if (ch === "}") {
			depth -= 1;
			if (depth === 0) return css.slice(start, index + 1);
		}
	}
	throw new Error(`Unclosed CSS block for ${selector}`);
}

function parseOklchToken(
	block: string,
	name: string,
): readonly [number, number, number] {
	const match = block.match(
		new RegExp(
			`${name}:\\s*oklch\\(([0-9.]+)%\\s+([0-9.]+)\\s+([0-9.]+)\\)`,
		),
	);
	if (!match) throw new Error(`Missing OKLCH token ${name}`);
	return [Number(match[1]) / 100, Number(match[2]), Number(match[3])];
}

describe("declarative Note morph contract", () => {
	test("clamps morph progress and maps resting surface modes", () => {
		expect(clampMorph(-0.5)).toBe(0);
		expect(clampMorph(0.42)).toBe(0.42);
		expect(clampMorph(2)).toBe(1);
		expect(clampMorph(Number.NaN)).toBe(1);
		expect(morphForMode("card")).toBe(0);
		expect(morphForMode("sheet")).toBe(1);
		expect(noteMorphStyle(0.25)).toEqual({ "--note-morph": "0.25" });
	});

	test("uses updated Card and Sheet spacing, IPA, and translation morph tokens", () => {
		const {
			sectionFirstTopRem,
			sectionGapRem,
			framePaddingInlineRem,
			framePaddingBottomRem,
			ipaFontRem,
			translationRowGapRem,
		} = NOTE_MORPH_TOKENS;
		expect(sectionFirstTopRem).toEqual({ card: 0, sheet: 1.5 });
		expect(sectionGapRem).toEqual({ card: 1, sheet: 2.25 });
		expect(interpolateMorph(sectionGapRem, 0)).toBe(1);
		expect(interpolateMorph(sectionGapRem, 0.5)).toBe(1.625);
		expect(interpolateMorph(sectionGapRem, 1)).toBe(2.25);

		expect(ipaFontRem).toEqual({ card: 0.8125, sheet: 0.9375 });
		expect(translationRowGapRem).toEqual({ card: 0.25, sheet: 0.375 });
		expect(interpolateMorph(framePaddingInlineRem, 0)).toBe(0.875);
		expect(interpolateMorph(framePaddingInlineRem, 1)).toBe(2.5);
		expect(interpolateMorph(framePaddingBottomRem, 0)).toBe(0.875);
		expect(interpolateMorph(framePaddingBottomRem, 1)).toBe(3.5);
	});

	test("exposes all three section label and divider morph chrome variants", () => {
		expect(DEFAULT_NOTE_SECTION_CHROME).toBe("reveal");
		expect(NOTE_SECTION_CHROMES.map((chrome) => chrome.id)).toEqual([
			"reveal",
			"hairline",
			"compact-label",
		]);
	});
});

describe("Tailwind v4 cascade-layer hygiene and tokens", () => {
	test("keeps morph-controlled properties free of conflicting static utility classes", () => {
		const markup = renderToStaticMarkup(
			<NoteFrame mode="sheet" frameLabel="Cascade Check">
				<NoteTitleRow>
					<NoteTitle>
						<NoteTitleLink>Marktplatz</NoteTitleLink>
					</NoteTitle>
					<Ipa transcription="ˈmaʁktˌplats" />
				</NoteTitleRow>
				<NoteSection label="Translations">
					<NoteTranslationList>
						<NoteTranslationRow language="en">
							market square
						</NoteTranslationRow>
					</NoteTranslationList>
				</NoteSection>
			</NoteFrame>,
		);

		// NoteTitle binds CSS variables instead of static font-size/weight/tracking utilities.
		expect(markup).toContain(
			"text-[length:var(--note-title-size,1.125rem)]",
		);
		expect(markup).toContain("font-[var(--note-title-weight,580)]");
		expect(markup).toContain("leading-[var(--note-title-leading,1.25)]");
		expect(markup).toContain(
			"tracking-[var(--note-title-tracking,-0.02em)]",
		);
		expect(markup).not.toContain("text-base");
		expect(markup).not.toContain("font-[570]");
		expect(markup).not.toContain("tracking-[-0.025em]");
		expect(markup).not.toContain("text-balance");

		// NoteTitleRow omits `flex-wrap` utility so `[data-title-bar]` `flex-wrap: nowrap` wins.
		const rowMatch = markup.match(
			/data-slot="note-title-row" class="([^"]+)"/,
		);
		expect(rowMatch?.[1]).not.toContain("flex-wrap");

		// NoteTitleLink omits `p-0` and `focus-visible:ring-2` so `[data-title-bar]` padding and inset ring win.
		const linkMatch = markup.match(
			/data-slot="note-title-link"[^>]*class="([^"]+)"/,
		);
		expect(linkMatch?.[1]).not.toContain("p-0");
		expect(linkMatch?.[1]).not.toContain("focus-visible:ring-2");

		// NoteSectionLabel omits static `text-[...]` utility so `compact-label` font-size formula wins.
		const labelMatch = markup.match(
			/data-slot="note-section-label" class="([^"]+)"/,
		);
		expect(labelMatch?.[1]).not.toContain("text-[0.6875rem]");
		expect(labelMatch?.[1]).not.toContain("text-xs");

		// NoteTranslationRow <dd> omits `text-pretty` utility so Card single-line truncation wins.
		expect(markup).toContain('<dd lang="en">market square</dd>');
	});

	test("defines scoped title-bar rules, elevation shadows, oklab sheen, and mobile baseline in styles.css", () => {
		expect(STYLES_CSS).toContain(
			'[data-title-bar] [data-slot="note-title-link"]:first-child',
		);
		expect(STYLES_CSS).toContain("text-wrap: nowrap;");
		expect(STYLES_CSS).toContain("--paper-elevated:");
		expect(STYLES_CSS).toContain("--shadow-card-rest:");
		expect(STYLES_CSS).toContain("--shadow-card-lift:");
		expect(STYLES_CSS).toContain("--shadow-card-tail:");
		expect(STYLES_CSS).toContain("--shadow-cover:");
		expect(STYLES_CSS).toContain("--skeleton:");
		expect(STYLES_CSS).toContain("--font-ipa:");
		expect(STYLES_CSS).toContain("100deg in oklab");
		expect(STYLES_CSS).toContain("font-optical-sizing: auto;");
		expect(STYLES_CSS).toContain("text-decoration-thickness: from-font;");
		expect(STYLES_CSS).toContain(
			"-webkit-tap-highlight-color: transparent;",
		);
		expect(STYLES_CSS).toContain("-webkit-text-size-adjust: 100%;");
		expect(STYLES_CSS).toContain("overscroll-behavior: none;");
		expect(STYLES_CSS).toContain("env(safe-area-inset-bottom, 0px)");
		expect(STYLES_CSS).toContain('content: "·" / "";');
		expect(STYLES_CSS).toContain("--container-note: 43rem;");
		// Raw scrollbar `:hover` is gated to fine-pointer hover devices.
		expect(STYLES_CSS).toContain(
			"@media (hover: hover) and (pointer: fine)",
		);
		expect(STYLES_CSS).not.toMatch(/^\t\*:hover \{/m);
		// Primary accent is split from `--link`.
		expect(STYLES_CSS).not.toContain("--primary: var(--link);");
	});

	test("meets WCAG AA contrast across dark (:root) and .light token palettes", () => {
		const dark = extractBlock(STYLES_CSS, ":root");
		const light = extractBlock(STYLES_CSS, ".light");

		for (const [label, block] of [
			["dark", dark],
			["light", light],
		] as const) {
			const paper = parseOklchToken(block, "--paper");
			const paperElevated = parseOklchToken(block, "--paper-elevated");
			const ink = parseOklchToken(block, "--ink");
			const inkSoft = parseOklchToken(block, "--ink-soft");
			const inkMuted = parseOklchToken(block, "--ink-muted");
			const inkPlaceholder = parseOklchToken(block, "--ink-placeholder");
			const link = parseOklchToken(block, "--blue-500");
			const feminine = parseOklchToken(block, "--rose-500");
			const masculine = parseOklchToken(block, "--violet-500");
			const neuter = parseOklchToken(block, "--green-500");
			const primary = parseOklchToken(block, "--primary");
			const primaryFg = parseOklchToken(block, "--primary-foreground");

			// Body, muted labels, placeholders, and links must pass WCAG AA (>= 4.5:1) on `--paper`.
			expect(
				wcagContrast(ink, paper),
				`${label} ink/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(inkSoft, paper),
				`${label} ink-soft/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(inkMuted, paper),
				`${label} ink-muted/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(inkPlaceholder, paper),
				`${label} placeholder/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(link, paper),
				`${label} link/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(feminine, paper),
				`${label} feminine/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(masculine, paper),
				`${label} masculine/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(neuter, paper),
				`${label} neuter/paper`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(primary, primaryFg),
				`${label} primary/fg`,
			).toBeGreaterThanOrEqual(4.5);
			// Elevated Cards also keep body, muted labels, and links above AA.
			expect(
				wcagContrast(ink, paperElevated),
				`${label} ink/elevated`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(inkMuted, paperElevated),
				`${label} ink-muted/elevated`,
			).toBeGreaterThanOrEqual(4.5);
			expect(
				wcagContrast(link, paperElevated),
				`${label} link/elevated`,
			).toBeGreaterThanOrEqual(4.5);
		}
	});
});

describe("unified Note molecules", () => {
	test("renders cohesive Card and Sheet molecules with semantic markup and zero legacy compact forks", () => {
		for (const mode of ["card", "sheet"] as const) {
			const markup = renderToStaticMarkup(
				<NoteFrame mode={mode} underHeading frameLabel="Reading Note">
					<NoteSection label="In context">
						<Quote onFollow={() => {}}>
							<span>Die Bank ist offen.</span>
						</Quote>
					</NoteSection>
					<NoteSection label="Translations">
						<NoteTranslationList>
							<NoteTranslationRow language="en">
								bank
							</NoteTranslationRow>
							<NoteTranslationRow language="ru">
								банк
							</NoteTranslationRow>
						</NoteTranslationList>
					</NoteSection>
					<NoteSection label="Definition">
						<NoteProse>Ein Geldinstitut.</NoteProse>
					</NoteSection>
					<NoteSection
						label="Margin note"
						labelFor="note-margin-field"
						visibility="sheet"
					>
						<NoteAnnotationField
							id="note-margin-field"
							value=""
							placeholder="Jot a memory hook…"
							readOnly
						/>
					</NoteSection>
					<NoteList gap="tight">
						<li>
							<LinkButton>Bank</LinkButton>
							<NoteAside>Noun · feminine</NoteAside>
						</li>
					</NoteList>
					<NoteLoadMore
						label="Load more passages"
						isLoading={false}
						onLoadMore={null}
					/>
					<Ipa transcription="baŋk" />
					<NoteTags>
						<span>Noun</span>
						<span>feminine (die)</span>
					</NoteTags>
				</NoteFrame>,
			);

			expect(markup).toContain(`data-note-surface="${mode}"`);
			expect(markup).toContain(
				`--note-morph:${mode === "card" ? "0" : "1"}`,
			);
			expect(markup).toContain('data-slot="note-section-label"');
			expect(markup).toContain('data-slot="note-translation-list"');
			expect(markup).toContain('data-slot="note-annotation-field"');
			expect(markup).toContain("not-italic");
			expect(markup).toContain("<blockquote");
			expect(markup).not.toContain("tracking-[-0.012em]");
			expect(markup).not.toContain("compact:italic");
			expect(markup).not.toContain("compact:border-s-[3px]");
			expect(markup).not.toContain("compact:hidden");
		}
	});

	test("wires NoteSection aria-labelledby automatically and nests <label> inside <h2> when labelFor is passed", () => {
		const markup = renderToStaticMarkup(
			<NoteFrame mode="sheet" frameLabel="Section A11y">
				<NoteSection label="Definition">
					<NoteProse>Ein Platz.</NoteProse>
				</NoteSection>
				<NoteSection label="Margin note" labelFor="margin-input">
					<NoteAnnotationField id="margin-input" value="" readOnly />
				</NoteSection>
				<NoteSection aria-label="Explicit" label="Explicit">
					<NoteProse>Preserved explicit aria-label.</NoteProse>
				</NoteSection>
			</NoteFrame>,
		);

		// First section links `<section aria-labelledby="id">` to `<h2 id="id">`, with no duplicate `aria-label`.
		const autoSection = markup.match(
			/<section[^>]*aria-labelledby="([^"]+)"[^>]*>.*?<h2[^>]*data-slot="note-section-label"[^>]*id="([^"]+)"[^>]*>Definition<\/h2>/,
		);
		expect(autoSection).not.toBeNull();
		expect(autoSection?.[1]).toBe(autoSection?.[2]);
		expect(autoSection?.[0]).not.toContain("aria-label=");

		// Form section wraps `<label htmlFor="margin-input">` inside `<h2 data-slot="note-section-label">`.
		expect(markup).toMatch(
			/<h2[^>]*data-slot="note-section-label"[^>]*id="[^"]+"[^>]*><label for="margin-input"[^>]*>Margin note<\/label><\/h2>/,
		);

		// Explicit `aria-label` is preserved without also injecting `aria-labelledby`.
		expect(markup).toMatch(/<section[^>]*aria-label="Explicit"[^>]*>/);
		expect(markup).not.toMatch(
			/<section[^>]*aria-label="Explicit"[^>]*aria-labelledby=/,
		);
	});

	test("renders Quote as semantic <blockquote> in both static and interactive modes", () => {
		const staticMarkup = renderToStaticMarkup(
			<Quote>
				<span>Am Marktplatz.</span>
			</Quote>,
		);
		const interactiveMarkup = renderToStaticMarkup(
			<Quote onFollow={() => {}}>
				<span>Am Marktplatz.</span>
			</Quote>,
		);

		expect(staticMarkup).toMatch(/^<blockquote[^>]*data-slot="quote"/);
		expect(staticMarkup).toContain('data-quote-static=""');
		expect(staticMarkup).not.toContain("tracking-[-0.012em]");

		expect(interactiveMarkup).toMatch(/^<blockquote[^>]*data-slot="quote"/);
		expect(interactiveMarkup).toContain('data-slot="quote-surface"');
		expect(interactiveMarkup).toContain('data-slot="quote-passage"');
		expect(interactiveMarkup).not.toContain("tracking-[-0.012em]");
	});

	test("renders Ipa with lang='und-fonipa' and softened boundary slashes", () => {
		const markup = renderToStaticMarkup(
			<Ipa transcription="ˈmaʁktˌplats" />,
		);
		expect(markup).toContain('data-slot="ipa"');
		expect(markup).toContain('lang="und-fonipa"');
		expect(markup).toContain(
			'<span aria-hidden="true" class="me-[0.05em] text-ink-faint">/</span>ˈmaʁktˌplats<span aria-hidden="true" class="ms-[0.05em] text-ink-faint">/</span>',
		);
	});

	test("renders NoteAnnotationField as an empty dashed well and melts borderless when filled", () => {
		const emptyMarkup = renderToStaticMarkup(
			<NoteAnnotationField
				value=""
				placeholder="Jot a memory hook…"
				readOnly
			/>,
		);
		const filledMarkup = renderToStaticMarkup(
			<NoteAnnotationField
				value="Remember der Markt + der Platz."
				placeholder="Jot a memory hook…"
				readOnly
			/>,
		);

		expect(emptyMarkup).toContain('data-empty="true"');
		expect(emptyMarkup).toContain("border-dashed");
		expect(emptyMarkup).toContain("bg-canvas/35");
		expect(emptyMarkup).toContain("placeholder:text-ink-placeholder");
		expect(emptyMarkup).toContain("max-w-[36rem]");
		expect(emptyMarkup).toContain("text-base");
		expect(emptyMarkup).toContain("sm:text-[inherit]");
		expect(emptyMarkup).toContain("focus-visible:ring-2");
		expect(emptyMarkup).toContain("outline-2 outline-transparent");

		expect(filledMarkup).toContain('data-empty="false"');
		expect(filledMarkup).toContain("border-transparent bg-transparent");
		expect(filledMarkup).toContain("leading-[1.55]");
	});

	test("renders NoteTags with top hairline, NoteProse with 1.55 leading, NoteBone with bg-skeleton, and LinkButton with hit expansion", () => {
		const markup = renderToStaticMarkup(
			<NoteFrame mode="sheet" frameLabel="Craft Check">
				<NoteProse>Ein offener Platz.</NoteProse>
				<NoteBone className="w-20" />
				<LinkButton>Markt</LinkButton>
				<NoteTranslationList>
					<NoteTranslationRow language="pt-br">
						praça do mercado
					</NoteTranslationRow>
				</NoteTranslationList>
				<NoteTags>
					<span>Noun</span>
					<span>masculine (der)</span>
				</NoteTags>
			</NoteFrame>,
		);

		expect(markup).toContain("border-t border-hairline pt-3");
		expect(markup).toContain("leading-[1.55]");
		expect(markup).toContain("bg-skeleton");
		expect(markup).toContain("before:-inset-y-[0.25em]");
		expect(markup).toContain("touch-manipulation");
		expect(markup).toContain("[--link:var(--word-known)]");
		expect(markup).toContain("font-mono text-[0.6875rem]");
	});

	test("nested NoteFrame inherits live --note-morph and sectionChrome from a managed surface", () => {
		const markup = renderToStaticMarkup(
			<NoteSurface managed morph={0.4} sectionChrome="hairline">
				<NoteFrame mode="sheet" frameLabel="Nested Note">
					<NoteSection label="Definition">
						<NoteProse>Prose</NoteProse>
					</NoteSection>
				</NoteFrame>
			</NoteSurface>,
		);

		// Outer managed surface owns `--note-morph:0.4`, `data-morphing`, and `data-section-chrome="hairline"`;
		// inner NoteFrame must not overwrite `--note-morph` with a static `1`.
		expect(markup).toContain("--note-morph:0.4");
		expect(markup).toContain('data-morphing=""');
		expect(markup).not.toContain("--note-morph:1");
		expect(markup).toContain('data-section-chrome="hairline"');
	});
});
