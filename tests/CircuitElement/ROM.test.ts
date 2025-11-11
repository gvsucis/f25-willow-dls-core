import { test, expect } from "@jest/globals";

import { ROM } from "../../src/CircuitElement/ROM";
import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";

test("ROM constructor enforces 8-bit words and returns data when enabled", () => {
  const addr = new CircuitBus(8);
  const enable = new CircuitBus(1);
  const output = new CircuitBus(8);

  // invalid width should throw
  expect(() => new ROM(addr, output, enable, [new BitString("1")], 4)).toThrow();

  // valid data
  const data = [
    new BitString("00000001"),
    new BitString("00000010"),
    new BitString("00000011"),
  ];

  const rom = new ROM(addr, output, enable, data, 4);

  // enable low -> no output
  enable.setValue(BitString.low());
  addr.setValue(new BitString("00000001"));
  rom.resolve();
  expect(output.getValue()).toBeNull();

  // enable high and address 1 -> outputs data[1]
  enable.setValue(BitString.high());
  addr.setValue(new BitString("00000001"));
  rom.resolve();
  expect(output.getValue()!.toString()).toBe(data[1].toString());
});
