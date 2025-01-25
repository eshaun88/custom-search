import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";

// 从环境变量中获取 API_KEYS 和 CX
const API_KEYS = Deno.env.get("API_KEYS")?.split(",") || [];
const CX = Deno.env.get("CX") || "";

if (API_KEYS.length === 0 || !CX) {
  console.error("Error: API_KEYS or CX environment variables are not set.");
  Deno.exit(1);
}

let currentKeyIndex = 0;

function getNextApiKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

const router = new Router();

router.get("/search", async (ctx) => {
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

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (searchParams.get("searchType") === "image") {
      // 只返回图片链接
      const imageLinks = data.items?.map((item: any) => item.link) || [];
      ctx.response.body = imageLinks;
    } else {
      ctx.response.body = data;
    }
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "An error occurred while fetching search results." };
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 启动 HTTP 服务器
const port = Number(Deno.env.get("PORT")) || 8000;
console.log(`HTTP webserver running. Access it at: http://localhost:${port}/`);
await app.listen({ port });
