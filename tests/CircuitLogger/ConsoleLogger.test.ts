import { test, expect, jest } from "@jest/globals";

import { ConsoleLogger } from "../../src/CircuitLogger/ConsoleLogger";
import { LogLevel } from "../../src/CircuitLogger";

test("ConsoleLogger outputs header, message and data via console.log", () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => { });

  const logger = new ConsoleLogger();
  const ts = new Date("2000-01-01T00:00:00Z");
  logger.output(1, ts, LogLevel.INFO, "TestSubsystem", "hello world", { a: 1 });

  expect(spy).toHaveBeenCalled();
  // First call contains header + message
  const first = spy.mock.calls[0][0] as string;
  expect(first).toContain("TestSubsystem");
  expect(first).toContain("hello world");

  // Later call contains indented data key
  const found = spy.mock.calls.some((c) => (c[0] as string).includes("a: "));
  expect(found).toBe(true);

  spy.mockRestore();
});
