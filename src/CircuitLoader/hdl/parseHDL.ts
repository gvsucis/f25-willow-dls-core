type HDLPort = { name: string; width: number };
type HDLPart = { type: string; args: Record<string, string> };

export type ParsedHDL = {
  name: string;
  inputs: HDLPort[];
  outputs: HDLPort[];
  builtin?: string | null;
  parts?: HDLPart[];
};

export function parseHDL(text: string): ParsedHDL {
  // Remove comments
  const withoutComments = removeComments(text);

  // Extract chip name
  const chipMatch = withoutComments.match(/CHIP\s+(\w+)\s*\{/);
  if (!chipMatch) {
    throw new Error("Could not find CHIP declaration");
  }
  const name = chipMatch[1];

  // Extract inputs
  const inputs = parsePortDeclaration(withoutComments, "IN");

  // Extract outputs
  const outputs = parsePortDeclaration(withoutComments, "OUT");

  // Check for BUILTIN
  const builtinMatch = withoutComments.match(/BUILTIN\s+(\w+)\s*;/);
  const builtin = builtinMatch ? builtinMatch[1] : null;

  // Parse PARTS if not builtin
  let parts: HDLPart[] = [];
  if (!builtin) {
    parts = parseParts(withoutComments);
  }

  return {
    name,
    inputs,
    outputs,
    builtin,
    parts,
  };
}

function removeComments(text: string): string {
  // Remove single-line comments
  let result = text.replace(/\/\/.*$/gm, "");

  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, "");

  return result;
}

function parsePortDeclaration(text: string, portType: "IN" | "OUT"): HDLPort[] {
  const ports: HDLPort[] = [];

  // Match the port declaration section
  const regex = new RegExp(`${portType}\\s+([^;]+);`, "g");
  let match;

  while ((match = regex.exec(text)) !== null) {
    const portDecl = match[1];

    // Split by commas to get individual ports
    const portStrings = portDecl.split(",").map((s) => s.trim());

    for (const portStr of portStrings) {
      if (!portStr) continue;

      // Check if port has width specifier like "sel[2]"
      const widthMatch = portStr.match(/(\w+)\[(\d+)\]/);
      if (widthMatch) {
        ports.push({
          name: widthMatch[1],
          width: parseInt(widthMatch[2], 10),
        });
      } else {
        // Single-bit port
        const nameMatch = portStr.match(/(\w+)/);
        if (nameMatch) {
          ports.push({
            name: nameMatch[1],
            width: 1,
          });
        }
      }
    }
  }

  return ports;
}

function parseParts(text: string): HDLPart[] {
  const parts: HDLPart[] = [];

  // Find PARTS section
  const partsMatch = text.match(/PARTS:\s*([\s\S]*?)(?:\}|$)/);
  if (!partsMatch) {
    return parts;
  }

  const partsSection = partsMatch[1];

  // Match each part instantiation: ChipName(arg1=val1, arg2=val2, ...);
  const partRegex = /(\w+)\s*\(([\s\S]*?)\)\s*;/g;
  let match;

  while ((match = partRegex.exec(partsSection)) !== null) {
    const type = match[1];
    const argsStr = match[2];

    const args: Record<string, string> = {};

    // Parse arguments: pin=value pairs
    const argPairs = argsStr.split(",").map((s) => s.trim());

    for (const pair of argPairs) {
      if (!pair) continue;

      const eqMatch = pair.match(/(\w+(?:\[\d+\])?)\s*=\s*(\w+(?:\[\d+\])?)/);
      if (eqMatch) {
        const pinName = eqMatch[1];
        const pinValue = eqMatch[2];
        args[pinName] = pinValue;
      }
    }

    parts.push({ type, args });
  }

  return parts;
}
