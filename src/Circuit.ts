/*
 * Copyright (c) 2025 Jordan Bancino <jordan@bancino.net>
 * Copyright (c) 2025 Austin Hargis <hargisa@mail.gvsu.edu>
 * Copyright (c) 2025 Aaron MacDougall <macdouaa@mail.gvsu.edu>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { BitString } from "./BitString";
import { CircuitElement } from "./CircuitElement";
import { Clock } from "./CircuitElement/Clock";
import { Input } from "./CircuitElement/Input";
import { Memory } from "./CircuitElement/Memory";
import { Output } from "./CircuitElement/Output";
import { SimulationStopError } from "./CircuitElement/Stop";
import { SubCircuit } from "./CircuitElement/SubCircuit";
import { CircuitLoggable, LogLevel } from "./CircuitLogger";

/**
 * There are multiple ways to run a circuit with {@link Circuit.run}. You can either
 * pass in a keyed object where the keys are {@link Input} labels and the values are
 * the {@link BitString} values, or you can simply pass in a straight array of
 * {@link BitString}s.
 */
export type CircuitRunType =
  | Record<string, BitString | string>
  | (BitString | string | null)[];

/**
 * A type describing the circuit output.
 */
export interface CircuitOutput {
  [key: string]: BitString;
}

/**
 * {@link Circuit.run} returns this type, which contains the output values in the
 * same format that they were passed in to {@link Circuit.run}. That is, if you passed
 * an object, you'll get a keyed object where the keys are {@link Output} labels and
 * the values are {@link BitString}s, and if you pass in an array, you'll get an array
 * out as well.
 *
 * You can also get the propagation delay of the circuit after it was executed as well
 * as the number of internal simulation steps it took to execute the circuit. This
 * value probably won't be that useful beyond attempting to optimize circuits for
 * shorter runtime.
 */
export type CircuitRunResult = {
  stop: boolean;
  outputs: CircuitOutput;
  propagationDelay: number;
  steps: number;
};

/**
 * The Circuit is how you execute the simulation. It provides everything you
 * need to evaluate a complete circuit (which may or may not consist of {@link SubCircuit}s)
 * with or without a clock.
 *
 * If a circuit has no clock, then it is simply evaluated like a combinatorial
 * or sequential circuit. However, if it does have a clock, then the engine will
 * tick the clock automatically, evaluating the circuit each clock cycle.
 *
 * It is highly unlikely that you will instantiate this class directly; rather, you
 * should normally retrieve circuits from your {@link CircuitProject}, provided to
 * you by a {@link CircuitLoader} (see {@link loadProject}).
 *
 * > [!NOTE] This simulation engine is not thread-safe. While this shouldn't be
 * > a concern for most JavaScript environments, it is important to remember that
 * > this class contains a lot of internal state which is not intended to be mutated
 * > by different operating system threads at the same time.
 * >
 * > You absolutely cannot call {@link run} or {@link resolve} from two different
 * > threads, or modify the circuit while it is running in another thread. This will
 * > result in unintended consequences and undefined behavior.
 */
export class Circuit extends CircuitLoggable {
  #labeledElements: Record<string, CircuitElement>;
  #elements: CircuitElement[];
  #clocks: Clock[];

  #id: string;
  #name: string;

