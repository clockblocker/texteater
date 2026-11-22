import { describe, expect, test } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { api } from "../convex/_generated/api";
import { extractUploadedFile } from "../server/ebookExtraction";
import { planUploadedFile } from "../server/textFileIntake";
import { createTestConvex } from "./support/convex";

const encoder = new TextEncoder();

/** Builds a minimal valid EPUB 3 archive in memory for testing. */
function makeMinimalEpub(): Uint8Array {
	const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:test-epub</dc:identifier>
    <dc:title>Der kleine Roman</dc:title>
    <dc:language>de</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`;
	const nav = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
  <body>
    <nav epub:type="toc">
      <ol>
        <li><a href="ch1.xhtml">Kapitel 1</a></li>
        <li><a href="ch2.xhtml">Kapitel 2</a></li>
      </ol>
    </nav>
  </body>
</html>`;
	const ch1 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Kapitel 1</h1>
    <p>Es war ein kalter Morgen.</p>
    <p>»Guten Tag«, sagte sie.</p>
  </body>
</html>`;
	const ch2 = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
  <body>
    <h1>Kapitel 2</h1>
    <p>Am Abend schneite es.</p>
  </body>
</html>`;
	return zipSync({
		mimetype: [strToU8("application/epub+zip"), { level: 0 }],
		"META-INF/container.xml": strToU8(
			`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
		),
		"OEBPS/content.opf": strToU8(opf),
		"OEBPS/nav.xhtml": strToU8(nav),
		"OEBPS/ch1.xhtml": strToU8(ch1),
		"OEBPS/ch2.xhtml": strToU8(ch2),
	});
}

/** Builds a minimal uncompressed MOBI6 PDB binary in memory (with optional encryption flag). */
function makeMinimalMobi({
	title = "Nachtgeschichte",
	html = "<html><body><p>EINS</p><p>Es war dunkel. »Hallo!«</p><mbp:pagebreak/><p>ZWEI</p><p>Dann ging die Sonne auf.</p></body></html>",
	encryption = 0,
}: {
	readonly title?: string;
	readonly html?: string;
	readonly encryption?: number;
} = {}): Uint8Array {
	const titleBytes = encoder.encode(title);
	const htmlBytes = encoder.encode(html);

	// Record 0: 16-byte PalmDOC header + 232-byte MOBI header + title
	const fullNameOffset = 248;
	const rec0 = new Uint8Array(fullNameOffset + titleBytes.length + 2);
	const rec0View = new DataView(rec0.buffer);
	rec0View.setUint16(0, 1); // compression = 1 (uncompressed)
	rec0View.setUint32(4, htmlBytes.length); // text length
	rec0View.setUint16(8, 1); // text record count = 1
	rec0View.setUint16(10, 4096); // record size
	rec0View.setUint16(12, encryption);
	rec0.set(encoder.encode("MOBI"), 16);
	rec0View.setUint32(20, 232); // header length
	rec0View.setUint32(24, 2); // mobi type = Mobipocket book
	rec0View.setUint32(28, 65001); // UTF-8
	rec0View.setUint32(36, 6); // MOBI version 6
	rec0View.setUint32(84, fullNameOffset);
	rec0View.setUint32(88, titleBytes.length);
	rec0View.setUint16(242, 0); // extraFlags = 0
	rec0.set(titleBytes, fullNameOffset);

	// PDB header (78 bytes) + 2 record entries (16 bytes) + 2-byte gap
	const numRecords = 2;
	const headerSize = 78 + numRecords * 8 + 2;
	const total = new Uint8Array(headerSize + rec0.length + htmlBytes.length);
	const view = new DataView(total.buffer);
	total.set(encoder.encode("BOOKMOBI"), 60);
	view.setUint16(76, numRecords);
	// Record 0 entry
	view.setUint32(78, headerSize);
	// Record 1 entry
	view.setUint32(86, headerSize + rec0.length);
	total.set(rec0, headerSize);
	total.set(htmlBytes, headerSize + rec0.length);
	return total;
}

const SAMPLE_FB2 = `<?xml version="1.0" encoding="UTF-8"?>
<FictionBook xmlns="http://www.gribuser.ru/xml/fictionbook/2.0">
  <description>
    <title-info>
      <book-title>Sternenlicht</book-title>
      <lang>de</lang>
    </title-info>
  </description>
  <body>
    <section>
      <title><p>Erstes Kapitel</p></title>
      <p>Der Himmel war klar.</p>
      <p>»Schau nach oben«, flüsterte sie.</p>
    </section>
  </body>
</FictionBook>`;

describe("extractUploadedFile & planUploadedFile", () => {
	test("extracts .epub chapters with metadata title and TOC headings", async () => {
		const plan = await planUploadedFile({
			name: "roman.epub",
			bytes: makeMinimalEpub(),
		});
		expect(plan.kind).toBe("Planned");
		if (plan.kind !== "Planned") return;
		expect(plan.plan.title).toBe("Der kleine Roman");
		expect(plan.plan.scrolls.map(({ title }) => title)).toEqual([
			"Kapitel 1",
			"Kapitel 2",
		]);
		expect(
			plan.plan.scrolls[0]?.sentences.map(
				({ paragraph, stitchedText }) => ({ paragraph, stitchedText }),
			),
		).toEqual([
			{ paragraph: 0, stitchedText: "Kapitel 1" },
			{ paragraph: 1, stitchedText: "Es war ein kalter Morgen." },
			{ paragraph: 2, stitchedText: "»Guten Tag«, sagte sie." },
		]);
	});

	test("extracts .mobi chapters, promotes title lines, and rejects DRM-encrypted ebooks", async () => {
		const plan = await planUploadedFile({
			name: "nacht.mobi",
			bytes: makeMinimalMobi(),
		});
		expect(plan.kind).toBe("Planned");
		if (plan.kind !== "Planned") return;
		expect(plan.plan.title).toBe("Nachtgeschichte");
		expect(plan.plan.scrolls.map(({ title }) => title)).toEqual([
			"EINS",
			"ZWEI",
		]);
		expect(
			plan.plan.scrolls[0]?.sentences.map(
				({ stitchedText }) => stitchedText,
			),
		).toEqual(["EINS", "Es war dunkel.", "»Hallo!«"]);

		const drm = await extractUploadedFile({
			name: "locked.mobi",
			bytes: makeMinimalMobi({ encryption: 2 }),
		});
		expect(drm).toEqual({
			kind: "Rejected",
			message: "This ebook is DRM-protected and can't be read.",
		});
	});

	test("extracts .fb2 books with title and chapters", async () => {
		const plan = await planUploadedFile({
			name: "sternenlicht.fb2",
			bytes: encoder.encode(SAMPLE_FB2),
		});
		expect(plan.kind).toBe("Planned");
		if (plan.kind !== "Planned") return;
		expect(plan.plan.title).toBe("Sternenlicht");
		expect(plan.plan.scrolls).toHaveLength(1);
		expect(
			plan.plan.scrolls[0]?.sentences.map(
				({ stitchedText }) => stitchedText,
			),
		).toEqual([
			"Erstes Kapitel",
			"Der Himmel war klar.",
			"»Schau nach oben«, flüsterte sie.",
		]);
	});

	test("extracts .md and .html files into structured Scrolls", async () => {
		const mdPlan = await planUploadedFile({
			name: "notizen.md",
			bytes: encoder.encode(
				"# Kapitel 1\n\nEr kam spät.\n\n# Kapitel 2\n\nSie wartete.",
			),
		});
		expect(mdPlan.kind).toBe("Planned");
		if (mdPlan.kind === "Planned") {
			expect(mdPlan.plan.title).toBe("notizen");
			expect(mdPlan.plan.scrolls.map(({ title }) => title)).toEqual([
				"Kapitel 1",
				"Kapitel 2",
			]);
		}

		const htmlPlan = await planUploadedFile({
			name: "artikel.html",
			bytes: encoder.encode(
				"<!doctype html><html><head><title>Mein Artikel</title></head><body><h1>Mein Artikel</h1><p>Erster Satz.</p><p>Zweiter Satz.</p></body></html>",
			),
		});
		expect(htmlPlan.kind).toBe("Planned");
		if (htmlPlan.kind === "Planned") {
			expect(htmlPlan.plan.title).toBe("Mein Artikel");
			expect(
				htmlPlan.plan.scrolls[0]?.sentences.map(
					({ stitchedText }) => stitchedText,
				),
			).toEqual(["Mein Artikel", "Erster Satz.", "Zweiter Satz."]);
		}
	});

	test("rejects unsupported extensions and corrupt ebook files cleanly", async () => {
		expect(
			await extractUploadedFile({
				name: "scan.pdf",
				bytes: encoder.encode("%PDF-1.7"),
			}),
		).toMatchObject({ kind: "Rejected" });

		expect(
			await extractUploadedFile({
				name: "broken.mobi",
				bytes: encoder.encode("not a mobi file"),
			}),
		).toMatchObject({ kind: "Rejected" });
	});

	test("submitTextFile stores an uploaded .epub book with its Codex in Convex", async () => {
		const t = createTestConvex();
		const bytes = makeMinimalEpub();
		const storageId = await t.run((ctx) =>
			ctx.storage.store(
				new Blob([new Uint8Array(bytes)], {
					type: "application/epub+zip",
				}),
			),
		);
		const result = await t.action(api.textFileIntake.submitTextFile, {
			visitorId: "visitor-1",
			storageId,
			fileName: "roman.epub",
		});
		expect(result).toMatchObject({
			status: "Accepted",
			title: "Der kleine Roman",
		});
		if (result.status !== "Accepted") return;
		const codex = await t.query(api.library.codex, {
			sectionId: result.sectionId,
			visitorId: "visitor-1",
		});
		expect(codex?.entries.map(({ kind, title }) => [kind, title])).toEqual([
			["Scroll", "Kapitel 1"],
			["Scroll", "Kapitel 2"],
		]);
	});
});
