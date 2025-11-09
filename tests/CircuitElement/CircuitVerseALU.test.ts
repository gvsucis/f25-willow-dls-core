import { test, expect } from "@jest/globals";

import { CircuitVerseALU } from "../../src/CircuitElement/CircuitVerseALU";
import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";

test("CircuitVerseALU performs AND, OR, ADD and less-than correctly", () => {
  const a = new CircuitBus(1);
  const b = new CircuitBus(1);
  const control = new CircuitBus(3);
  const output = new CircuitBus(1);
  const carryOut = new CircuitBus(1);

  const alu = new CircuitVerseALU(a, b, control, output, carryOut);

  // AND (000)
  a.setValue(new BitString("1"));
  b.setValue(new BitString("0"));
  control.setValue(new BitString("000"));
  alu.resolve();
  expect(output.getValue()!.toString()).toBe("0");

  // OR (001)
  b.setValue(new BitString("1"));
  control.setValue(new BitString("001"));
  alu.resolve();
  expect(output.getValue()!.toString()).toBe("1");

  // ADD (010) with carry
  a.setValue(new BitString("1"));
  b.setValue(new BitString("1"));
  control.setValue(new BitString("010"));
  alu.resolve();
  // sum should be 0, carryOut 1
  expect(output.getValue()!.toString()).toBe("0");
  expect(carryOut.getValue()!.toString()).toBe("1");

  // Less-than (111)
  a.setValue(new BitString("0"));
  b.setValue(new BitString("1"));
  control.setValue(new BitString("111"));
  alu.resolve();
  expect(output.getValue()!.toString()).toBe("1");

  // AND with NOT on b (100)
  a.setValue(new BitString("1"));
  b.setValue(new BitString("1"));
  control.setValue(new BitString("100"));
  alu.resolve();
  // a & ~b => 1 & 0 = 0
  expect(output.getValue()!.toString()).toBe("0");

  // OR with NOT on b (101)
  a.setValue(new BitString("0"));
  b.setValue(new BitString("0"));
  control.setValue(new BitString("101"));
  alu.resolve();
  // a | ~b => 0 | 1 = 1
  expect(output.getValue()!.toString()).toBe("1");

  // Subtract (110)
  a.setValue(new BitString("1"));
  b.setValue(new BitString("0"));
  control.setValue(new BitString("110"));
  alu.resolve();
  expect(output.getValue()!.toString()).toBe("1");

  // Default (unknown control) should set low
  control.setValue(new BitString("011"));
  alu.resolve();
  expect(output.getValue()!.toString()).toBe("0");
});
