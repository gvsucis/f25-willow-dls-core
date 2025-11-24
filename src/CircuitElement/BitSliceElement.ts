// src/CircuitElement/BitSliceElement.ts
import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";


export class BitSliceElement extends CircuitElement {
    private readonly base: CircuitBus;
    private readonly out: CircuitBus;
    private readonly bitIndex: number;

    constructor(base: CircuitBus, bitIndex: number, out: CircuitBus) {
        super("BitSlice", [base], [out]);
        this.base = base;
        this.out = out;
        this.bitIndex = bitIndex;
    }
   
    resolve(): number {
        const lastUpdate = this.base.getLastUpdate();
        const baseVal = this.base.getValue();

        // If the base bus has no value yet, propagate null.
        if (!baseVal) {
            console.log(
                `[BitSliceElement] base has no value yet; bitIndex=${this.bitIndex}`,
            );
            this.out.setValue(null, lastUpdate);
            return this.getPropagationDelay();
        }
        const outVal = baseVal.substring(this.bitIndex, this.bitIndex +1);
        const baseStr = String(baseVal);
        // console.log(
        //     `[BitSliceElement] base='${baseStr}' (len=${baseStr.length}) ` +
        //     `bitIndex=${this.bitIndex} -> out='${outVal}'`,
        // );
        this.out.setValue(outVal, lastUpdate);
        return this.getPropagationDelay();
    }
}
