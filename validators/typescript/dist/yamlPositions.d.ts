import { LineCounter } from "yaml";
import type { Document } from "yaml";
import type { Position } from "./types.ts";
export declare function asRecord(value: unknown): Record<string, unknown> | null;
export declare function parseYamlWithPositions(yamlText: string): {
    doc: Document;
    lineCounter: LineCounter;
};
export declare function parseJsonPointer(pointer: string): string[];
export declare function positionFor(doc: Document, lineCounter: LineCounter, instancePath: string): Position;
