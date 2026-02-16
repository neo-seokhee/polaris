export function sanitizeRichHtml(input: string): string {
    if (!input) return "";

    return input
        .replace(/\sstyle="[^"]*"/gi, "")
        .replace(/\sclass="[^"]*"/gi, "")
        .replace(/\sid="[^"]*"/gi, "")
        .replace(/<span[^>]*>/gi, "")
        .replace(/<\/span>/gi, "")
        .trim();
}
