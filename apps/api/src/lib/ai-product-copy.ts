/** Optional OpenAI helpers for product descriptions and translations. */

export function isAiCopyConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function chat(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty OpenAI response");
  return text;
}

export async function generateProductDescription(input: {
  title: string;
  hints?: string;
  locale?: string;
}): Promise<string> {
  const locale = input.locale ?? "en";
  return chat(
    `You write concise ecommerce product descriptions for an online store. Locale: ${locale}. Use plain HTML with <p> and <ul> only. No markdown. 80–160 words.`,
    `Product title: ${input.title}\nNotes: ${input.hints ?? "none"}`
  );
}

export async function translateProductFields(input: {
  title: string;
  description: string;
  targetLocale: string;
}): Promise<{ title: string; description: string }> {
  const raw = await chat(
    `Translate ecommerce product copy. Reply with JSON only: {"title":"...","description":"..."}. Keep HTML tags in description. Target locale: ${input.targetLocale}.`,
    `Title: ${input.title}\nDescription: ${input.description}`
  );
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse translation JSON");
  const parsed = JSON.parse(jsonMatch[0]) as { title?: string; description?: string };
  if (!parsed.title || !parsed.description) throw new Error("Incomplete translation");
  return { title: parsed.title, description: parsed.description };
}
