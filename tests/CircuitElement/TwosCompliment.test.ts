import { test, expect } from "@jest/globals";

import { TwosCompliment } from "../../src/CircuitElement/TwosCompliment";
import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";

test("TwosCompliment computes two's complement of input", () => {
  const input = new CircuitBus(3);
  const output = new CircuitBus(3);
  const tw = new TwosCompliment(input, output);

  input.setValue(new BitString("001")); // 1
  tw.resolve();
  // two's complement of 1 in 3 bits: invert 001 -> 110 add 1 -> 111
  expect(output.getValue()!.toString()).toBe(new BitString("111").toString());

  input.setValue(new BitString("000")); // 0
  tw.resolve();
  expect(output.getValue()!.toString()).toBe(new BitString("000").toString());
});
