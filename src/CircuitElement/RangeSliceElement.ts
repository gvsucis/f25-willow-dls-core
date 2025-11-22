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
            this.out.setValue(null, lastUpdate);
            return this.getPropagationDelay();
        }

        const start = Math.min(this.lo, this.hi);
        const end = Math.max(this.lo, this.hi);
        const sliceVal = baseVal.substring(start, end+1);

        this.out.setValue(sliceVal, lastUpdate);
        return this.getPropagationDelay();
    }
    }