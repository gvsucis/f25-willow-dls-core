// src/CircuitElement/RangeSliceElement.ts
import { CircuitElement } from "../CircuitElement";
import { CircuitBus } from "../CircuitBus";
import { BitString } from "../BitString";

export class RangeSliceElement extends CircuitElement {
    private readonly base: CircuitBus;
    private readonly out: CircuitBus;
    private readonly lo: number;
    private readonly hi: number;

    constructor(base: CircuitBus, lo: number, hi: number, out: CircuitBus) {
        super("RangeSlice", [base], [out]);

        this.base = base;
        this.out = out;
        this.lo = lo;
        this.hi = hi;
    }

    resolve(): number {
        const lastUpdate = this.base.getLastUpdate();
        const baseVal = this.base.getValue();

        if (!baseVal) {
            console.log(
                `[RangeSliceElement] base has no value yet; lo=${this.lo}, hi=${this.hi}`,
            );
            this.out.setValue(null, lastUpdate);
            return this.getPropagationDelay();
        }
        
        const baseStr = String(baseVal);
        const width = baseStr.length;

        const loN = Math.min(this.lo, this.hi);
        const hiN = Math.max(this.lo, this.hi);

        // Map N2T indices (LSB=0) to string indices (MSB=0)
        const start = width - 1 - hiN;
        const endExclusive = width - loN; // substring end is exclusive

        if (start < 0 || endExclusive > width || start >= endExclusive) {
            console.warn(
                `[RangeSliceElement] invalid slice lo=${this.lo}, hi=${this.hi} for width=${width}`,
            );
            this.out.setValue(null, lastUpdate);
            return this.getPropagationDelay();
        }

        const sliceVal = baseVal.substring(start, endExclusive);
        console.log(
            `[RangeSliceElement] base='${baseStr}' (len=${width}) ` +
                `lo=${this.lo}, hi=${this.hi}, start=${start}, endExclusive=${endExclusive} -> out='${sliceVal}'`,
        );

        this.out.setValue(sliceVal, lastUpdate);
        return this.getPropagationDelay();
    }
}