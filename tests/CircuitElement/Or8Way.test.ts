import { CircuitBus } from "../../src/CircuitBus";
import { BitString } from "../../src/BitString";
import { Or8Way } from "../../src/CircuitElement/Or8Way";

describe("Or8Way", () => {
  test("All zeros returns 0", () => {
    const input = new CircuitBus(8);
    const output = new CircuitBus(1);

    input.setValue(new BitString("00000000"));

    const gate = new Or8Way(input, output);
    gate.resolve();

    expect(output.getValue()?.toString()).toBe("0");
  });

  test("One bit set returns 1", () => {
    const input = new CircuitBus(8);
    const output = new CircuitBus(1);

    input.setValue(new BitString("00000001"));

    const gate = new Or8Way(input, output);
    gate.resolve();

    expect(output.getValue()?.toString()).toBe("1");
  });

  test("Multiple bits set returns 1", () => {
    const input = new CircuitBus(8);
    const output = new CircuitBus(1);

    input.setValue(new BitString("10100100"));

    const gate = new Or8Way(input, output);
    gate.resolve();

    expect(output.getValue()?.toString()).toBe("1");
  });

  test("All ones returns 1", () => {
    const input = new CircuitBus(8);
    const output = new CircuitBus(1);

    input.setValue(new BitString("11111111"));

    const gate = new Or8Way(input, output);
    gate.resolve();

    expect(output.getValue()?.toString()).toBe("1");
  });
});
