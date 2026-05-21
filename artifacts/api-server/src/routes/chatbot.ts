import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.PIO_API_KEY,
  baseURL: "https://pio.codes/v1",
});

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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content ?? "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
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
