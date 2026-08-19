export interface DefaultToken {
    token: string;
    regex: string;
    description?: string;
}
export interface FieldType {
    name: string;
    supports_size?: boolean;
    implicit_default?: string | number | boolean | null;
    min_value?: string | null;
    max_value?: string | null;
    defaults: DefaultToken[];
}
export declare function parseFieldTypeCatalog(text: string): Map<string, FieldType>;
export declare function loadFieldTypeCatalog(version: string): Promise<Map<string, FieldType>>;
