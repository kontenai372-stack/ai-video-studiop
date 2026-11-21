
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

const API_URL =
  "https://ark.ap-southeast.bytepluses.com/api/v3";

const MODELS = {
  standard: "dreamina-seedance-2-5-260628",
  flash: "dreamina-seedance-2-5-flash-261115"
};

// Pemeriksaan server
app.get("/", (req, res) => {
  res.json({
    app: "AI Video Rustan Seedance 2.5",
    status: "Server aktif",
    models: ["Seedance 2.5", "Seedance 2.5 Flash"]
  });
});

// Membuat video dari teks atau gambar
app.post("/api/video", async (req, res) => {
  try {
    const {
      prompt,
      imageUrl,
      model = "standard",
      duration = 5,
      resolution = "1080p",
      ratio = "adaptive",
      generateAudio = true
    } = req.body;

    if (!process.env.ARK_API_KEY) {
      return res.status(500).json({
        error: "API Key server belum diatur"
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: "Prompt tidak boleh kosong"
      });
    }

    if (!MODELS[model]) {
      return res.status(400).json({
        error: "Pilihan model tidak valid"
      });
    }

    const seconds = Number(duration);

    if (!Number.isInteger(seconds) || seconds < 4 || seconds > 30) {
      return res.status(400).json({
        error: "Durasi harus 4 sampai 30 detik"
      });
    }

    const allowedResolutions =
      model === "flash"
        ? ["480p", "720p"]
        : ["480p", "720p", "1080p", "4k"];

    if (!allowedResolutions.includes(resolution)) {
      return res.status(400).json({
        error: "Resolusi tidak didukung model ini"
      });
    }

    const content = [
      {
        type: "text",
        text: prompt.trim()
      }
    ];

    // Image to Video: gambar pertama
    if (imageUrl) {
      const validUrl = new URL(imageUrl);

      if (validUrl.protocol !== "https:") {
        return res.status(400).json({
          error: "URL gambar harus HTTPS"
        });
      }

      content.push({
        type: "image_url",
        image_url: {
          url: imageUrl
        },
        role: "first_frame"
      });
    }

    const response = await fetch(
      API_URL + "/contents/generations/tasks",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization":
            "Bearer " + process.env.ARK_API_KEY
        },
        body: JSON.stringify({
          model: MODELS[model],
          content,
          duration: seconds,
          resolution,
          ratio,
          generate_audio: Boolean(generateAudio),
          watermark: true
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gagal membuat tugas video",
        details: data
      });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({
      error: "Kesalahan server",
      message: error.message
    });
  }
});

// Memeriksa status video
app.get("/api/tasks/:id", async (req, res) => {
  try {
    if (!process.env.ARK_API_KEY) {
      return res.status(500).json({
        error: "API Key belum diatur"
      });
    }

    const response = await fetch(
      API_URL + "/contents/generations/tasks/" +
      encodeURIComponent(req.params.id),
      {
        headers: {
          "Authorization":
            "Bearer " + process.env.ARK_API_KEY
        }
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(
    "AI Video Rustan aktif di port " + PORT
  );
});
