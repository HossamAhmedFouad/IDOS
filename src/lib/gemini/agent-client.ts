/**
 * Gemini agent client: convert tool definitions to SDK format and create model.
 */

import {
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type FunctionDeclarationsTool,
} from "@google/generative-ai";
import type { ToolDefinitionForAI } from "@/lib/types/agent";

const AGENT_MODEL = "gemini-3-flash-preview";
const MAX_ITERATIONS = 40;

function mapPropertyToSchema(prop: {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}): FunctionDeclarationSchema["properties"][string] {
  if (prop.enum) {
    return {
      type: SchemaType.STRING,
      format: "enum",
      enum: prop.enum,
      description: prop.description,
    };
  }
  const typeMap: Record<string, SchemaType> = {
    string: SchemaType.STRING,
    number: SchemaType.NUMBER,
    integer: SchemaType.INTEGER,
    boolean: SchemaType.BOOLEAN,
    object: SchemaType.OBJECT,
    array: SchemaType.ARRAY,
  };
  const t = typeMap[prop.type] ?? SchemaType.STRING;

  if (t === SchemaType.ARRAY && prop.items?.type) {
    const itemType = typeMap[prop.items.type] ?? SchemaType.STRING;
    return {
      type: SchemaType.ARRAY,
      description: prop.description,
      items: { type: itemType },
    } as FunctionDeclarationSchema["properties"][string];
  }

  return {
    type: t,
    description: prop.description,
  } as FunctionDeclarationSchema["properties"][string];
}

function toolDefinitionToFunctionDeclaration(
  def: ToolDefinitionForAI
): FunctionDeclaration {
  const params = def.parameters;
  const schema: FunctionDeclarationSchema = {
    type: SchemaType.OBJECT,
    properties: {},
    required: params.required ?? [],
  };
  for (const [key, prop] of Object.entries(params.properties)) {
    schema.properties[key] = mapPropertyToSchema(prop);
  }
  return {
    name: def.name,
    description: def.description,
    parameters: schema,
  };
}

export function toolDefinitionsToGeminiTools(
  definitions: ToolDefinitionForAI[]
): FunctionDeclarationsTool[] {
  const functionDeclarations = definitions.map(toolDefinitionToFunctionDeclaration);
  return [{ functionDeclarations }];
}

export function buildAgentSystemInstruction(
  intent: string,
  toolList: { name: string; description: string }[]
): string {
  return `You are an AI agent controlling workspace applications.

You have access to the following tools:
${toolList.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

Your goal: ${intent}

Think step-by-step:
1. Determine which tools you need to fully satisfy the user's request.
2. Call tools in the right order (one tool call per step; the system will send you the result and you can then call the next).
3. Use results from previous tools to inform the next steps.
4. Do NOT respond with only text ("Done", "Task complete", etc.) until the user's request is fully done. If more tool calls are needed to complete the goal, always make the next tool call instead of replying with text.
5. Only when every part of the user's intent is satisfied (e.g. all requested items created, drawn, or updated), then reply briefly with a summary—no further tool call.

When creating a note that contains or is written in markdown, use a path with the .md extension (e.g. /notes/my-note.md). Use .txt or no extension for plain text notes.

Always explain briefly what you're doing before calling a tool. Prefer calling more tools to finish the task rather than stopping early.`;
}

export function createAgentModel(
  apiKey: string,
  toolDefinitions: ToolDefinitionForAI[],
  systemInstruction: string
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const tools = toolDefinitionsToGeminiTools(toolDefinitions);
  return genAI.getGenerativeModel({
    model: AGENT_MODEL,
    tools,
    systemInstruction,
  });
}

export { MAX_ITERATIONS };
