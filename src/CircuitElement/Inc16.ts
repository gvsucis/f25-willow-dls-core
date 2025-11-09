import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * 16-bit Incrementer for nand2tetris.
 *
 * Adds 1 to a 16-bit value.
 *
 * Inputs: in[16]
 * Outputs: out[16]
 * Function: out = in + 1 (integer 2's complement addition)
 */
export class Inc16 extends CircuitElement {
  constructor(
    input: CircuitBus,
    output: CircuitBus
  ) {
    super("Inc16Element", [input], [output]);
  }

  resolve(): number {
    const [input] = this.getInputs();
    const [output] = this.getOutputs();

    const inputVal = input.getValue();

    if (!inputVal) {
      output.setValue(BitString.low(16));
      return this.getPropagationDelay();
    }

    // Add 1 using BitString's add method
    const one = new BitString("1", 16);
    const result = inputVal.add(one);

    output.setValue(result);

    return this.getPropagationDelay();
  }
}
