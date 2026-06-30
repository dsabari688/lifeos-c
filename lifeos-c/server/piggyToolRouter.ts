import { toolRegistry } from "./piggyToolRegistry.js";

/**
 * Dispatches a tool execution request to its registered handler.
 */
export async function routeToolCall(
  toolId: string,
  args: any,
  userData: any
): Promise<any> {
  const tool = toolRegistry[toolId];
  if (!tool) {
    throw new Error(`Tool with ID "${toolId}" was not found in the Piggy Tool Registry.`);
  }

  // Ensure tool action argument is synchronized
  if (!args.action && tool.definition.supportedActions.length > 0) {
    args.action = tool.definition.supportedActions[0];
  }

  console.log(`[TOOL ROUTER] Routing to: ${tool.definition.name} (${toolId}) with action: ${args.action}`);
  return await tool.execute(args, userData);
}
