import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";

// 从环境变量中获取 API_KEYS 和 CX
const API_KEYS = Deno.env.get("API_KEYS")?.split(",") || [];
const CX = Deno.env.get("CX") || "";

console.log("Loaded API_KEYS:", API_KEYS);
console.log("Loaded CX:", CX);

if (API_KEYS.length === 0 || !CX) {
  console.error("Error: API_KEYS or CX environment variables are not set.");
  Deno.exit(1);
}

let currentKeyIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log("Using API Key:", key);
  return key;
}

const router = new Router();

router.get("/search", async (ctx) => {
  console.log("Received search request");
  const params = ctx.request.url.searchParams;
  const apiKey = getNextApiKey();
  const searchParams = new URLSearchParams();
  searchParams.set("key", apiKey);
  searchParams.set("cx", CX);

  // Copy all other params from the request
  for (const [key, value] of params.entries()) {
    if (key !== "key" && key !== "cx") {
      searchParams.set(key, value);
    }
  }

  const url = `https://www.googleapis.com/customsearch/v1?${searchParams.toString()}`;
  console.log("Request URL:", url);

  try {
    console.log("Sending request to Google API");
    const response = await fetch(url);
    console.log("Received response from Google API, status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
      ctx.response.status = response.status;
      ctx.response.body = { error: `API Error: ${response.status} ${errorText}` };
      return;
    }

    const data = await response.json();
    console.log("Parsed JSON response");

    if (searchParams.get("searchType") === "image") {
      console.log("Processing image search results");
      const imageLinks = data.items?.map((item: any) => item.link) || [];
      ctx.response.body = imageLinks;
    } else {
      console.log("Returning full search results");
      ctx.response.body = data;
    }
  } catch (error) {
    console.error("Error details:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "An error occurred while fetching search results." };
  }
});

const app = new Application();

// 添加CORS中间件
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

// 启动 HTTP 服务器
const port = Number(Deno.env.get("PORT")) || 8000;
console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);

app.addEventListener("listen", ({ port }) => {
  console.log(`Server is running on port ${port}`);
});

await app.listen({ port });
