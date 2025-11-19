import { beforeAll, test, expect } from "@jest/globals";
import { Circuit, loadCircuit } from "../../../src";
import { Nand2TetrisLoader } from "../../../src/CircuitLoader/Nand2TetrisLoader";

let circuit: Circuit;

beforeAll(async () => {
  circuit = await loadCircuit(
    Nand2TetrisLoader,
    "tests/n2t/nand_up_chips/Mux4Way16.hdl",
    "Mux4Way16",
  );
});

const truthTable = [
  ["0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "00", "0000000000000000"],
  ["0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "01", "0000000000000000"],
  ["0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "10", "0000000000000000"],
  ["0000000000000000", "0000000000000000", "0000000000000000", "0000000000000000", "11", "0000000000000000"],
  ["0001001000110100", "1001100001110110", "1010101010101010", "1111111111111111", "00", "0001001000110100"],
  ["0001001000110100", "1001100001110110", "1010101010101010", "1111111111111111", "01", "1001100001110110"],
  ["0001001000110100", "1001100001110110", "1010101010101010", "1111111111111111", "10", "1010101010101010"],
  ["0001001000110100", "1001100001110110", "1010101010101010", "1111111111111111", "11", "1111111111111111"],
];

function genTest(inputs: { a: string; b: string; c: string; d: string; sel: string }, output: string) {
  return () => {
    const actualOutputs = circuit.run(inputs).outputs;
    expect(actualOutputs.out.toString()).toStrictEqual(output);
  };
}

for (const row of truthTable) {
  const inputs = {
    a: row[0],
    b: row[1],
    c: row[2],
    d: row[3],
    sel: row[4],
  };
  const output = row[5];

  test(
    `N2T Mux4Way16 [sel = ${inputs.sel}] => [out = ${output}]`,
    genTest(inputs, output),
  );
}
