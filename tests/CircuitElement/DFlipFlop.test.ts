import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { DFlipFlop } from "../../src/CircuitElement/DFlipFlop";

describe("DFlipFlop sequential behavior", () => {
  it("initialize sets q and qInv correctly", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new DFlipFlop(clock, d, q, qInv, reset, preset, enable);

    ff.initialize(BitString.high());

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });

  it("captures d on rising edge when enable is high", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new DFlipFlop(clock, d, q, qInv, reset, preset, enable);

    // set initial q low
    q.setValue(BitString.low());

    // d is high, enable high
    d.setValue(BitString.high());
    enable.setValue(BitString.high());

    // simulate clock low -> high
    clock.setValue(BitString.low());
    ff.resolve();
    clock.setValue(BitString.high());
    ff.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });

  it("reset sets q to preset regardless of clock", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new DFlipFlop(clock, d, q, qInv, reset, preset, enable);

    // preset value high
    preset.setValue(BitString.high());
    reset.setValue(BitString.high());

    // ensure clock has a value so resolve() actually runs onResolve()
    clock.setValue(BitString.low());
    // call resolve - onResolve should pass preset through
    ff.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });
});
