import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { type Place, place } from "../core/place";
import { Body, Part, Region, Shell, Slot } from "./parts";
import { Table, useTable } from "./table";

const SLOT = {
	id: "felt:a",
	region: "felt",
	style: {
		insetInlineStart: "calc(50% + -2rem)",
		top: "calc(50% + -3rem)",
		width: "4rem",
		height: "6rem",
	},
};

function Scene({
	at,
	dir = "ltr",
}: {
	readonly at: Place;
	readonly dir?: "ltr" | "rtl";
}) {
	const table = useTable();
	return (
		<Table table={table} dir={dir} reducedMotion="off">
			<Region id="felt">
				<Slot spec={SLOT} />
			</Region>
			<Body id="a" place={at}>
				<Shell
					front={
						<>
							<Part id="title">gehen</Part>
							<Part id="lines" only="cover">
								ging · ist gegangen
							</Part>
						</>
					}
					back={null}
				/>
			</Body>
		</Table>
	);
}

/** The markup without the Table's stylesheet. */
function render(at: Place, dir?: "ltr" | "rtl") {
	return renderToStaticMarkup(<Scene at={at} dir={dir} />).replace(
		/<style>[\s\S]*?<\/style>/,
		"",
	);
}

describe("a resting Body", () => {
	test("anchors to its Slot by the Slot's anchor name", () => {
		const html = render(place("felt:a"));
		const anchor = /anchor-name:(--[\w-]+)/.exec(
			html.slice(html.indexOf("data-tabletop-slot")),
		)?.[1];
		expect(anchor).toBeDefined();
		expect(html).toContain(`position-anchor:${anchor}`);
	});

	test("carries its Place's rest as CSS and nothing in flight", () => {
		const html = render(place("felt:a", { rotate: 30, z: 4, scale: 1.05 }));
		expect(html).toContain("--rest-rotate:30deg");
		expect(html).toContain("--rest-z:4");
		expect(html).toContain("--rest-scale:1.05");
		expect(html).not.toContain("--fly-");
	});
});

describe("the Shell", () => {
	test("stacks both faces, the back first, and rests on its side's angle", () => {
		const html = render(place("felt:a", { side: "back" }));
		expect(html).toContain('data-side="back"');
		expect(html).toContain("--rest-turn:180deg");
		expect(html.indexOf('data-tabletop-face="back"')).toBeLessThan(
			html.indexOf('data-tabletop-face="front"'),
		);
	});

	test("makes the side that faces away inert", () => {
		const faces = (side: "front" | "back") =>
			[
				...render(place("felt:a", { side })).matchAll(
					/<div data-tabletop-face="(\w+)"[^>]*>/g,
				),
			].map((match) => [match[1], match[0].includes('inert=""')]);
		expect(faces("front")).toEqual([
			["back", true],
			["front", false],
		]);
		expect(faces("back")).toEqual([
			["back", false],
			["front", true],
		]);
	});
});

describe("Parts", () => {
	test("render only in the form they belong to", () => {
		expect(render(place("felt:a"))).not.toContain("ging · ist gegangen");
		expect(render(place("felt:a", { form: "cover" }))).toContain(
			"ging · ist gegangen",
		);
	});
});

describe("the Table", () => {
	test("sets the writing direction its Regions and rotations mirror by", () => {
		expect(render(place("felt:a"), "rtl")).toContain('dir="rtl"');
	});
});
