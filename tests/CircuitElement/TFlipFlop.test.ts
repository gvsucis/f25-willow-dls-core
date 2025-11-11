import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { TFlipFlop } from "../../src/CircuitElement/TFlipFlop";

describe("TFlipFlop behavior", () => {
  it("initialize sets q and qInv correctly", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new TFlipFlop(clock, d, q, qInv, reset, preset, enable);

    ff.initialize(BitString.high());

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
    expect(qInv.getValue()?.equals(BitString.high().not())).toBeTruthy();
  });

  it("onClockRise sets q to not(d) when enabled", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new TFlipFlop(clock, d, q, qInv, reset, preset, enable);

    d.setValue(BitString.high());
    enable.setValue(BitString.high());

    clock.setValue(BitString.low());
    ff.resolve();
    clock.setValue(BitString.high());
    ff.resolve();

    // q should be not(d) -> low
    expect(q.getValue()?.equals(BitString.low())).toBeTruthy();
    // qInv should be q.not() -> high
    expect(qInv.getValue()?.equals(BitString.low().not())).toBeTruthy();
  });

  it("reset forces q to preset on resolve", () => {
    const clock = new CircuitBus(1);
    const d = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new TFlipFlop(clock, d, q, qInv, reset, preset, enable);

    preset.setValue(BitString.high());
    reset.setValue(BitString.high());
    clock.setValue(BitString.low());

    ff.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
  });
});
