import fs from "fs";
import path from "path";

const BASE_URL = 'http://localhost:9000';
// const BASE_URL = "https://check-calculator-nest.vercel.app";

async function testScan(imagePath) {
  if (!imagePath) {
    console.error("❌ Please provide a path to an image file.");
    console.log("Usage: node test-scan.mjs ./path/to/receipt.jpg");
    return;
  }

  console.log(`🚀 Testing Receipt Scan for: ${imagePath}`);

  // 1. Login to get token (or use an existing one)
  // For simplicity, we'll just register/login a quick test user
  const email = `scan-test-${Date.now()}@example.com`;
  await fetch(`${BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password", name: "Scan Tester" }),
  });

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "password" }),
  });
  const { access_token } = await loginRes.json();
  const authHeader = {
    Authorization: `Bearer ${access_token}`,
    "Content-Type": "application/json",
  };

  // 2. Read image and convert to base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");
  const extension = path.extname(imagePath).replace(".", "");
  const mimeType = `image/${extension === "jpg" ? "jpeg" : extension}`;

  console.log("⌛ Sending to Gemini AI (this may take a few seconds)...");

  // 3. Call Scan Endpoint
  try {
    // To test Telegram notifications, send invalid data to trigger server-side error
    const testData = process.argv.includes('--test-error')
      ? { image: "INVALID_BASE64_DATA", mimeType: mimeType }
      : { image: base64Image, mimeType: mimeType };

    const scanRes = await fetch(`${BASE_URL}/receipts/scan`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify(testData),
    });

    if (!scanRes.ok) {
      const error = await scanRes.json();
      throw new Error(error.message || "Scan failed");
    }

    const result = await scanRes.json();
    console.log("\n✅ AI Extraction Successful:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n--- Summary ---");
    console.log(`Subtotal: ${result.subtotal}`);
    console.log(`Tax:      ${result.tax}`);
    console.log(`Total:    ${result.total}`);
    console.log(`Items:    ${result.items.length}`);
  } catch (error) {
    console.error("❌ Error during scan:", error.message);
  }
}

const args = process.argv.slice(2);
testScan(args[0]).catch(console.error);
