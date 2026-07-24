export const insightText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(insightText).filter(Boolean).join(" ");
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredText = ["description", "message", "text", "summary", "title"]
      .map((key) => insightText(record[key]))
      .find(Boolean);
    const type = insightText(record.type);

    if (type && preferredText) return `${type}: ${preferredText}`;
    if (preferredText) return preferredText;

    return Object.entries(record)
      .map(([key, nestedValue]) => `${key}: ${insightText(nestedValue)}`)
      .filter((entry) => !entry.endsWith(": "))
      .join(", ");
  }

  return "";
};

export const insightTextList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    const text = insightText(value).trim();
    return text ? [text] : [];
  }

  return value.map(insightText).map((item) => item.trim()).filter(Boolean);
};
