import Fastify from "fastify";
import formbody from "@fastify/formbody";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { getScenario, setScenario, isScenario, SCENARIOS } from "./scenario.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCENARIOS_DIR = resolve(__dirname, "../scenarios");
const ADMIN_HTML_PATH = resolve(__dirname, "../admin.html");

const PAGES = ["index", "pricing", "blog", "changelog", "careers", "about"] as const;
type Page = (typeof PAGES)[number];

const app = Fastify({ logger: true });
await app.register(formbody);

const serveScenarioPage = async (page: Page) => {
  const path = join(SCENARIOS_DIR, getScenario(), `${page}.html`);
  return readFile(path, "utf8");
};

for (const page of PAGES) {
  const route = page === "index" ? "/" : `/${page}`;
  app.get(route, async (_req, reply) => {
    const html = await serveScenarioPage(page);
    reply.type("text/html; charset=utf-8").send(html);
  });
}

app.get("/admin", async (_req, reply) => {
  const tpl = await readFile(ADMIN_HTML_PATH, "utf8");
  const buttons = SCENARIOS.map((s) => {
    const active = s === getScenario() ? " active" : "";
    return `<form method="POST" action="/admin/scenario/${s}"><button class="scenario${active}" type="submit">Switch to ${s.toUpperCase()}</button></form>`;
  }).join("\n");
  reply
    .type("text/html; charset=utf-8")
    .send(tpl.replace("{{current}}", getScenario()).replace("{{buttons}}", buttons));
});

app.post<{ Params: { id: string } }>("/admin/scenario/:id", async (req, reply) => {
  const { id } = req.params;
  if (!isScenario(id)) {
    return reply.code(400).send({ error: "invalid scenario", allowed: SCENARIOS });
  }
  setScenario(id);
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) {
    return reply.redirect("/admin", 303);
  }
  return reply.send({ ok: true, current: id });
});

app.get("/health", async () => ({ ok: true, scenario: getScenario(), ts: Date.now() }));

const port = Number(process.env.PORT ?? 4000);
app
  .listen({ port, host: "0.0.0.0" })
  .then((addr) => app.log.info(`mock competitor site ready at ${addr} (admin at /admin)`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
