# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Willow DLS** is a headless digital logic simulator framework written in TypeScript. It loads and executes circuits from educational logic simulators (CircuitVerse, JLS, LogiSim) and is designed for headless testing via Jest. The framework is platform-agnostic, extensible, and intentionally simple to allow users to understand and modify the simulation engine.

**Key Characteristics:**
- Targets NodeJS environment (not browser-compatible due to NodeJS standard library dependencies)
- Event-driven simulation architecture inspired by CircuitVerse's algorithm
- Published as a CommonJS module (`@willow-dls/core`)
- MIT licensed, originally a GVSU capstone project

## Development Commands

### Building
```bash
npm run build        # Compile TypeScript to dist/ using tsc
```

### Testing
```bash
npm test            # Run all tests with coverage using Jest
```

To run a single test file:
```bash
npx jest tests/path/to/test.test.ts
```

### Code Formatting
```bash
npm run format      # Format code with Prettier
```

### Documentation
```bash
npm run docs        # Generate TypeDoc API documentation
```

## Architecture

### Core Components

The architecture follows an event-driven simulation model:

**Circuit Execution Flow:**
1. `Circuit.run()` accepts inputs (keyed object or array)
2. For circuits with clocks: repeatedly ticks clock and calls `resolve()` until halt condition
3. For circuits without clocks: single call to `resolve()`
4. `Circuit.resolve()` implements the event loop:
   - Resets all elements if inputs provided
   - Initializes labeled elements with input values
   - Queues all elements (except outputs) into event queue
   - Processes queue: resolves each element, detects output changes, propagates to downstream elements
   - Returns outputs in same format as inputs (keyed object or array)

**Key Classes:**

- **`Circuit`** (`src/Circuit.ts`): Main execution engine. Contains event loop in `resolve()` method. Manages elements, clocks, and labeled elements. Returns `CircuitRunResult` with outputs, propagation delay, and steps.

- **`CircuitElement`** (`src/CircuitElement.ts`): Abstract base class for all circuit components. Elements have input/output `CircuitBus`es and implement `resolve()` to compute outputs from inputs. Elements are connected via buses and notified when inputs change.

- **`CircuitBus`** (`src/CircuitBus.ts`): Represents wires between elements, carrying `BitString` values. Tracks which elements are connected and manages value propagation.

- **`BitString`** (`src/BitString.ts`): Represents bit values with arbitrary width. Core data type for all signal values.

- **`CircuitProject`** (`src/CircuitProject.ts`): Container for multiple circuits loaded from a simulator file.

- **`CircuitLoader`** (`src/CircuitLoader.ts`): Abstract base class for loaders. Subclasses in `src/CircuitLoader/`:
  - `CircuitVerseLoader`: Loads `.cv` files
  - `JLSLoader`: Loads JLS projects
  - `LogisimLoader`: Loads LogiSim circuits

- **`CircuitLogger`** / **`CircuitLoggable`** (`src/CircuitLogger.ts`): Extensible logging system with granular levels (TRACE, DEBUG, INFO, WARN, ERROR, FATAL) and subsystem filtering. Creates logging tree structure where loggers propagate to child components.

### Element Structure

Circuit elements are in `src/CircuitElement/` (44+ files). Key categories:

- **Gates:** `AndGate`, `OrGate`, `NandGate`, `NorGate`, `XorGate`, `XnorGate`, `NotGate`, `BufferGate`
- **Sequential:** `DFlipFlop`, `TFlipFlop`, `JKFlipFlop`, `SRFlipFlop`, `DLatch`, `Counter`, `JLSRegister`
- **Combinatorial:** `Adder`, `Multiplexer`, `Demultiplexer`, `Decoder`, `PriorityEncoder`, `Splitter`, `BitSelector`
- **Memory:** `CircuitVerseRAM`, `Memory` interface
- **Special:** `Input`, `Output`, `Clock`, `SubCircuit`, `Constant`, `Power`, `Ground`, `Stop`

