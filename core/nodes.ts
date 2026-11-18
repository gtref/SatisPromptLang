export interface ProgramNode {
  kind: "Program";
  context: PromptTextNode[];
  feature: FeatureDeclarationNode;
}

export interface FeatureDeclarationNode {
  kind: "FeatureDeclaration";
  name: string;
  options: OptionDeclarationNode[];
  actions: ActionDeclarationNode[];
  context: PromptTextNode[];
}

export interface OptionDeclarationNode {
  kind: "OptionDeclaration";
  name: string;
  value: OptionValueNode;
}

export interface ActionDeclarationNode {
  kind: "ActionDeclaration";
  name: string;
  body: PromptTextNode[];
}

export interface PromptTextNode {
  kind: "PromptText";
  value: string;
}

export interface LiteralNode {
  kind: "Literal";
  value: string | number | boolean | null;
}

export interface ArrayLiteralNode {
  kind: "ArrayLiteral";
  elements: OptionValueNode[];
}

export type OptionValueNode = LiteralNode | ArrayLiteralNode;
export type AstNode =
  | ProgramNode
  | FeatureDeclarationNode
  | OptionDeclarationNode
  | ActionDeclarationNode
  | PromptTextNode
  | OptionValueNode;
