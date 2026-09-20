import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  dataUrl: z.string().min(32),
});

export type OcrItem = {
  title: string;
  kind: "study" | "work";
  weekday: number;
  start_time: string;
  end_time: string;
  location: string | null;
};

const PROMPT = `Bạn là trợ lý bóc tách thời khoá biểu tiếng Việt từ ảnh.
Trả về DUY NHẤT một JSON hợp lệ dạng:
{"items":[{"title":"Giải Tích 2","kind":"study","weekday":1,"start_time":"07:30","end_time":"09:10","location":"D3-201"}]}
Quy tắc:
- weekday: 1=Thứ 2 ... 7=Chủ Nhật.
- kind: "study" cho ca học, "work" cho ca làm thêm.
- start_time/end_time định dạng HH:MM 24 giờ. Nếu ảnh ghi tiết học, hãy quy đổi sang giờ thực tế.
- location là phòng học hoặc địa chỉ nếu có, nếu không có thì null.
- Không thêm chú thích, không markdown, chỉ JSON.`;

export const extractScheduleFromImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<{ items: OcrItem[] }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI chưa sẵn sàng");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: data.dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("ocr_failed", res.status, body.slice(0, 400));
      throw new Error("Không đọc được ảnh thời khoá biểu");
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { items: [] };

    let parsed: { items?: unknown };
    try {
      parsed = JSON.parse(match[0]) as { items?: unknown };
    } catch {
      return { items: [] };
    }

    const itemSchema = z.object({
      title: z.string().min(1),
      kind: z.enum(["study", "work"]).catch("study"),
      weekday: z.coerce.number().int().min(1).max(7),
      start_time: z.string().regex(/^\d{1,2}:\d{2}$/),
      end_time: z.string().regex(/^\d{1,2}:\d{2}$/),
      location: z.string().nullish().transform((v) => v ?? null),
    });

    const items = z.array(itemSchema).safeParse(parsed.items);
    return { items: items.success ? items.data : [] };
  });
