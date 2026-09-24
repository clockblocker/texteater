import {
	creatureMask,
	EYE,
	groundClip,
	n,
	rng,
	SIZE,
	svgDocument,
	type Variant,
	WORDS,
} from "../kit";

/**
 * Kit example: the page is lines of pen-stroke words, the bites are a
 * diagonal hatch. Figure and ground differ only by texture.
 */
function render(): string {
	const random = rng(7);
	const paper = "#efe7d6";
	const ink = "#1f1b16";

	const wordStrokes = WORDS.map(({ x, y, w, h }) => {
		const cy = y + h / 2;
		const wobble = () => (random() - 0.5) * 3;
		return `<path d="M${n(x + 6)} ${n(cy + wobble())} Q${n(x + w / 2)} ${n(cy + wobble())} ${n(x + w - 6)} ${n(cy + wobble())}"/>`;
	}).join("");

	const hatch: string[] = [];
	for (let offset = -SIZE; offset < SIZE; offset += 9) {
		const jitter = (random() - 0.5) * 4;
		hatch.push(
			`<path d="M${n(offset + jitter)} 0 L${n(offset + SIZE + jitter)} ${SIZE}"/>`,
		);
	}

	return svgDocument({
		title: "textfresser, pen and hatch",
		desc: "Six circular bites hatch the page away; what stays plain is the textfresser.",
		defs: `${groundClip("ground")}${creatureMask("creature")}`,
		body: `  <rect width="${SIZE}" height="${SIZE}" fill="${paper}"/>
  <g clip-path="url(#ground)" stroke="${ink}" stroke-width="3.5" stroke-linecap="round">${hatch.join("")}</g>
  <g mask="url(#creature)" fill="none" stroke="${ink}" stroke-width="22" stroke-linecap="round">${wordStrokes}</g>
  <circle cx="${EYE.cx}" cy="${EYE.cy}" r="${EYE.r}" fill="${ink}"/>`,
	});
}

export default {
	id: "example-hatch",
	title: "kit example: pen words, hatched bites",
	render,
} satisfies Variant;
