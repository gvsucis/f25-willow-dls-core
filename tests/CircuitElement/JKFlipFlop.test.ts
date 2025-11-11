import { BitString } from "../../src/BitString";
import { CircuitBus } from "../../src/CircuitBus";
import { JKFlipFlop } from "../../src/CircuitElement/JKFlipFlop";

describe("JKFlipFlop behavior", () => {
  it("J=1,K=0 sets Q high on rising edge when enabled", () => {
    const clock = new CircuitBus(1);
    const j = new CircuitBus(1);
    const k = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new JKFlipFlop(clock, j, k, q, qInv, reset, preset, enable);

    enable.setValue(BitString.high());
    j.setValue(BitString.high());
    k.setValue(BitString.low());

    clock.setValue(BitString.low());
    ff.resolve();
    clock.setValue(BitString.high());
    ff.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
  });

  it("J=0,K=1 sets Q low on rising edge when enabled", () => {
    const clock = new CircuitBus(1);
    const j = new CircuitBus(1);
    const k = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new JKFlipFlop(clock, j, k, q, qInv, reset, preset, enable);

    enable.setValue(BitString.high());
    j.setValue(BitString.low());
    k.setValue(BitString.high());

    clock.setValue(BitString.low());
    ff.resolve();
    clock.setValue(BitString.high());
    ff.resolve();

    expect(q.getValue()?.equals(BitString.low())).toBeTruthy();
  });

  it("J=1,K=1 toggles Q on rising edge when enabled", () => {
    const clock = new CircuitBus(1);
    const j = new CircuitBus(1);
    const k = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new JKFlipFlop(clock, j, k, q, qInv, reset, preset, enable);

    // start q low
    ff.initialize(BitString.low());

    enable.setValue(BitString.high());
    j.setValue(BitString.high());
    k.setValue(BitString.high());

    // rising edge -> toggle low -> high
    clock.setValue(BitString.low());
    ff.resolve();
    clock.setValue(BitString.high());
    ff.resolve();
    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();

    // another rising edge toggles back
    clock.setValue(BitString.low());
    ff.resolve();
    clock.setValue(BitString.high());
    ff.resolve();
    expect(q.getValue()?.equals(BitString.low())).toBeTruthy();
  });

  it("reset forces q to preset on resolve when reset is high", () => {
    const clock = new CircuitBus(1);
    const j = new CircuitBus(1);
    const k = new CircuitBus(1);
    const q = new CircuitBus(1);
    const qInv = new CircuitBus(1);
    const reset = new CircuitBus(1);
    const preset = new CircuitBus(1);
    const enable = new CircuitBus(1);

    const ff = new JKFlipFlop(clock, j, k, q, qInv, reset, preset, enable);

    preset.setValue(BitString.high());
    reset.setValue(BitString.high());
    clock.setValue(BitString.low());

    ff.resolve();

    expect(q.getValue()?.equals(BitString.high())).toBeTruthy();
  });
});
