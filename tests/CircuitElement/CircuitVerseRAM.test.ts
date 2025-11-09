import { test, expect } from "@jest/globals";

import { CircuitVerseRAM } from "../../src/CircuitElement/CircuitVerseRAM";
import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";

test("CircuitVerseRAM reset clears memory and sets output to zero", () => {
  const address = new CircuitBus(2);
  const input = new CircuitBus(2);
  const write = new CircuitBus(1);
  const reset = new CircuitBus(1);
  const output = new CircuitBus(2);

  const initial = [new BitString("11"), new BitString("10")];
  const ram = new CircuitVerseRAM(address, input, write, reset, output, 4, 2, initial);

  // Assert initial content at index 1 is initial[1]
  address.setValue(new BitString("01"));
  write.setValue(new BitString("0"));
  reset.setValue(new BitString("0"));
  ram.resolve();
  expect(output.getValue()!.toString()).toBe("10");

  // Reset high should clear memory
  reset.setValue(new BitString("1"));
  ram.resolve();
  expect(output.getValue()!.toString()).toBe("00");
  // internal data should be zeros
  expect(ram.read(0, 4).every((d) => d.equals(BitString.low(2)))).toBe(true);
});

test("CircuitVerseRAM writes and reads when write enabled", () => {
  const address = new CircuitBus(2);
  const input = new CircuitBus(2);
  const write = new CircuitBus(1);
  const reset = new CircuitBus(1);
  const output = new CircuitBus(2);

  const initial = [new BitString("00"), new BitString("01"), new BitString("10"), new BitString("11")];
  const ram = new CircuitVerseRAM(address, input, write, reset, output, 4, 2, initial);

  // Write value 11 to address 2
  address.setValue(new BitString("10"));
  input.setValue(new BitString("11"));
  write.setValue(new BitString("1"));
  reset.setValue(new BitString("0"));
  ram.resolve();

  // After write, output should reflect written value
  expect(output.getValue()!.toString()).toBe("11");
  // Reading internal storage at index 2 should match (Memory.read uses slice(start,end))
  expect(ram.read(2, 3)[0].toString()).toBe("11");
});
