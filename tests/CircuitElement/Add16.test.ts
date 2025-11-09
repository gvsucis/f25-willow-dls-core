import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { Add16 } from "../../src/CircuitElement/Add16";

describe("Add16", () => {
  test("0 + 0 = 0", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const output = new CircuitBus(16);

    a.setValue(new BitString((0).toString(2), 16));
    b.setValue(new BitString((0).toString(2), 16));

    const adder = new Add16(a, b, output);
    adder.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(0);
  });

  test("5 + 7 = 12", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const output = new CircuitBus(16);

    a.setValue(new BitString((5).toString(2), 16));
    b.setValue(new BitString((7).toString(2), 16));

    const adder = new Add16(a, b, output);
    adder.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(12);
  });

  test("100 + 200 = 300", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const output = new CircuitBus(16);

    a.setValue(new BitString((100).toString(2), 16));
    b.setValue(new BitString((200).toString(2), 16));

    const adder = new Add16(a, b, output);
    adder.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(300);
  });

  test("Overflow wraps around (65535 + 1 = 0)", () => {
    const a = new CircuitBus(16);
    const b = new CircuitBus(16);
    const output = new CircuitBus(16);

    a.setValue(new BitString((65535).toString(2), 16));
    b.setValue(new BitString((1).toString(2), 16));

    const adder = new Add16(a, b, output);
    adder.resolve();

    expect(output.getValue()?.toUnsigned()).toBe(0);
  });
});
