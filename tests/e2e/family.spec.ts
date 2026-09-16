import { test, expect } from "@playwright/test";
test("family setup, child practice, exam rewards, analytics, and mobile layout", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const stamp = Date.now(),
    name = `Explorer ${stamp}`;
  await page.goto("/");
  await expect(page.locator(".login-card")).toBeVisible();
  if (
    await page.getByRole("button", { name: "Create your family" }).isVisible()
  ) {
    await page
      .getByLabel("Choose a parent password")
      .fill("local-test-parent-only");
    await page.getByRole("button", { name: "Create your family" }).click();
  } else {
    await page.getByRole("button", { name: "Parent sign in" }).click();
    await page.getByLabel("Parent password").fill("local-test-parent-only");
    await page.getByRole("button", { name: "Let’s go" }).click();
  }
  await expect(page.getByText("Parent mode", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Parent dashboard", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Secret PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Add explorer", exact: true }).click();
  await expect
    .poll(async () => {
      const r = await page.request.get("/api/profiles");
      return (await r.json()).some((k: any) => k.name === name);
    })
    .toBe(true);
  const kid = (await (await page.request.get("/api/profiles")).json()).find(
    (k: any) => k.name === name,
  );
  await page
    .getByRole("combobox", { name: "Explorer", exact: true })
    .selectOption(kid.id);
  await expect(
    page.getByRole("heading", { name: "The whole picture" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/parent-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch explorer" }).click();
  await page.getByRole("button", { name, exact: false }).click();
  await page.getByLabel("Your secret 4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Let’s go" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Hey ${name}`) }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/base-camp-desktop.png",
    fullPage: true,
  });
  expect(
    (
      await page.request.post("/api/round", {
        data: { mode: "quest", length: 50 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/round", {
        data: { mode: "test", table: 13, length: 20 },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/round", {
        data: { mode: "test", table: 16, length: 20 },
      })
    ).status(),
  ).toBe(403);
  await page.getByRole("button", { name: "Start a quest" }).click();
  const equation = await page.locator(".flashcard h2").innerText();
  const [a, b] = equation.split("×").map(Number);
  await page.getByLabel("Your answer", { exact: true }).fill(String(a * b));
  await page.getByLabel("Your answer", { exact: true }).press("Enter");
  await expect(page.getByRole("status")).toContainText("Nailed it");
  await expect(page.locator(".round-top strong")).toHaveText("2 / 20");
  await expect(page.getByLabel("Your answer", { exact: true })).toBeFocused();
  const [wrongA, wrongB] = (await page.locator(".flashcard h2").innerText())
    .split("×")
    .map(Number);
  await page.getByLabel("Your answer", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("status")).toContainText(
    `${wrongA} × ${wrongB} = ${wrongA * wrongB}`,
  );
  await expect(
    page.getByRole("button", { name: "Next question", exact: true }),
  ).toBeFocused();
  await expect(page.locator(".strategy-hint")).toBeVisible();
  await page.screenshot({path:"test-results/strategy-hint.png",fullPage:true});
  await expect(page.locator(".strategy-hint li").last()).toContainText(
    String(wrongA * wrongB),
  );
  // A correction must remain visible longer than the correct-answer pause.
  await page.waitForTimeout(850);
  await expect(page.locator(".round-top strong")).toHaveText("2 / 20");
  await page.keyboard.press("Enter");
  await expect(page.locator(".round-top strong")).toHaveText("3 / 20");
  await expect(page.getByLabel("Your answer", { exact: true })).toBeFocused();
  await page.screenshot({
    path: "test-results/flashcard-desktop.png",
    fullPage: true,
  });
  // Complete a deterministic pass through the real API, including retry idempotency.
  const round = await (
    await page.request.post("/api/round", {
      data: { mode: "test", table: 5, length: 20 },
    })
  ).json();
  const multipliers: number[] = [];

  for (let i = 0; i < 20; i++) {
    const q = await (await page.request.get(`/api/round/${round.id}`)).json();
    multipliers.push(q.b);
    const response = await page.request.post(`/api/round/${round.id}/answer`, {
      data: { questionId: q.id, answer: i < 18 ? q.a * q.b : 0 },
    });
    expect(await response.json()).toMatchObject({
      correct: i < 18 ? 1 : 0,
      product: q.a * q.b,
      points: 0,
    });
    if (i === 0)
      await page.request.post(`/api/round/${round.id}/answer`, {
        data: { questionId: q.id, answer: 0 },
      });
  }
  const done = await (await page.request.get(`/api/round/${round.id}`)).json();
  expect(done.exam.passed).toBe(true);
  expect(done.points).toBe(0);
  expect(done.review).toHaveLength(2);
  expect(new Set(multipliers).size).toBe(12);
  await page.reload();
  await page.getByRole("button", { name: "My collection" }).click();
  await expect(page.locator(".animal-card.unlocked")).toHaveCount(1);
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(page.locator(".chart svg").last()).toBeVisible();
  const unauthorized = await page.request.post("/api/profiles", {
    data: { name: "Intruder", pin: "1111", goal: 2000 },
  });
  expect(unauthorized.status()).toBe(403);
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  expect(
    (
      await guestPage.request.get("http://127.0.0.1:8788/api/dashboard")
    ).status(),
  ).toBe(401);
  await guest.close();
  await page.getByRole("button", { name: "Boss battles", exact: true }).click();
  await page
    .locator(".animal-card")
    .first()
    .getByRole("button", { name: "Challenge" })
    .click();
  await page.getByRole("button", { name: "Let’s practice" }).click();
  for (let i = 0; i < 20; i++) {
    await expect(page.locator(".round-top strong")).toHaveText(`${i + 1} / 20`);
    const [x, y] = (await page.locator(".flashcard h2").innerText())
      .split("×")
      .map(Number);
    const answerInput = page.getByLabel("Your answer", { exact: true });
    await answerInput.fill(i === 0 ? "0" : String(x * y));
    await answerInput.press("Enter");
    if (i === 0) {
      await expect(page.getByRole("status")).toContainText(
        `${x} × ${y} = ${x * y}`,
      );
      await expect(
        page.getByRole("button", { name: "Next question", exact: true }),
      ).toBeFocused();
      await expect(page.locator(".strategy-hint")).toBeVisible();
      await page.keyboard.press("Enter");
    }
  }
  await expect(
    page.getByRole("heading", { name: "Boss battle conquered!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to base camp" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Hey ${name}`) }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/base-camp-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const before = (await (await page.request.get("/api/dashboard")).json()).find(
    (k: any) => k.id === kid.id,
  ).points;
  const practice = await (
    await page.request.post("/api/round", {
      data: { mode: "practice", table: 9, length: 20 },
    })
  ).json();
  const practiceQuestion = await (
    await page.request.get(`/api/round/${practice.id}`)
  ).json();
  expect(practiceQuestion.bonus).toBe(0);
  const wrong = await (
    await page.request.post(`/api/round/${practice.id}/answer`, {
      data: { questionId: practiceQuestion.id, answer: 0 },
    })
  ).json();
  expect(wrong.points).toBe(0);
  expect(wrong.hint.title).toBe("Ten groups, take away one");
  const retry = await (
    await page.request.post(`/api/round/${practice.id}/answer`, {
      data: {
        questionId: practiceQuestion.id,
        answer: practiceQuestion.a * practiceQuestion.b,
      },
    })
  ).json();
  expect(retry.correct).toBe(0);
  expect(retry.hint).toEqual(wrong.hint);
  async function beat(table: number) {
    const res = await page.request.post("/api/round", {
      data: { mode: "test", table, length: 20 },
    });
    expect(res.status()).toBe(200);
    const battle = await res.json();
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const q = await (
        await page.request.get(`/api/round/${battle.id}`)
      ).json();
      seen.add(q.a);
      const result = await (
        await page.request.post(`/api/round/${battle.id}/answer`, {
          data: { questionId: q.id, answer: q.a * q.b },
        })
      ).json();
      expect(result.points).toBe(0);
    }
    const result = await (
      await page.request.get(`/api/round/${battle.id}`)
    ).json();
    expect(result.exam.passed).toBe(true);
    return seen;
  }
  for (const table of [2, 3, 4, 6, 7, 8, 9, 10, 11, 12]) await beat(table);
  expect(
    (
      await page.request.post("/api/round", {
        data: { mode: "test", table: 16, length: 20 },
      })
    ).status(),
  ).toBe(403);
  for (const region of [13, 14, 15]) expect((await beat(region)).size).toBe(4);
  expect((await beat(16)).size).toBe(12);
  const after = (await (await page.request.get("/api/dashboard")).json()).find(
    (k: any) => k.id === kid.id,
  );
  expect(after.points).toBe(before);
  expect(
    after.certifications.some((c: any) => c.table === 16 && c.passed),
  ).toBe(true);
  await page.reload();
  await expect(page.locator(".goal-note")).toContainText("👑 Adventure complete!");
  await page.getByRole("button", { name: "Switch explorer" }).click();
  await page.getByRole("button", { name: "Parent sign in" }).click();
  await page.getByLabel("Parent password").fill("local-test-parent-only");
  await page.getByRole("button", { name: "Let’s go" }).click();
  await page
    .getByRole("button", { name: "Parent dashboard", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Explorer", exact: true })
    .selectOption(kid.id);
  for (const metric of ["count", "median", "accuracy"]) {
    await page.getByLabel("Heatmap metric").selectOption(metric);
    await expect(page.locator(".chart svg").last()).toBeVisible();
  }
  await page.screenshot({
    path: "test-results/parent-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
