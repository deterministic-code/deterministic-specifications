/** `datasource.id_type` → spec field shape a type-less `references: X.id` inherits. */
const REFERENCE_SHAPE: Record<
  string,
  { type: string; size: number | undefined }
> = {
  integer: { type: "number", size: undefined },
  biginteger: { type: "biginteger", size: undefined },
  uuid: { type: "uuid", size: undefined },
  string: { type: "string", size: 64 },
};

export const referenceFieldShape = (
  idType: string,
): { type: string; size: number | undefined } =>
  REFERENCE_SHAPE[idType] ?? REFERENCE_SHAPE.integer!;
