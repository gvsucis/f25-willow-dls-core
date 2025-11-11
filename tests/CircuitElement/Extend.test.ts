import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { Extend } from "../../src/CircuitElement/Extend";

describe("Extend element", () => {
  it("duplicates input to all outputs", () => {
    const input = new CircuitBus(2);
    const out1 = new CircuitBus(2);
    const out2 = new CircuitBus(2);
    const out3 = new CircuitBus(2);

    const ext = new Extend(input, [out1, out2, out3]);

    input.setValue(new BitString("10"));

    ext.resolve();

    expect(out1.getValue()?.equals("10")).toBeTruthy();
    expect(out2.getValue()?.equals("10")).toBeTruthy();
    expect(out3.getValue()?.equals("10")).toBeTruthy();
  });

  it("propagates null (floating) to outputs", () => {
    const input = new CircuitBus(1);
    const out1 = new CircuitBus(1);
    const out2 = new CircuitBus(1);

    const ext = new Extend(input, [out1, out2]);

    // leave input unset (null)
    ext.resolve();

    expect(out1.getValue()).toBeNull();
    expect(out2.getValue()).toBeNull();
  });
});
