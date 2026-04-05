require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== CORS =====
const allowedOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/192\.168\.1\.\d+:\d+$/,
  /^https?:\/\/(\w+\.)*locket-dio\.space$/,
  /^https?:\/\/(\w+\.)*locket-dio\.com$/,
  /^https?:\/\/([\w-]+\.)*web\.app$/,
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some((pattern) => pattern.test(origin));
    if (isAllowed) return callback(null, true);

    console.warn("❌ CORS blocked:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST"],
};

app.use(cors(corsOptions));
app.use(express.json());

// ===== DOWNLOAD API =====
app.post("/download", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing url" });
    }

    // Tạo thư mục temp
    const tempDir = path.join(__dirname, "temp");
    await fs.ensureDir(tempDir);

    // Tạo tên file random
    const fileId = randomUUID();
    const fileExt = path.extname(url).split("?")[0] || ".jpg";
    const filePath = path.join(tempDir, `${fileId}${fileExt}`);

    // Tải file
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    // Lưu file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    writer.on("finish", () => {
      // Gửi file về client
      res.download(filePath, `download${fileExt}`, async (err) => {
        // Xóa file sau khi gửi xong
        try {
          await fs.remove(filePath);
          console.log("🧹 File cleaned:", filePath);
        } catch (e) {
          console.error("❌ Clean error:", e);
        }

        if (err) {
          console.error("❌ Download error:", err);
        }
      });
    });

    writer.on("error", (err) => {
      console.error("❌ Write error:", err);
      res.status(500).json({ error: "Download failed" });
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Server error" });
  }
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});