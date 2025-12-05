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

import Stream from "stream";
import unzip from "unzip-stream";
import MemoryStream from "memorystream";
import { XMLParser } from "fast-xml-parser";

export class FileUtil {
  // Don't allow extending or instantiating.
  private constructor() {}

  static async readTextStream(stream: Stream): Promise<string> {
    const chunks: Buffer<any>[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", (err) => reject(err));
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }

  static async readJsonStream(stream: Stream): Promise<any> {
    return this.readTextStream(stream).then((str) => JSON.parse(str));
  }

  static async streamFromZip(
    stream: Stream,
    paths: Record<string, Stream>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const streamEndPromises: Promise<void>[] = [];

      stream
        .pipe(unzip.Parse())
        .on("entry", (entry) => {
          if (paths[entry.path] !== undefined) {
            const targetStream = paths[entry.path];

            // Create a promise that resolves when the target stream finishes receiving data
            const streamEndPromise = new Promise<void>((resolveStream) => {
              entry.on("end", () => {
                // End the target stream so readers know there's no more data
                if (typeof (targetStream as any).end === 'function') {
                  (targetStream as any).end();
                }
                resolveStream();
              });
            });

            streamEndPromises.push(streamEndPromise);
            entry.pipe(targetStream, { end: false }); // Don't auto-end, we'll do it manually
          } else {
            entry.autodrain();
          }
        })
        .on("finish", async () => {
          // Wait for all piped streams to finish receiving data
          await Promise.all(streamEndPromises);
          resolve();
        })
        .on("error", (err) => reject(err));
    });
  }

  static async extractFromZip(
    stream: Stream,
    paths: string[],
  ): Promise<Stream[]> {
    let map: Record<string, Stream> = {};
    for (const path of paths) {
      map[path] = new MemoryStream();
    }
    return this.streamFromZip(stream, map).then(() => Object.values(map));
  }

  static async readXmlStream(file: Stream) {
    const alwaysArray = [
      "project.circuit",
      "project.circuit.wire",
      "project.circuit.comp",
      "project.circuit.comp.a",
    ];
    const options = {
      ignoreAttributes: false,
      attributeNamePrefix: "",
      isArray: (name: any, jpath: string, isLeafNode: any, isAttribute: any) =>
        alwaysArray.indexOf(jpath) !== -1,
    };

    const parser = new XMLParser(options);
    const xmlData = await FileUtil.readTextStream(file);
    const data = parser.parse(xmlData);
    return data;
  }
}
