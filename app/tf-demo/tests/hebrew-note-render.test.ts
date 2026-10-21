import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import { parseReadingKnowledge } from "dumrel";
import { renderToStaticMarkup } from "react-dom/server";
import type { Id } from "../convex/_generated/dataModel";
import { renderNote } from "../src/notes";
import { hebrewNoun, hebrewReadingNote } from "./support/hebrew-note";

test("Hebrew Reading uses the shared Card pipeline with its own headword, meaning and real Source Context", () => {
	const note = hebrewReadingNote();
	expect(parseUnit(hebrewNoun).success).toBe(true);
	const markup = renderToStaticMarkup(renderNote({ noteData: note }));
	expect(markup).toContain('data-reading-title=""');
	expect(markup).toContain('lang="he"');
	expect(markup).toContain('<bdi lang="he" dir="rtl">בַּיִת</bdi>');
	expect(markup).toContain("🏠");
	expect(markup).toContain("en: house");
	expect(markup).toContain("ru: дом");
	expect(markup).toContain("מבנה המשמש למגורים.");
	expect(markup).toContain('aria-label="Source Contexts"');
	expect(markup).toContain("ראיתי את ");
	expect(markup).toMatch(
		/<button data-slot="reader-segment"[^>]*>הַ<\/button><button data-slot="reader-segment"[^>]*>בַּיִת<\/button>/,
	);
	expect(markup).toContain("gender: Masc");
	expect(markup).not.toContain('role="alert"');
	expect(markup.replaceAll(/<[^>]+>/g, "")).not.toContain("der ");
});

test("Hebrew Surface heading names its actual plural construct features and bare Lemma", () => {
	const lemma = hebrewReadingNote().reading.lemma;
	const presented = {
		unitKind: "Surface" as const,
		language: "he" as const,
		normalizedSurface: "בָּתֵּי",
		lemma,
		grundform: false,
		spelling: { kind: "Canonical" as const },
		surfaceFeatures: { historicalStatus: null },
		inflectionalFeatures: {
			number: "Plur" as const,
			definite: "Cons" as const,
		},
	};
	const { grundform: _grundform, ...surface } = presented;
	expect(
		parseUnit({ ...surface, lemma: hebrewNoun, surfaceFeatures: null })
			.success,
	).toBe(true);
	const markup = renderToStaticMarkup(
		renderNote({
			noteData: {
				kind: "Surface",
				target: {
					kind: "Surface",
					language: "he",
					normalizedSurface: "בָּתֵּי",
				},
				analyses: [
					{
						analysisKey: "he-surface-houses" as Id<"surfaces">,
						surfaceId: "he-surface-houses" as Id<"surfaces">,
						lemmaId: lemma.lemmaId,
						presented,
						lemmaTarget: { kind: "Lemma", lemmaId: lemma.lemmaId },
					},
				],
				continueCursor: "",
				isDone: true,
			},
		}),
	);
	expect(markup).toContain('<bdi lang="he" dir="rtl">בָּתֵּי</bdi>');
	expect(markup).toContain("plural, construct form of ");
	expect(markup).toContain('data-caption-next=""');
	expect(markup).toContain("בַּיִת");
	expect(markup).not.toContain('role="alert"');
});

test("Hebrew Lemma heading exposes distinct meanings without borrowing German citation articles", () => {
	const note = hebrewReadingNote();
	const markup = renderToStaticMarkup(
		renderNote({
			noteData: {
				kind: "Lemma",
				target: { kind: "Lemma", lemmaId: note.reading.lemma.lemmaId },
				presented: note.reading.lemma,
				participialAdjectives: [],
				connections: {
					readings: [
						{
							readingId: note.reading.readingId,
							emojiDescription: "🏠",
							target: note.target,
						},
						{
							readingId: "he-reading-family" as Id<"readings">,
							emojiDescription: "👪",
							target: {
								kind: "Reading",
								readingId:
									"he-reading-family" as Id<"readings">,
							},
						},
					],
					surfaces: [],
					sameWrittenForm: [],
					continueCursor: "",
					isDone: true,
				},
			},
		}),
	);
	expect(markup).toContain('<bdi lang="he" dir="rtl">בַּיִת</bdi>');
	expect(markup.replaceAll(/<[^>]+>/g, "")).toContain("2 readings: 🏠 👪");
	expect(markup).not.toContain('role="alert"');
});

test("Hebrew inflection renders validated labeled forms without inventing absent cells", () => {
	const note = hebrewReadingNote();
	const knowledge = {
		...note.knowledge,
		hebrewParadigm: {
			forms: [
				{
					form: "בָּתִּים",
					features: {
						number: "Plur" as const,
						definite: "Ind" as const,
					},
				},
				{
					form: "בָּתֵּי",
					features: {
						number: "Plur" as const,
						definite: "Cons" as const,
					},
				},
			],
		},
	};
	expect(
		parseReadingKnowledge({
			source: {
				unitKind: "Reading",
				lemma: hebrewNoun,
				emojiDescription: "🏠",
			},
			knowledge,
		}).success,
	).toBe(true);
	const markup = renderToStaticMarkup(
		renderNote({ noteData: { ...note, knowledge } }),
	);
	expect(markup).toContain('aria-label="Inflection"');
	expect(markup).toContain('<bdi lang="he" dir="rtl">בָּתִּים</bdi>');
	expect(markup).toContain("plural · indefinite");
	expect(markup).toContain("plural · construct");
	expect(markup).not.toContain("dual");
	expect(markup).not.toContain("No forms");
	expect(markup).not.toContain('role="alert"');
	const withoutForms = renderToStaticMarkup(renderNote({ noteData: note }));
	expect(withoutForms).not.toContain('aria-label="Inflection"');
});
