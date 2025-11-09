import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * 4-way demultiplexer for nand2tetris.
 *
 * Routes the input to one of four outputs based on a 2-bit selector.
 * The other three outputs are set to 0.
 *
 * Inputs: in, sel[2]
 * Outputs: a, b, c, d
 * Function:
 *   if sel == 00 then {a=in, b=0, c=0, d=0}
 *   if sel == 01 then {a=0, b=in, c=0, d=0}
 *   if sel == 10 then {a=0, b=0, c=in, d=0}
 *   if sel == 11 then {a=0, b=0, c=0, d=in}
 */
export class DMux4Way extends CircuitElement {
  #selector: CircuitBus;

  constructor(
    input: CircuitBus,
    a: CircuitBus,
    b: CircuitBus,
    c: CircuitBus,
    d: CircuitBus,
    selector: CircuitBus
  ) {
    super("DMux4WayElement", [input], [a, b, c, d]);
    this.#selector = selector;
  }

  resolve(): number {
    const [input] = this.getInputs();
    const [a, b, c, d] = this.getOutputs();

    const inputVal = input.getValue() ?? BitString.low(1);
    const sel = this.#selector.getValue()?.toUnsigned() ?? 0;

    const zero = BitString.low(inputVal.getWidth());

    // Route input to the selected output, set others to 0
    switch (sel) {
      case 0:
        a.setValue(inputVal);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(zero);
        break;
      case 1:
        a.setValue(zero);
        b.setValue(inputVal);
        c.setValue(zero);
        d.setValue(zero);
        break;
      case 2:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(inputVal);
        d.setValue(zero);
        break;
      case 3:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(inputVal);
        break;
      default:
        throw new Error(`DMux4Way selector value ${sel} out of range (0-3)`);
    }

    return this.getPropagationDelay();
  }
}