  /**
   * Construct a new circuit.
   * @param id The string ID of the circuit. This will typically come from the data
   * file from which the circuit was loaded.
   * @param name The name of the circuit. This will typically come from the data file
   * from which the circuit was loaded.
   * @param elements All of the circuit elements which make up this circuit. The order
   * does not matter and does not affect execution of this circuit in any way. The
   * constructor will index elements by their type for efficient access and execution
   * as necessary.
   */
  constructor(id: string, name: string, elements: CircuitElement[]) {
    super("Circuit");

    this.#elements = elements;
    this.#labeledElements = {};

    this.#name = name;
    this.#id = id;

    this.#clocks = [];

    elements.forEach((e) => {
      const label = e.getLabel()?.trim();

      // Inputs and outputs will always have labels; labels on other
      // elements are optional.
      if (label && label != "") {
        if (this.#labeledElements[label]) {
          throw new Error(
            `Multiple elements with the same label: '${e.getLabel()}'.`
          );
        }
        this.#labeledElements[label] = e;
      }

      if (e instanceof Clock && !this.#clocks.includes(e)) {
        this.#clocks.push(e);
      }

      // Recursively get all clock elements. Subcircuits should in theory
      // simply take a clock bus as an input; there should be no reason to
      // have a clock in a subcircuit. Nonetheless, it is *technically*
      // allowed so we must ensure subcircuit clocks are also ticked with this
      // circuit's clock.
      if (e instanceof SubCircuit)
        [
          e.getClocks().forEach((c) => {
            if (!this.#clocks.includes(c)) {
              this.#clocks.push(c);
            }
          }),
        ];

      this.propagateLoggersTo(e);
    });
  }

  /**
   * Get all of the input elements in this circuit.
   * @returns A record of inputs where the key is the string name of the input and
   * the value is the input object itself.
   */
  getInputs(): Record<string, Input> {
    const record: Record<string, Input> = {};
    this.#elements
      .filter((e) => e instanceof Input)
      .forEach((e) => {
        record[e.getLabel()] = e;
      });
    return record;
  }

  /**
   * Get all of the output elements in this circuit.
   * @returns A record of outputs where the key is the name of the output and
   * the value is the output object itself.
   */
  getOutputs(): Record<string, Output> {
    const record: Record<string, Output> = {};
    this.#elements
      .filter((e) => e instanceof Output)
      .forEach((e) => {
        record[e.getLabel()] = e;
      });
    return record;
  }

  getMemory(): Record<string, Memory> {
    const record: Record<string, Memory> = {};
    this.#elements
      .filter((e) => e instanceof Memory)
      .forEach((e) => {
        const label = e.getLabel()?.trim();
        if (label && label != "") {
          record[label] = e;
        }
      });
    return record;
  }

  readMemory(name: string, address: number, length: number = 1): BitString[] {
    return this.getMemory()[name].read(address, length);
  }

  writeMemory(name: string, address: number, words: BitString[]): void {
    return this.getMemory()[name].write(address, words);
  }

  /**
   * Get the name of this circuit.
   * @returns The name of this circuit which was passed into the constructor.
   */
  getName(): string {
    return this.#name;
  }

  /**
   * Get the ID of this circuit.
   * @returns The ID of this circuit, not from the {@link CircuitLoggable} class,
   * but from the constructor.
   */
  getId(): string {
    return this.#id;
  }

  /**
   * Get all of the clocks in this circuit.
   * @returns An array of all the clocks in this circuit, recursively including the clocks
   * from subcircuits as well (though subcircuits really ought to not have clocks in them,
   *  they should take the clock as an input.)
   */
  getClocks(): Clock[] {
    return this.#clocks;
  }

