/**
 * A stored Extracted Text checked without Zod, for a host's database seam
 * (#1178): tf-demo keeps it as `v.any()`, and its operational modules load
 * no Zod schema. It accepts exactly what `extractedTextSchema` accepts and
 * returns the same value, unknown keys dropped; the schema's test holds
 * the two together.
 */
import { isRecord } from "common-utils";
import type {
	Chapter,
	ExtractedText,
	Heading,
	InlineStyle,
	LineBreak,
	Paragraph,
	Run,
} from "./extracted-text.js";

type Located = { readonly locations?: Run["locations"] };
type OriginalLocation = NonNullable<Run["locations"]>[number];

class InvalidExtractedText extends Error {
	override readonly name = "InvalidExtractedText";
}

function fail(path: string, expected: string): never {
	throw new InvalidExtractedText(`${path} is not ${expected}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
	return isRecord(value) ? value : fail(path, "an object");
}

function list(value: unknown, path: string, min = 0): readonly unknown[] {
	if (!Array.isArray(value) || value.length < min)
		fail(path, min > 0 ? `a list of at least ${min}` : "a list");
	return value;
}

const isWhole = (value: unknown, min: number): value is number =>
	Number.isInteger(value) && (value as number) >= min;

const isFraction = (value: unknown): value is number =>
	typeof value === "number" && value >= 0 && value <= 1;

function location(value: unknown, path: string): OriginalLocation {
	const { kind, ...fields } = record(value, path);
	if (kind === "PageArea") {
		if (!isWhole(fields.page, 0)) fail(`${path}.page`, "a page index");
		if (fields.area === undefined) return { kind, page: fields.page };
		const area = record(fields.area, `${path}.area`);
		const { x, y, width, height } = area;
		if (![x, y, width, height].every(isFraction))
			fail(`${path}.area`, "a box of fractions");
		return {
			kind,
			page: fields.page,
			area: {
				x: x as number,
				y: y as number,
				width: width as number,
				height: height as number,
			},
		};
	}
	if (kind === "TimeSpan") {
		if (!isWhole(fields.startMs, 0) || !isWhole(fields.endMs, 0))
			fail(path, "a time span");
		return { kind, startMs: fields.startMs, endMs: fields.endMs };
	}
	if (kind === "FileSpot") {
		if (typeof fields.spot !== "string" || fields.spot.length === 0)
			fail(`${path}.spot`, "a file spot");
		return { kind, spot: fields.spot };
	}
	return fail(path, "an Original Location");
}

function locatedBy(value: Record<string, unknown>, path: string): Located {
	if (value.locations === undefined) return {};
	return {
		locations: list(value.locations, `${path}.locations`, 1).map(
			(item, index) => location(item, `${path}.locations[${index}]`),
		),
	};
}

const inlineStyles = new Set<unknown>(["Italic", "Bold", "Quotation"]);

function run(value: unknown, path: string): Run {
	const fields = record(value, path);
	if (fields.kind !== "Run") fail(path, "a Run");
	if (typeof fields.text !== "string" || !/^[^\r\n]+$/u.test(fields.text))
		fail(`${path}.text`, "one non-empty line");
	const styles =
		fields.styles === undefined
			? undefined
			: list(fields.styles, `${path}.styles`, 1).map((style) =>
					inlineStyles.has(style)
						? (style as InlineStyle)
						: fail(`${path}.styles`, "Inline Styles"),
				);
	return {
		kind: "Run",
		text: fields.text,
		...(styles ? { styles } : {}),
		...locatedBy(fields, path),
	};
}

function runs(value: unknown, path: string): readonly Run[] {
	return list(value, path, 1).map((item, index) =>
		run(item, `${path}[${index}]`),
	);
}

function block(value: unknown, path: string): Heading | Paragraph {
	const fields = record(value, path);
	if (fields.kind === "Heading") {
		const { level } = fields;
		if (
			level !== 2 &&
			level !== 3 &&
			level !== 4 &&
			level !== 5 &&
			level !== 6
		)
			fail(`${path}.level`, "a level from 2 to 6");
		return {
			kind: "Heading",
			level,
			runs: runs(fields.runs, `${path}.runs`),
			...locatedBy(fields, path),
		};
	}
	if (fields.kind === "Paragraph")
		return {
			kind: "Paragraph",
			inlines: list(fields.inlines, `${path}.inlines`, 1).map(
				(item, index): Run | LineBreak =>
					isRecord(item) && item.kind === "LineBreak"
						? { kind: "LineBreak" }
						: run(item, `${path}.inlines[${index}]`),
			),
			...locatedBy(fields, path),
		};
	return fail(path, "a Heading or a Paragraph");
}

function chapter(value: unknown, path: string): Chapter {
	const fields = record(value, path);
	const heading =
		fields.heading === undefined
			? undefined
			: record(fields.heading, `${path}.heading`);
	return {
		...(heading
			? {
					heading: {
						runs: runs(heading.runs, `${path}.heading.runs`),
						...locatedBy(heading, `${path}.heading`),
					},
				}
			: {}),
		blocks: list(fields.blocks, `${path}.blocks`).map((item, index) =>
			block(item, `${path}.blocks[${index}]`),
		),
	};
}

/** The Extracted Text `value` holds, or an `InvalidExtractedText` thrown. */
export function parseExtractedText(value: unknown): ExtractedText {
	const fields = record(value, "Extracted Text");
	return {
		chapters: list(fields.chapters, "chapters", 1).map((item, index) =>
			chapter(item, `chapters[${index}]`),
		),
	};
}
