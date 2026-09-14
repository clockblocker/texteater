import type { Constraint } from "../../common-utils/src/validation-artifact";

export interface Registry {
	version: 1;
	roots: Record<string, Constraint>;
	definitions: Record<string, Constraint>;
}

/** Ahead-of-time specialization. No eval, runtime artifact walk, or error fallback. */
export function compileValidator(registry: Registry, referenceSource: string) {
	if (registry.version !== 1) throw new Error("Unsupported artifact version");
	const reference = new Bun.Transpiler({ loader: "ts" }).transformSync(
		referenceSource,
	);
	const functions = new Map(
		[
			...reference.matchAll(
				/(?:export )?function (\w+)\([^]*?(?=\n(?:export )?function |$)/g,
			),
		].map((match) => [match[1]!, match[0]]),
	);
	const body = (name: string) => {
		const source = functions.get(name);
		if (!source) throw new Error(`Missing interpreter template: ${name}`);
		return source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"));
	};
	const constants: string[] = [];
	const emitted: string[] = [];
	const names = new Map<string, string>();
	const literal = (value: unknown) => {
		if (value === undefined) return "undefined";
		if (
			typeof value === "number" &&
			(!Number.isFinite(value) || Object.is(value, -0))
		)
			return Object.is(value, -0) ? "-0" : String(value);
		return JSON.stringify(value);
	};
	const constant = (expression: string) => {
		const name = `c${constants.length}`;
		constants.push(`const ${name} = ${expression};`);
		return name;
	};
	function fixedKeys(
		node: Constraint,
		seen = new Set<string>(),
	): string[] | undefined {
		if (node[0] === "ref") {
			if (seen.has(node[1]))
				throw new Error("Recursive fixed record key");
			seen.add(node[1]);
			const target = registry.definitions[node[1]];
			if (!target) throw new Error(`Missing definition ${node[1]}`);
			return fixedKeys(target, seen);
		}
		if (
			node[0] === "enum" &&
			node[1].every((key) => typeof key === "string")
		)
			return node[1] as string[];
		if (node[0] === "literal" && typeof node[1] === "string")
			return [node[1]];
		return undefined;
	}
	function emit(node: Constraint): string {
		// Registries are immutable build inputs. Stable structural sharing limits code size.
		const key = JSON.stringify(node, (_, value) =>
			typeof value === "number" &&
			(!Number.isFinite(value) || Object.is(value, -0))
				? { specialNumber: literal(value) }
				: value,
		);
		const existing = names.get(key);
		if (existing) return existing;
		const name = `v${names.size}`;
		names.set(key, name); // Reserve before following recursive references.
		let code: string;
		const calls: Record<string, string> = {};
		switch (node[0]) {
			case "ref": {
				const target = registry.definitions[node[1]];
				if (!target) throw new Error(`Missing definition ${node[1]}`);
				code = `return ${emit(target)}(input,path,operations);`;
				break;
			}
			case "unknown":
				code = "return success(input);";
				break;
			case "boolean":
			case "null":
				code = `return ${node[0] === "null" ? "input === null" : 'typeof input === "boolean"'} ? success(input) : invalidType(${literal(node[0])},input,path);`;
				break;
			case "literal":
				code = `return Object.is(input,${literal(node[1])}) ? success(input) : invalidValue([${literal(node[1])}],input,path);`;
				break;
			case "enum":
				code = `return parseEnum(${constant(`[${node[1].map(literal).join(",")}]`)},input,path);`;
				break;
			case "optional":
			case "nullable":
				code = `return input === ${node[0] === "optional" ? "undefined" : "null"} ? success(input) : ${emit(node[1])}(input,path,operations);`;
				break;
			case "preprocess":
				code = `const result = requiredOperation(${literal(node[1])},operations)(input);
				if ((result.issues?.length ?? 0)>0) return failure(prefixIssues(result.issues ?? [],path));
				return ${emit(node[2])}(result.value,path,operations);`;
				break;
			case "string":
			case "number":
				code = body(
					node[0] === "string" ? "parseString" : "parseNumber",
				).replaceAll("constraint[1]", constant(literal(node[1] ?? [])));
				break;
			case "array":
				calls["constraint[1]"] = emit(node[1]);
				code = body("parseArray").replaceAll(
					"constraint[2]",
					constant(literal(node[2])),
				);
				break;
			case "pipe":
				calls["constraint[1]"] = emit(node[1]);
				code = body("parsePipe")
					.replaceAll("constraint[1][0]", literal(node[1][0]))
					.replaceAll("constraint[2]", constant(literal(node[2])));
				break;
			case "object": {
				code = body("parseObject");
				const start = code.indexOf(
					"  for (const [key, childConstraint]",
				);
				const end = code.indexOf(
					'  if (unknownKeyPolicy === "strict")',
				);
				if (start < 0 || end < 0)
					throw new Error("Object template drift");
				const loop = code.slice(start, end);
				const inner = loop.slice(
					loop.indexOf("{") + 1,
					loop.lastIndexOf("}"),
				);
				code =
					code.slice(0, start) +
					Object.entries(node[1])
						.map(
							([key, child]) =>
								`{ const key = ${literal(key)}; ${inner.replaceAll("parseConstraint(childConstraint, source[key], [...path, key], definitions, operations)", `${emit(child)}(source[key], [...path, key], operations)`)} }`,
						)
						.join("\n") +
					code.slice(end);
				const shape = constant(
					`{${Object.keys(node[1])
						.map((key) => `[${literal(key)}]:null`)
						.join(",")}}`,
				);
				code = code.replace(
					"const [, shape, unknownKeyPolicy] = constraint;",
					`const shape = ${shape}; const unknownKeyPolicy = ${literal(node[2])};`,
				);
				break;
			}
			case "union": {
				code = body("parseUnion");
				const start = code.indexOf("  for (const option of options)");
				const end = code.indexOf("  const selected = nonAborted[0];");
				if (start < 0 || end < 0)
					throw new Error("Union template drift");
				const loop = code.slice(start, end);
				const inner = loop.slice(
					loop.indexOf("{") + 1,
					loop.lastIndexOf("}"),
				);
				code =
					code.slice(0, start) +
					node[1]
						.map(
							(child) =>
								`{ ${inner.replaceAll("parseConstraint(option, input, [], definitions, operations)", `${emit(child)}(input, [], operations)`)} }`,
						)
						.join("\n") +
					code.slice(end);
				break;
			}
			case "tuple":
				code = body("parseTuple")
					.replaceAll(
						"constraint[1]",
						constant(`[${node[1].map(emit).join(",")}]`),
					)
					.replaceAll(
						"constraint[2]",
						node[2] ? emit(node[2]) : "undefined",
					);
				calls.rest = "rest";
				calls.item = "item";
				break;
			case "record":
			case "partial-record":
				code = body("parseRecord").replace(
					'constraint[0] === "record" ? fixedRecordKeys(constraint[1], definitions) : undefined',
					constant(
						literal(
							node[0] === "record"
								? fixedKeys(node[1])
								: undefined,
						),
					),
				);
				calls["constraint[1]"] = emit(node[1]);
				calls["constraint[2]"] = emit(node[2]);
				break;
		}
		code = code.replace(
			/parseConstraint\(([^,]+), (.*), definitions, operations\)/g,
			(_, child: string, args: string) => {
				if (!calls[child]) throw new Error(`Uncompiled child ${child}`);
				return `${calls[child]}(${args}, operations)`;
			},
		);
		if (/\b(?:constraint|definitions|parseConstraint)\b/.test(code))
			throw new Error(`Interpreter remained in ${node[0]}: ${code}`);
		emitted.push(`function ${name}(input,path,operations) {${code}\n}`);
		return name;
	}
	const roots = Object.entries(registry.roots).map(
		([key, node]) => `[${literal(key)}]:${emit(node)}`,
	);
	const helpers = [
		"arrayCheckIssues",
		"parseEnum",
		"numberCheckIssues",
		"requiredOperation",
		"prefixIssues",
		"crossTypeStringCheckIssues",
		"stringCheckIssues",
		"invalidType",
		"invalidValue",
		"formatPrimitive",
		"inputType",
		"failure",
		"success",
	];
	const source = `// @ts-nocheck\n// Experiment output. Generated at build time from validation artifacts.\nimport {ParsingError} from "common-utils";
import type {ParsingPath,ValidationOperations} from "common-utils";
export type CompiledValidator = (input:unknown,path:ParsingPath,operations:ValidationOperations) => {ok:true;value:unknown} | {ok:false;aborted:boolean;issues:any[]};
${constants.join("\n")}
${helpers.map((name) => functions.get(name)).join("\n")}
${emitted.join("\n")}
export const compiledRegistry: {version:1;roots:Record<string,CompiledValidator>;definitions:Record<string,never>} = {version:1,roots:{${roots.join(",")}},definitions:{}};
export function parseCompiled<Output>(artifact:{version:1;root:CompiledValidator;definitions?:unknown},input:unknown,operations:ValidationOperations={}):Output|ParsingError<Output> {
if(artifact.version!==1)throw new RangeError("Unsupported validation artifact version: "+String(artifact.version));
const result=artifact.root(input,[],operations);
return result.ok ? result.value as Output : new ParsingError<Output>(result.issues);
}
`;
	return {
		source,
		nodes: names.size,
		roots: roots.length,
		sourceBytes: Buffer.byteLength(source),
	};
}
