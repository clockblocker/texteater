export interface AstNode {
	readonly type: string;
	readonly parent?: AstNode | null;
	readonly [key: string]: unknown;
}

interface ScopeDef {
	readonly type: string;
	readonly node: AstNode;
	readonly parent?: AstNode | null;
}

interface ScopeVariable {
	readonly defs: readonly ScopeDef[];
}

interface Scope {
	readonly set: ReadonlyMap<string, ScopeVariable>;
	readonly upper: Scope | null;
}

export interface RuleContext {
	readonly filename: string;
	readonly sourceCode: {
		readonly text: string;
		getScope(node: AstNode): Scope;
	};
	report(descriptor: {
		readonly node: AstNode;
		readonly message: string;
	}): void;
}

type VisitorHandler = (node: AstNode) => void;

interface RuleVisitor {
	before?: () => void;
	[selector: string]: VisitorHandler | (() => void) | undefined;
}

export interface RuleDefinition {
	readonly meta: {
		readonly type: "problem" | "suggestion" | "layout";
		readonly docs: {
			readonly description: string;
		};
		readonly schema?: readonly unknown[];
	};
	readonly create?: (context: RuleContext) => RuleVisitor;
	readonly createOnce?: (context: RuleContext) => RuleVisitor;
}

export interface PluginDefinition {
	readonly meta: {
		readonly name: string;
	};
	readonly rules: Readonly<Record<string, RuleDefinition>>;
}

export function defineRule(rule: RuleDefinition): RuleDefinition {
	return rule;
}

export function definePlugin(plugin: PluginDefinition): PluginDefinition {
	return plugin;
}
