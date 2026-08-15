export interface Position {
  line: number;
  col: number;
}

export interface SpecValidationError {
  line: number;
  col: number;
  instancePath: string;
  message: string;
}

export interface SpecValidationResult {
  valid: boolean;
  errors: SpecValidationError[];
}

export interface AjvError {
  keyword: string;
  instancePath: string;
  message?: string;
  params?: Record<string, unknown>;
}

export interface ValidateFn {
  (data: unknown): boolean;
  errors?: AjvError[] | null;
}

export interface AjvLike {
  compile(schema: unknown): ValidateFn;
}
