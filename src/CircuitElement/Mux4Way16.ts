import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";

/**
 * 4-way 16-bit multiplexer for nand2tetris.
 *
 * Selects one of four 16-bit inputs based on a 2-bit selector.
 *
 * Inputs: a[16], b[16], c[16], d[16], sel[2]
 * Outputs: out[16]
 * Function:
 *   if sel == 00 then out = a
 *   if sel == 01 then out = b
 *   if sel == 10 then out = c
 *   if sel == 11 then out = d
 */
export class Mux4Way16 extends CircuitElement {
  #selector: CircuitBus;

  constructor(
    a: CircuitBus,
    b: CircuitBus,
    c: CircuitBus,
    d: CircuitBus,
    output: CircuitBus,
    selector: CircuitBus
  ) {
    super("Mux4Way16Element", [a, b, c, d], [output]);
    this.#selector = selector;
  }

  resolve(): number {
    const [a, b, c, d] = this.getInputs();
    const [output] = this.getOutputs();

    const sel = this.#selector.getValue()?.toUnsigned() ?? 0;

    // Select the appropriate input based on selector value
    let selectedInput: CircuitBus;
    switch (sel) {
      case 0:
        selectedInput = a;
        break;
      case 1:
        selectedInput = b;
        break;
      case 2:
        selectedInput = c;
        break;
      case 3:
        selectedInput = d;
        break;
      default:
        throw new Error(`Mux4Way16 selector value ${sel} out of range (0-3)`);
    }

    output.setValue(selectedInput.getValue());

    return this.getPropagationDelay();
  }
}
