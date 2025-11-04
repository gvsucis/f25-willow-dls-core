import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { JLSRegister } from "../../src/CircuitElement/JLSRegister";

describe("JLSRegister sequential behavior", () => {
  it("positive-triggered (pff) updates on rising edge and initialize works", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);

    const reg = new JLSRegister(clock, d, q, qInv, "pff");

    // initialize
    reg.initialize(BitString.low());
    expect(q.getValue()?.equals(BitString.low())).toBeTruthy();

    // set d high and toggle rising edge
    d.setValue(BitString.high());
    clock.setValue(BitString.low());
    reg.resolve();
    clock.setValue(BitString.high());
    reg.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });

  it("negative-triggered (nff) updates on falling edge", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);

    const reg = new JLSRegister(clock, d, q, qInv, "nff");

    // set d high and trigger falling edge
    d.setValue(BitString.high());
    clock.setValue(BitString.high());
    reg.resolve();
    clock.setValue(BitString.low());
    reg.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });
});
