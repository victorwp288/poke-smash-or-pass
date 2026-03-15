import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/smash"] as const;

const TYPE_LIST = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy"
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((types) => {
    try {
      localStorage.setItem(
        "smashdex_filters",
        JSON.stringify({ gens: [1], types })
      );
    } catch {
      // ignore
    }
  }, TYPE_LIST);
});

for (const route of ROUTES) {
  test(`loads ${route} without page errors`, async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("SmashDex")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("help dialog works", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.keyboard.press("Shift+/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
});

test("registers a service worker (PWA)", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await page.waitForFunction(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.length > 0;
  });
});
