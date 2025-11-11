import { test, expect } from "@jest/globals";

import { Splitter } from "../../src/CircuitElement/Splitter";
import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";

test("Splitter.propOut assigns slices in CircuitVerse order (reversed)", () => {
  // input width 4, two outputs width 2
  const inBus = new CircuitBus(4);
  const outA = new CircuitBus(2);
  const outB = new CircuitBus(2);

  const splitter = new Splitter([2, 2], inBus, [outA, outB]);

  // Set input; outputs are null so propOut branch is taken
  inBus.setValue(new BitString("1011"));

  splitter.resolve();

  // Because of legacy CircuitVerse ordering, the first slice maps to the last output
  expect(outA.getValue()!.toString()).toBe("11");
  expect(outB.getValue()!.toString()).toBe("10");
});

test("Splitter.propIn combines outputs into input correctly", () => {
  const inBus = new CircuitBus(4);
  const outA = new CircuitBus(2);
  const outB = new CircuitBus(2);

  const splitter = new Splitter([2, 2], inBus, [outA, outB]);

  // Set outputs according to Splitter mapping that propOut produced earlier
  outA.setValue(new BitString("11"));
  outB.setValue(new BitString("10"));

  // Inputs are null so propIn branch should combine outputs into input
  splitter.resolve();

  expect(inBus.getValue()!.toString()).toBe("1011");
});

test("Splitter.getOutputs returns input when lastOp == 'propIn'", () => {
  const inBus = new CircuitBus(4);
  const outA = new CircuitBus(2);
  const outB = new CircuitBus(2);

  const splitter = new Splitter([2, 2], inBus, [outA, outB]);

  outA.setValue(new BitString("11"));
  outB.setValue(new BitString("10"));

  splitter.resolve();

  // After propIn, getOutputs should return the input bus in a single-element array
  const outs = splitter.getOutputs();
  expect(outs.length).toBe(1);
  expect(outs[0]).toBe(inBus);
});

test("Splitter.propIn throws on output width mismatch", () => {
  const inBus = new CircuitBus(4);
  // Make one output the wrong width
  const outA = new CircuitBus(1);
  const outB = new CircuitBus(2);

  const splitter = new Splitter([2, 2], inBus, [outA, outB]);

  outA.setValue(new BitString("1"));
  outB.setValue(new BitString("10"));

  expect(() => splitter.resolve()).toThrow(/SplitterElement bus width error/);
});

test("Splitter throws contention error when inputs and outputs changed simultaneously and disagree", () => {
  const inBus = new CircuitBus(4);
  const outA = new CircuitBus(2);
  const outB = new CircuitBus(2);

  const splitter = new Splitter([2, 2], inBus, [outA, outB]);

  // Set both input and outputs to conflicting values without timestamps
  inBus.setValue(new BitString("0000"));
  outA.setValue(new BitString("11"));
  outB.setValue(new BitString("10"));

  expect(() => splitter.resolve()).toThrow(/Splitter contention/);
});
