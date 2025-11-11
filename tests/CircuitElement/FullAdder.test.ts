import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { FullAdder } from "../../src/CircuitElement/FullAdder";

describe("FullAdder", () => {
  test("0 + 0 + 0 = sum:0, carry:0", () => {
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const sum = new CircuitBus(1);
    const carry = new CircuitBus(1);

    a.setValue(new BitString("0"));
    b.setValue(new BitString("0"));
    c.setValue(new BitString("0"));

    const adder = new FullAdder(a, b, c, sum, carry);
    adder.resolve();

    expect(sum.getValue()?.toString()).toBe("0");
    expect(carry.getValue()?.toString()).toBe("0");
  });

  test("1 + 0 + 0 = sum:1, carry:0", () => {
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const sum = new CircuitBus(1);
    const carry = new CircuitBus(1);

    a.setValue(new BitString("1"));
    b.setValue(new BitString("0"));
    c.setValue(new BitString("0"));

    const adder = new FullAdder(a, b, c, sum, carry);
    adder.resolve();

    expect(sum.getValue()?.toString()).toBe("1");
    expect(carry.getValue()?.toString()).toBe("0");
  });

  test("1 + 1 + 0 = sum:0, carry:1", () => {
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const sum = new CircuitBus(1);
    const carry = new CircuitBus(1);

    a.setValue(new BitString("1"));
    b.setValue(new BitString("1"));
    c.setValue(new BitString("0"));

    const adder = new FullAdder(a, b, c, sum, carry);
    adder.resolve();

    expect(sum.getValue()?.toString()).toBe("0");
    expect(carry.getValue()?.toString()).toBe("1");
  });

  test("1 + 1 + 1 = sum:1, carry:1", () => {
    const a = new CircuitBus(1);
    const b = new CircuitBus(1);
    const c = new CircuitBus(1);
    const sum = new CircuitBus(1);
    const carry = new CircuitBus(1);

    a.setValue(new BitString("1"));
    b.setValue(new BitString("1"));
    c.setValue(new BitString("1"));

    const adder = new FullAdder(a, b, c, sum, carry);
    adder.resolve();

    expect(sum.getValue()?.toString()).toBe("1");
    expect(carry.getValue()?.toString()).toBe("1");
  });
});
