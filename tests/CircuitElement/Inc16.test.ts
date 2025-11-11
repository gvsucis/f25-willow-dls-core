import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { Inc16 } from "../../src/CircuitElement/Inc16";

describe("Inc16", () => {
  test("0 + 1 = 1", () => {
    const input = new CircuitBus(16);
    const output = new CircuitBus(16);

    input.setValue(new BitString((0).toString(2), 16));

    const inc = new Inc16(input, output);
    inc.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(1);
  });

  test("5 + 1 = 6", () => {
    const input = new CircuitBus(16);
    const output = new CircuitBus(16);

    input.setValue(new BitString((5).toString(2), 16));

    const inc = new Inc16(input, output);
    inc.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(6);
  });

  test("100 + 1 = 101", () => {
    const input = new CircuitBus(16);
    const output = new CircuitBus(16);

    input.setValue(new BitString((100).toString(2), 16));

    const inc = new Inc16(input, output);
    inc.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(101);
  });

  test("Overflow wraps around (65535 + 1 = 0)", () => {
    const input = new CircuitBus(16);
    const output = new CircuitBus(16);

    input.setValue(new BitString((65535).toString(2), 16));

    const inc = new Inc16(input, output);
    inc.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(0);
  });
});
