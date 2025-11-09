import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

/**
 * 8-way demultiplexer for nand2tetris.
 *
 * Routes the input to one of eight outputs based on a 3-bit selector.
 * The other seven outputs are set to 0.
 *
 * Inputs: in, sel[3]
 * Outputs: a, b, c, d, e, f, g, h
 * Function:
 *   if sel == 000 then {a=in, others=0}
 *   if sel == 001 then {b=in, others=0}
 *   if sel == 010 then {c=in, others=0}
 *   if sel == 011 then {d=in, others=0}
 *   if sel == 100 then {e=in, others=0}
 *   if sel == 101 then {f=in, others=0}
 *   if sel == 110 then {g=in, others=0}
 *   if sel == 111 then {h=in, others=0}
 */
export class DMux8Way extends CircuitElement {
  #selector: CircuitBus;

  constructor(
    input: CircuitBus,
    a: CircuitBus,
    b: CircuitBus,
    c: CircuitBus,
    d: CircuitBus,
    e: CircuitBus,
    f: CircuitBus,
    g: CircuitBus,
    h: CircuitBus,
    selector: CircuitBus
  ) {
    super("DMux8WayElement", [input], [a, b, c, d, e, f, g, h]);
    this.#selector = selector;
  }

  resolve(): number {
    const [input] = this.getInputs();
    const [a, b, c, d, e, f, g, h] = this.getOutputs();

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
        e.setValue(zero);
        f.setValue(zero);
        g.setValue(zero);
        h.setValue(zero);
        break;
      case 1:
        a.setValue(zero);
        b.setValue(inputVal);
        c.setValue(zero);
        d.setValue(zero);
        e.setValue(zero);
        f.setValue(zero);
        g.setValue(zero);
        h.setValue(zero);
        break;
      case 2:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(inputVal);
        d.setValue(zero);
        e.setValue(zero);
        f.setValue(zero);
        g.setValue(zero);
        h.setValue(zero);
        break;
      case 3:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(inputVal);
        e.setValue(zero);
        f.setValue(zero);
        g.setValue(zero);
        h.setValue(zero);
        break;
      case 4:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(zero);
        e.setValue(inputVal);
        f.setValue(zero);
        g.setValue(zero);
        h.setValue(zero);
        break;
      case 5:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(zero);
        e.setValue(zero);
        f.setValue(inputVal);
        g.setValue(zero);
        h.setValue(zero);
        break;
      case 6:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(zero);
        e.setValue(zero);
        f.setValue(zero);
        g.setValue(inputVal);
        h.setValue(zero);
        break;
      case 7:
        a.setValue(zero);
        b.setValue(zero);
        c.setValue(zero);
        d.setValue(zero);
        e.setValue(zero);
        f.setValue(zero);
        g.setValue(zero);
        h.setValue(inputVal);
        break;
      default:
        throw new Error(`DMux8Way selector value ${sel} out of range (0-7)`);
    }

    return this.getPropagationDelay();
  }
}
