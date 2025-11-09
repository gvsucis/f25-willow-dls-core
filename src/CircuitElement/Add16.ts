import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * 16-bit Adder for nand2tetris.
 *
 * Performs 16-bit integer 2's complement addition.
 *
 * Inputs: a[16], b[16]
 * Outputs: out[16]
 * Function: out = a + b (integer 2's complement addition)
 * Note: Overflow is neither detected nor handled.
 */
export class Add16 extends CircuitElement {
  constructor(
    a: CircuitBus,
    b: CircuitBus,
    output: CircuitBus
  ) {
    super("Add16Element", [a, b], [output]);
  }

  resolve(): number {
    const [a, b] = this.getInputs();
    const [output] = this.getOutputs();

    const aVal = a.getValue();
    const bVal = b.getValue();

    if (!aVal || !bVal) {
      output.setValue(BitString.low(16));
      return this.getPropagationDelay();
    }

    // Use BitString's add method for proper 16-bit 2's complement addition
    // This will naturally overflow/wrap at 16 bits
    const result = aVal.add(bVal);

    output.setValue(result);

    return this.getPropagationDelay();
  }
}