Each element extends `CircuitElement` and implements `resolve()`.

### Event Loop Details

The simulation uses an event queue where each entry contains a time and element. Elements are resolved in time order, and when outputs change, downstream elements are added to the queue with appropriate delays. The loop terminates when the queue is empty (stable state reached).

**Important Constraints (inherited from CircuitVerse):**
- Circuits must reach stable state between clock ticks
- Circuits must reach stable state before processing new inputs
- Infinite loops detected via 1,000,000 step limit

### Labeled Elements

Elements with labels can be:
- Initialized via `Circuit.run()` inputs (not just Input elements)
- Accessed via `Circuit.getInputs()`, `Circuit.getOutputs()`, `Circuit.getMemory()`
- All labeled elements must have unique labels (enforced in `Circuit` constructor)

### Memory Access

Circuits with labeled memory elements support:
```typescript
circuit.readMemory(name: string, address: number, length?: number): BitString[]
circuit.writeMemory(name: string, address: number, words: BitString[]): void
```

## Testing Structure

Tests are in `tests/` directory, mirroring `src/` structure:
- Unit tests: `tests/*.test.ts` for core classes
- Element tests: `tests/CircuitElement/*.test.ts`
- Integration tests with circuit files:
  - `tests/cv/` - CircuitVerse `.cv` files
  - `tests/jls/` - JLS circuit files
  - `tests/Logisim/` - LogiSim files

Test configuration: Jest with Babel transpilation (see `babel.config.cjs`)

## Type System

- Uses strict TypeScript (`strict: true`)
- Compiles to CommonJS (`module: "CommonJS"`)
- Output directory: `dist/`
- Generic type `CircuitRunType` allows inputs as `Record<string, BitString | string>` or `(BitString | string | null)[]`
- `CircuitRunResult<T>` preserves input format for outputs

## Public API

Main exports in `src/index.ts`:
- Loading: `loadProject()`, `loadCircuit()`, loaders
- Core: `Circuit`, `CircuitProject`, `BitString`, `CircuitBus`, `CircuitElement`
- All element classes
- Logging: `CircuitLogger`, `ConsoleLogger`, `FileLogger`, `LogLevel`

## Known Issues and Solutions

### JLS Splitter Format Compatibility (Sprint 3)

**Problem:** JLS files use two different formats for encoding splitter/binder wiring:

1. **Old format** (output-to-bit mapping): Pairs like `"0:0", "1:1", "2:2"` where:
   - First number = output port index
   - Second number = bit index in the input wire
   - Multiple pairs can have the same output index
   - Wire width must be calculated by counting pairs per output

2. **New format** (bit ranges): Pairs like `"0:3", "4:7"` where:
   - Numbers represent bit ranges `[start:end]` inclusive
   - Each pair corresponds to one output port
   - Wire width = `end - start + 1`

**Solution implemented in `JLSLoader.ts`:**

1. **Format detection** (`genSplit()` and `getSplitterOutputWidth()`):
   - Check for duplicate first numbers (indicates old format)
   - Verify all pairs have valid ranges with reasonable widths (0-15 bits)
   - If no duplicates and valid ranges, assume new format

2. **Wire width resolution**:
   - For old format: Count pairs grouped by output index
   - For new format: Look up the splitter element by ID and extract width from the appropriate pair

3. **Width propagation pass** (final pass in `load()` method):
   - Propagate maximum width through all connected wire groups
   - Fixes inconsistencies where wires connected across subcircuits had mismatched widths
   - Uses recursive traversal to find all connected buses and applies the maximum width

**Testing:** See `tests/jls/RippleCarryAdder_16bit.test.ts` for a circuit using the new splitter format.

**References:**
- Commit: `eff07bd` - Sprint 3 - new splitter format support
- Files modified: `src/CircuitLoader/JLSLoader.ts`

## Contribution Workflow

Before submitting PRs:
1. Write tests for new code
2. Ensure all tests pass: `npm test`
3. Format code: `npm run format`
