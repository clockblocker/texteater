import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSync, Visitor } from "oxc-parser";

const HERE = new URL(".", import.meta.url).pathname;

type Undeclared = { readonly at: string; readonly what: string };

const MOTION_SOURCES = readdirSync(HERE)
	.filter((f) => f.endsWith(".tsx"))
	.map((f) => join(HERE, f))
	.filter((path) =>
		readFileSync(path, "utf8").includes('from "motion/react"'),
	);

/** A transition the spec owns: `MORPH`, or `motionOf(NOTE_BORDER)`. */
/**
 * A transition the spec declares: a named export, `motionOf(SOME_SPEC)`,
 * or an object built out of nothing but those.
 *
 * The composed form is for a transition that has to say two things at
 * once — Motion takes `{ ...spec, layout: otherSpec }` to give a layout
 * animation its own timing. Every value in it still has to be a spec, so
 * `{ ...MORPH, layout: { duration: 0.14 } }` is refused exactly as the
 * bare literal is. Binding the same literal to a `const` first would slip
 * past a rule that only looked at the attribute, which is why this walks
 * into the object rather than trusting the identifier.
 */
function isSpecTransition(node: { type: string } | null | undefined): boolean {
	if (!node) return false;
	if (node.type === "Identifier") return true;
	const call = node as { callee?: { type: string; name?: string } };
	if (
		node.type === "CallExpression" &&
		call.callee?.type === "Identifier" &&
		(call.callee.name === "motionOf" || call.callee.name === "transition")
	)
		return true;
	if (node.type !== "ObjectExpression") return false;
	const object = node as {
		properties: {
			type: string;
			value?: { type: string };
			argument?: { type: string };
		}[];
	};
	return object.properties.every((property) =>
		property.type === "SpreadElement"
			? isSpecTransition(property.argument)
			: isSpecTransition(property.value),
	);
}

function undeclaredMotion(file: string, source: string): Undeclared[] {
	const found: Undeclared[] = [];
	const at = (node: { start: number }) =>
		`${file}:${(source.slice(0, node.start).split("\n").length).toString()}`;
	const parsed = parseSync(file, source, { lang: "tsx" });

	new Visitor({
		JSXOpeningElement(node) {
			const name = node.name;
			if (
				name.type !== "JSXMemberExpression" ||
				name.object.type !== "JSXIdentifier" ||
				name.object.name !== "motion"
			)
				return;
			const tag = `motion.${name.property.name}`;
			const named = node.attributes.flatMap((attribute) =>
				attribute.type === "JSXAttribute" &&
				attribute.name.type === "JSXIdentifier"
					? [attribute.name.name]
					: [],
			);
			if (named.includes("animate") && !named.includes("initial"))
				found.push({
					at: at(node),
					what: `<${tag}> animates without declaring its first frame`,
				});
			for (const attribute of node.attributes) {
				if (
					attribute.type !== "JSXAttribute" ||
					attribute.name.type !== "JSXIdentifier" ||
					attribute.name.name !== "transition"
				)
					continue;
				const value = attribute.value;
				const expression =
					value?.type === "JSXExpressionContainer"
						? value.expression
						: null;
				if (!isSpecTransition(expression))
					found.push({
						at: at(attribute),
						what: `<${tag}> is given a transition the spec does not declare`,
					});
			}
		},
		Property(node) {
			if (
				node.key.type !== "Identifier" ||
				node.key.name !== "transition"
			)
				return;
			if (!isSpecTransition(node.value))
				found.push({
					at: at(node),
					what: "a transition is written out rather than named",
				});
		},
		CallExpression(node) {
			if (node.callee.type !== "Identifier") return;
			if (node.callee.name !== "animate") return;
			if (!isSpecTransition(node.arguments[2]))
				found.push({
					at: at(node),
					what: "animate() is given a transition the spec does not declare",
				});
		},
	}).visit(parsed.program);

	return found;
}

describe("nothing animates that the spec does not declare", () => {
	test("there is a prototype to read", () => {
		expect(MOTION_SOURCES.map((p) => p.split("/").pop())).toContain(
			"drag-deck.tsx",
		);
	});

	test("every Motion element declares its first frame, and every transition is a spec", () => {
		const offences = MOTION_SOURCES.flatMap((path) =>
			undeclaredMotion(
				path.split("/").pop() ?? path,
				readFileSync(path, "utf8"),
			),
		);
		expect(offences).toEqual([]);
	});

	/*
	 * A rule nobody has seen fail is a rule that may not work. These are
	 * the four shapes it exists to refuse, and the shapes it must let past.
	 */
	test("the rule refuses motion it cannot see declared", () => {
		const refused = (source: string) =>
			undeclaredMotion("sample.tsx", source).map((o) => o.what);

		expect(
			refused(
				`const A = () => <motion.div animate={{ opacity: 1 }} transition={MORPH} />;`,
			),
		).toEqual(["<motion.div> animates without declaring its first frame"]);

		expect(
			refused(
				`const A = () => <motion.span initial={false} animate={{ y: 4 }} transition={{ duration: 0.16 }} />;`,
			),
		).toEqual([
			"<motion.span> is given a transition the spec does not declare",
		]);

		expect(
			refused(
				`const A = () => <motion.li initial={{ height: 0 }} animate={{ height: "auto", transition: { duration: 0.2 } }} />;`,
			),
		).toEqual(["a transition is written out rather than named"]);

		/* a composed transition is only as declared as its parts */
		expect(
			refused(
				`const A = () => <motion.div initial={false} animate={{ y: 0 }} transition={{ ...MORPH, layout: { duration: 0.14 } }} />;`,
			),
		).toEqual([
			"<motion.div> is given a transition the spec does not declare",
		]);

		expect(refused(`animate(value, 1, { duration: 0.2 });`)).toEqual([
			"animate() is given a transition the spec does not declare",
		]);
		expect(refused(`animate(value, 1);`)).toEqual([
			"animate() is given a transition the spec does not declare",
		]);
	});

	test("the rule lets declared motion past", () => {
		const source = `
			const A = () => <motion.div initial={false} animate={{ opacity: 1 }} transition={MORPH} />;
			const B = () => <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: motionOf(BAR_ENTER) }} exit={{ opacity: 0, transition: motionOf(BAR_EXIT) }} />;
			const C = () => <motion.div style={{ x }} />;
			animate(value, 1, motionOf(NOTE_BORDER));
			animate(value, 1, transition(NOTE_BORDER));
			animate(value, 1, MORPH);
		`;
		expect(undeclaredMotion("sample.tsx", source)).toEqual([]);
	});
});
