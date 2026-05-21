import { Router } from "express";

const router = Router();

const PIO_API_KEY = process.env.PIO_API_KEY;
const PIO_BASE_URL = "https://pio.codes/v1/chat/completions";

const SYSTEM_PROMPT = `Kamu adalah asisten virtual Vanny Konveksi, bisnis konveksi yang memproduksi seragam sekolah, pemerintah, dan perusahaan berkualitas tinggi.

Tugas kamu adalah membantu pelanggan dengan:
- Informasi produk dan katalog (kaos, kemeja, seragam, hoodie, polo, dll)
- Cara pemesanan dan proses produksi
- Estimasi harga dan minimum order
- Status pesanan (arahkan ke halaman "Pesanan" di portal)
- Custom builder untuk desain baju sendiri
- Pertanyaan umum tentang bahan, ukuran, metode cetak

Informasi penting:
- Minimum order biasanya 12 pcs (tergantung produk)
- Proses produksi rata-rata 7-14 hari kerja setelah pembayaran
- Tersedia berbagai metode cetak: sablon, bordir, DTF, DTG
- Pembayaran bisa via transfer bank atau online payment
- Layanan pengiriman ke seluruh Indonesia

Jawab dengan ramah, singkat, dan dalam Bahasa Indonesia. Jika ada yang tidak kamu ketahui pasti, arahkan pelanggan untuk menghubungi admin langsung.`;

router.post("/chatbot", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages diperlukan" });
  }

  try {
    const response = await fetch(PIO_BASE_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PIO_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; VannyKonveksi/1.0)",
      },
      body: JSON.stringify({
        model: "qwen-plus",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
        stream_options: { include_usage: false },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("pio.codes error:", response.status, text);
      return res.status(500).json({ error: "Gagal memproses pesan" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content ?? "";
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        } catch {}
      }
    }

    res.end();
  } catch (err) {
    console.error("Chatbot error:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Gagal memproses pesan" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "Gagal memproses pesan" });
    }
  }
});

export default router;
