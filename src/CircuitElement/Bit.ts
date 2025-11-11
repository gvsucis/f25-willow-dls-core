import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * 1-bit register for nand2tetris.
 *
 * Stores a single bit value. When load=1, stores the input value.
 * When load=0, maintains its previous value.
 *
 * Inputs: in (1 bit), load (1 bit)
 * Outputs: out (1 bit)
 * Function:
 *   if load(t) then out(t+1) = in(t)
 *   else out(t+1) = out(t)
 *
 * This is a sequential element that updates on clock ticks.
 */
export class Bit extends CircuitElement {
  #load: CircuitBus;
  #storedValue: BitString;

  constructor(
    input: CircuitBus,
    output: CircuitBus,
    load: CircuitBus
  ) {
    super("BitElement", [input], [output]);
    this.#load = load;
    this.#storedValue = BitString.low(1);
  }

  resolve(): number {
    const [input] = this.getInputs();
    const [output] = this.getOutputs();

    const loadVal = this.#load.getValue()?.toUnsigned() ?? 0;
    const inputVal = input.getValue() ?? BitString.low(1);

    // If load is 1, store the new input value
    if (loadVal === 1) {
      this.#storedValue = inputVal;
    }
    // Otherwise, keep the previous stored value

    // Always output the current stored value
    output.setValue(this.#storedValue);

    return this.getPropagationDelay();
  }

  reset(): void {
    super.reset();
    this.#storedValue = BitString.low(1);
  }
}
