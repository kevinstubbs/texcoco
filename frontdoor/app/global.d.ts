declare module 'prismjs/components/prism-core' {
    export function highlight(value: string, language: unknown);
    export var languages: { json: unknown, rust: unknown, javascript: unknown };
}
