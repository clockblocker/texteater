import { readFileSync } from "node:fs";

import type { Variant } from "../kit";

/** The shipped static icon, for side-by-side comparison. */
export default {
	id: "baseline",
	title: "shipped icon",
	render: () =>
		readFileSync(
			new URL("../../textfresser-eating.svg", import.meta.url),
			"utf8",
		),
} satisfies Variant;
