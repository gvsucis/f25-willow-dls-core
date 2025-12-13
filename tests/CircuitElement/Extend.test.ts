import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { Extend } from "../../src/CircuitElement/Extend";

describe("Extend element", () => {
  it("duplicates input to all outputs", () => {
    const input = new CircuitBus(1);
    const output = new CircuitBus(6);

    const ext = new Extend(input, output);

    input.setValue(new BitString("1"));

    ext.resolve();

    expect(output.getValue()?.equals("111111")).toBeTruthy();
  });

  it("propagates null (floating) to outputs", () => {
    const input = new CircuitBus(1);
    const output = new CircuitBus(5);

    const ext = new Extend(input, output);

    // leave input unset (null)
    ext.resolve();

    expect(output.getValue()).toBeNull();
  });

  it("Does not allow inputs of width 2 or more", () => {
    const input = new CircuitBus(2);
    const output = new CircuitBus(6);

    expect(() => new Extend(input, output)).toThrow();
  });
});
