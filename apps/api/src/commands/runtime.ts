import type { AuthUserId, RecommendationCycleKey } from "@savory/domain";

import type { BackendCommandTransactionRunner } from "./ports";

export interface BackendCommandActor {
  userId: AuthUserId;
}

export interface BackendCommandClock {
  currentRecommendationCycle(): RecommendationCycleKey;
}

export interface BackendCommandContext {
  actor: BackendCommandActor;
  transactions: BackendCommandTransactionRunner;
  clock: BackendCommandClock;
}

export interface SchemaLike<T> {
  parse(input: unknown): T;
}

export interface BackendCommandDefinition<Input, Output> {
  name: string;
  inputSchema: SchemaLike<Input>;
  outputSchema: SchemaLike<Output>;
  execute(context: BackendCommandContext, input: Input): Promise<Output>;
}

export function defineBackendCommand<Input, Output>(
  definition: BackendCommandDefinition<Input, Output>
): BackendCommandDefinition<Input, Output> {
  return definition;
}

export async function executeBackendCommand<Input, Output>(
  definition: BackendCommandDefinition<Input, Output>,
  context: BackendCommandContext,
  rawInput: unknown
): Promise<Output> {
  const input = definition.inputSchema.parse(rawInput);
  const output = await definition.execute(context, input);

  return definition.outputSchema.parse(output);
}