  #log(level: LogLevel, msg: string, data?: any) {
    super.log(
      level,
      `[id: '${this.getId()}', name: '${this.getName()}']: ${msg}`,
      data
    );
  }

  /**
   * Execute this circuit with the provided inputs. This method runs an event-driven simulation
   * which evaluates the circuit in terms of its elements, propagating the outputs of elements to
   * other elements which are connected.
   *
   * If a circuit has no clock, then it is simply evaluated like a combinatorial
   * or sequential circuit. However, if it does have a clock, then the engine will
   * tick the clock automatically, evaluating the circuit each clock cycle.
   *
   * > [!NOTE] This simulation engine inherits some limitations of CircuitVerse when evaluating
   * > circuits with clocks:
   * > - Real life circuits go into a stable state between clock ticks. Irrespective of any
   * > implemented circuit element delays, the circuits go into a stable state between clock
   * > ticks. The simulator thus cannot simulate circuits that do not go into a stable
   * > state between clock ticks.
   * > - Similarly, circuits go into a stable state before processing input signals from
   * > different input elements.
   * >
   * > These limitations are due to the event-driven architecture of the engine, which this
   * > engine originally took inspiration from CircuitVerse. Note, of course, that this
   * > engine **does not share any code** with CircuitVerse, it simply used the same algorithm
   * > and general principles.
   *
   * > [!WARNING] It is possible for this function to run forever. If you are attempting to
   * > run a circuit with clock inputs, but don't provide the optional `haltCond`, the simulation
   * > will simply keep ticking the clock indefinitely, and will thus never return, even if the
   * > circuit has stabilized.
   * >
   * > If your circuit contains a clock (which you can check by checking that {@link getClocks} returns
   * > an array with size `> 0`), you must provide a `haltCond` that will terminate the simulation
   * > either after a bus contains a certain value, or after the desired number of clock cycles have
   * > passed.
   * >
   * > If any {@link CircuitLogger}s are attached to this circuit, a warning will be emitted to
   * > them if this method detects that the simulation will run forever.
   *
   * @param inputs A keyed object of input values or an array of input values. For end users, the
   * keyed object will provide the most intuitive interface; the array syntax exists to support
   * CircuitVerse {@link SubCircuit}s, which don't have labeled inputs, but rather take their inputs
   * by index. See the documentation for {@link CircuitRunType} and {@link CircuitRunResult} for
   * more information on this parameter.
   * @param haltCond A callback function which is executed each clock cycle and accepts a boolean
   * representing whether the clock is currently high or low, the clock cycle number, and the current
   * state of the circuits outputs. This function returns a boolean value indicating whether or not
   * the simulation should be halted: a value of `true` indicates that the simulation should be
   * halted, and a value of `false` indicates that it should continue on to the next clock cycle.
   * @param clockFrequency An optional number which specifies the clock "frequency". The simulation
   * speed is not changed (the simulation always executes as fast as possible), but if this parameter
   * is provided, the simulator will emit a warning if a circuit takes longer than this amount of
   * time to propagate its value. If you see this warning, the output values of the circuit probably
   * cannot be trusted because of the limitations stated above.
   * @returns An object which contains the results of simulating this circuit, including the total
   * propagation delay, the number of simulation steps required, and the output values.
   */
  run<T extends CircuitRunType>(
    inputs: T,
    haltCond?: (
      clockHigh: boolean,
      clockCycles: number,
      output: CircuitRunResult
    ) => boolean,
    clockFrequency: number = 1
  ): CircuitRunResult {
    this.#log(LogLevel.INFO, `Beginning simulation with inputs:`, inputs);

    // There are no clocks; just tick once and return the results.
    if (!this.#clocks.length) {
      this.#log(
        LogLevel.DEBUG,
        "No clock elements in this circuit; simply resolving."
      );
      return this.resolve(inputs);
    }

    if (!haltCond) {
      this.#log(
        LogLevel.WARN,
        "Clock elements present but no halt condition provided; this simulation will run forever."
      );
    }

    let init: boolean = true;
    let result: CircuitRunResult;

    let clockHigh: boolean = false;
    let clockCycles: number = 0;

    this.#clocks.forEach((c) => c.tick());

    do {
      this.#clocks.forEach((c) => c.tick());

      this.#log(
        LogLevel.INFO,
        `[cycle = ${clockCycles}, high = ${clockHigh}] Resolving circuit for this cycle.`
      );

      result = this.resolve(init ? inputs : undefined, clockFrequency);

      this.#log(
        LogLevel.INFO,
        `[cycle = ${clockCycles}, high = ${clockHigh}] Propagation delay: ${result.propagationDelay}`,
        result.outputs
      );

      if (clockFrequency && result.propagationDelay > clockFrequency) {
        this.#log(
          LogLevel.WARN,
          `Circuit propagation delay longer than clock frequency: results cannot be trusted.`
        );
      }

      clockHigh = BitString.high().equals(
        this.#clocks[0].getOutputs()[0].getValue()
      );
      init = false;

      if (!clockHigh) {
        clockCycles++;
      }

      if (result.stop) {
        break;
      }
    } while (!(haltCond && haltCond(clockHigh, clockCycles, result)));

    this.#log(
      LogLevel.INFO,
      `Halt condition satisfied after ${clockCycles} cycles. Clock ended ${clockHigh ? "high" : "low"}.`
    );

    this.#log(
      LogLevel.INFO,
      `Completed simulation with outputs:`,
      result.outputs
    );

    return result;
  }

  /**
   * Resolve this circuit as though it was a {@link CircuitElement} even though it isn't.
   * This method is used to implement {@link SubCircuit}s and is called internally by {@link run},
   * and should not be used in any other scenarios. Use {@link run} instead.
   *
   * This method is responsible for executing a single clock cycle of the circuit. It
   * contains the event loop, taking in the
   * inputs, queuing them up, and then running the event loop until the values have propagated
   * entirely through the circuit and there are no more events in the queue.
   *
   * @param inputs The optional inputs to the circuit. If inputs are provided, each element
   * in the circuit is reset by calling {@link CircuitElement.reset} and the simulation
   * effectively starts over. If no inputs are provided here, then the simulation runs from the
   * previous state it was in when it ended the last time it ran. This functionality is extremely
   * useful for a clocked circuit, where the clock input changes and requires the circuit to be
   * re-evaluated each cycle.
   * @returns
   */
  resolve<T extends CircuitRunType>(
    inputs?: T,
    timeLimit?: number
  ): CircuitRunResult {
    type QueueEntry = {
      time: number;
      element: CircuitElement;
    };

    this.#log(LogLevel.INFO, "Resolving circuit...");
    const eventQueue: QueueEntry[] = [];

    if (inputs) {
      this.#log(LogLevel.INFO, `Circuit received inputs:`, { inputs: inputs });

      this.#log(LogLevel.TRACE, "Resetting all elements...");
      this.#elements.forEach((e) => e.reset());

      this.#log(LogLevel.DEBUG, "Propagating initial values...");
      if (Array.isArray(inputs)) {
        this.#log(
          LogLevel.TRACE,
          "Input was provided as array; setting inputs by index."
        );
        Object.values(this.getInputs()).forEach((input) => {
          let value = inputs[input.getIndex()];

          if (typeof value === "string") {
            value = new BitString(value);
          }

          if (value) {
            input.initialize(value);
          }
        });
      } else {
        this.#log(
          LogLevel.TRACE,
          "Input was provided as an object; setting inputs by key."
        );
        const inputLabels = Object.keys(inputs);
        for (const i in inputLabels) {
          const key = inputLabels[i];
          let value = inputs[key];

          if (typeof value === "string") {
            value = new BitString(value);
          }

          if (this.#labeledElements[key]) {
            this.#labeledElements[key].initialize(value);
            this.#log(LogLevel.TRACE, `Set value on element: ${key}`);
          } else {
            throw new Error(`No elements with the given label: ${key}`);
          }
        }
      }
    } else {
      this.#log(
        LogLevel.TRACE,
        "No inputs provided; preserving previous state."
      );
    }

    this.#log(LogLevel.TRACE, `Adding elements to event queue...`);
    // Simply push all of the elements into the queue. This will cause non-interactive
    // elements such as constant values and power/ground to propagate their outputs.
    // Other than a little more initial compute, this should have no side effects.
    this.#elements.forEach((e) => {
      if (!(e instanceof Output)) {
        eventQueue.push({
          time: 0,
          element: e,
        });
      }
    });

    this.#log(LogLevel.TRACE, `Starting event loop...`);
    let steps = 0;
    let time = 0;

    let entry: QueueEntry | undefined = undefined;
    let stopErr = null;

    while ((entry = eventQueue.shift())) {
      time = entry.time;

      if (!(entry.element instanceof Output)) {
        if (stopErr || (timeLimit && time >= timeLimit)) {
          continue;
        }
      }

      this.#log(
        LogLevel.DEBUG,
        `[Step: ${steps + 1}, Time: ${time}] Resolving element: ${entry.element}`
      );

      const currentOutputs = entry.element
        .getOutputs()
        .map((o) => o.getValue());
      let propDelay;

      try {
        propDelay = entry.element.resolve();
      } catch (e) {
        if (e instanceof SimulationStopError) {
          stopErr = e;
          this.log(
            LogLevel.DEBUG,
            `Simulation stopped by a Stop element. Draining outputs in queue.`
          );
          continue;
        } else {
          throw e;
        }
      }

      this.#log(LogLevel.TRACE, `Propagation delay: ${propDelay}`);
      this.#log(LogLevel.DEBUG, `Outputs:`, {
        current: currentOutputs,
        resolved: entry.element.getOutputs().map((o) => o.getValue()),
      });

      const propTo = entry.element
        .getOutputs()
        .filter(
          (o, i) =>
            entry?.element instanceof Input ||
            (o.getValue() == null && currentOutputs[i] != null) ||
            (o.getValue() != null &&
              !(o.getValue() as BitString).equals(currentOutputs[i]))
        )
        .map(
          (o) => (o.setLastUpdate((entry as QueueEntry).time), o.getElements())
        )
        .flat()
        // Ensure that whatever the current element would propagate to actually has the element as an
        // input; some elements (the Splitter) may misbehave and attempt to propagate things to elements
        // which are attached upstream. This prevents those from being re-resolved which results in resolving
        // the current element again, causing an infinite loop.
        .filter((e) =>
          e
            .getInputs()
            .map((i) => i.getElements())
            .flat()
            .includes((entry as QueueEntry).element)
        );

      for (const el of propTo) {
        const entryInd = eventQueue.map((e) => e.element).indexOf(el);
        if (entryInd != -1) {
          this.#log(LogLevel.TRACE, `Already in event queue: ${el}`);

          if (propDelay) {
            this.#log(
              LogLevel.TRACE,
              `Delaying resolution until t = ${time + propDelay}`
            );
            eventQueue[entryInd].time = time + propDelay;
          }

          continue;
        }

        if (!stopErr) {
          this.#log(LogLevel.TRACE, `Propagating to element: ${el}]`);
          eventQueue.push({
            time: time + propDelay,
            element: el,
          });
        } else {
          this.#log(LogLevel.TRACE, `(Stop) Would propagate to: ${el}]`);
        }
      }

      eventQueue.sort((a, b) => a.time - b.time);
      steps++;
      this.#log(
        LogLevel.TRACE,
        `Event Queue:`,
        eventQueue.map((e) => `[t = ${e.time}] ${e.element}`)
      );

      if (timeLimit && time >= timeLimit) {
        this.#log(
          LogLevel.INFO,
          `Time ${time} exceeded limit of ${timeLimit}.`
        );
        continue; // Will drain outputs.
      }

      if (steps > 1000000) {
        throw new Error(
          "Resolution step limit exceeded; check for loops in circuit."
        );
      }
    }

    this.#log(LogLevel.TRACE, "Resolution completed. Collecting outputs...");
    let output;

    // Return circuit outputs
    // Regardless of whether the user submitted a string or a BitString
    // for the inputs, BitStrings will be returned as they preserve information
    // such as the bus width of the output.
    if (Array.isArray(inputs)) {
      this.#log(LogLevel.TRACE, "Building output as array.");
      output = {
        outputs: Object.values(this.getOutputs()).map((o) => o.getValue()),
        propagationDelay: time,
        steps: steps,
      };
    } else {
      this.#log(LogLevel.TRACE, "Building output as object.");
      const outputs: Record<string, BitString | null> = {};
      const elements = this.getOutputs();
      for (const key of Object.keys(elements)) {
        outputs[key] = elements[key].getValue();
      }

      output = {
        stop: stopErr ? true : false,
        outputs: outputs,
        propagationDelay: time,
        steps: steps,
      };
    }

    this.#log(LogLevel.INFO, `Resolved circuit with outputs:`, output);

    // @ts-ignore
    return output;
  }
}
