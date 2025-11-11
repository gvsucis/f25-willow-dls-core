import { test, expect } from "@jest/globals";

import { ControlledInverter } from "../../src/CircuitElement/ControlledInverter";
import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";

test("ControlledInverter outputs negated input when state high, else null", () => {
  const input = new CircuitBus(1);
  const state = new CircuitBus(1);
  const output = new CircuitBus(1);

  const inv = new ControlledInverter(input, state, output);

  // state low -> output null
  state.setValue(BitString.low());
  input.setValue(BitString.high());
  inv.resolve();
  expect(output.getValue()).toBeNull();

  // state high -> output = not(input)
  state.setValue(BitString.high());
  input.setValue(BitString.high());
  inv.resolve();
  expect(output.getValue()!.toString()).toBe(BitString.high().not().toString());
});
