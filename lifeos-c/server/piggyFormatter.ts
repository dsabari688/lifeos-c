export function formatPiggyResponse(text: string): string {
    return text
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/`/g, "")
        .replace(/^[-•]\s*/gm, "")
        .replace(/^\+\s*/gm, "")
        .replace(/^>\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}