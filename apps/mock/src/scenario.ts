export type Scenario = "v1" | "v2" | "v3";

export const SCENARIOS: readonly Scenario[] = ["v1", "v2", "v3"] as const;

let current: Scenario = "v1";

export const getScenario = (): Scenario => current;

export const setScenario = (next: Scenario): void => {
  current = next;
};

export const isScenario = (value: string): value is Scenario =>
  (SCENARIOS as readonly string[]).includes(value);
