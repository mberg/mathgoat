import { test, expect } from "@playwright/test";
test("family setup, child practice, exam rewards, analytics, and mobile layout", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const stamp = Date.now(),
    name = `Child ${stamp}`;
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
  for (const label of [
    "Adventure",
    "Practice",
    "Boss battles",
    "My collection",
  ]) {
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toHaveCount(0);
  }
  await expect(
    page.getByRole("heading", { name: "Little steps, made visible." }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Parent dashboard", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Secret PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Add child", exact: true }).click();
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
    .getByRole("combobox", { name: "Child", exact: true })
    .selectOption(kid.id);
  await expect(
    page.getByRole("heading", { name: "The whole picture" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/parent-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name, exact: false }).click();
  await page.getByLabel("Your secret 4-digit PIN").fill("1234");
  await page.getByRole("button", { name: "Let’s go" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Hey ${name}`) }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/PopPop Math/);
  await expect(page.locator(".board-stop")).toHaveCount(16);
  await expect(page.locator('.board-stop[data-battle="1"]')).toHaveAttribute(
    "aria-label",
    /Available/,
  );
  await expect(page.locator('.board-stop[data-battle="2"]')).toHaveAttribute(
    "aria-label",
    /Locked/,
  );
  await page.locator('.board-stop[data-battle="3"]').click();
  await expect(
    page.getByRole("button", { name: "Locked", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".board-detail-copy")).toContainText(
    "Croc Trouble",
  );
  await page.locator('.board-stop[data-battle="1"] .stop-go').click();
  await expect(
    page.getByRole("heading", { name: "PopPop Gets Clean", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start battle", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
  for (const table of [2, 3, 12])
    expect(
      (
        await page.request.post("/api/round", {
          data: { mode: "test", table, length: 20 },
        })
      ).status(),
    ).toBe(403);
  for (let table = 1; table <= 12; table++)
    expect(
      (
        await page.request.post("/api/round", {
          data: { mode: "practice", table, length: 20 },
        })
      ).status(),
    ).toBe(200);
  await page
    .getByRole("button", { name: "My collection", exact: true })
    .click();
  await expect(page.locator(".reward-card.unearned")).toHaveCount(16);
  await expect(page.locator(".reward-art > img")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "View card: PopPop Gets Clean" }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/collection-locked.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Practice 12s", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The 12 times table" }),
  ).toBeVisible();
  await expect(page.locator(".battle-preview > img")).toHaveCount(0);
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
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
  await page.screenshot({
    path: "test-results/strategy-hint.png",
    fullPage: true,
  });
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
      data: { mode: "test", table: 1, length: 20 },
    })
  ).json();
  const multipliers: number[] = [];

  for (let i = 0; i < 20; i++) {
    const q = await (await page.request.get(`/api/round/${round.id}`)).json();
    multipliers.push(q.b);
    if (i === 18) {
      await page.waitForTimeout(6100);
      const pending = await (
        await page.request.get(`/api/round/${round.id}`)
      ).json();
      expect(pending.id).toBe(q.id);
      expect(pending.remaining_ms).toBe(0);
    }
    const response = await page.request.post(`/api/round/${round.id}/answer`, {
      data: { questionId: q.id, answer: i <= 18 ? q.a * q.b : 0 },
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
  await expect(page.locator(".reward-card.earned")).toHaveCount(1);
  await expect(page.locator(".reward-card.unearned")).toHaveCount(15);
  await page
    .getByRole("button", { name: "View card: PopPop Gets Clean" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "PopPop Gets Clean" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("img", { name: "PopPop Gets Clean" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/card-revealed.png",
    fullPage: true,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(
    page.getByRole("article", { name, exact: true }).getByRole("progressbar"),
  ).toHaveAttribute("aria-valuenow", "1");
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
  await expect(page.locator('.board-stop[data-battle="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Start battle", exact: true }).click();
  await expect(page.locator(".battle-preview .card-back")).toBeVisible();
  await page.getByRole("button", { name: "Start battle", exact: true }).click();
  for (let i = 0; i < 20; i++) {
    await expect(page.locator(".round-top strong")).toHaveText(`${i + 1} / 20`);
    const [x, y] = (await page.locator(".flashcard h2").innerText())
      .split("×")
      .map(Number);
    const answerInput = page.getByLabel("Your answer", { exact: true });
    await expect(page.getByRole("timer")).toBeVisible();
    if (i !== 0) {
      await answerInput.fill(String(x * y));
      await answerInput.press("Enter");
    }
    if (i === 0) {
      await expect(page.getByRole("status")).toContainText("Time’s up.", {
        timeout: 9000,
      });
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
  await page.getByRole("button", { name: "Back to the board" }).click();
  await expect(
    page.getByRole("heading", { name: new RegExp(`Hey ${name}`) }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.board-stop[data-battle="16"]').click();
  await expect(page.locator(".board-detail-copy")).toContainText("King Monkey");
  await expect(
    page.getByRole("button", { name: "Locked", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "test-results/board-mobile-final-locked.png",
    fullPage: true,
  });
  await page.locator('.board-stop[data-battle="5"]').click();
  await expect
    .poll(() =>
      page.locator(".board-scroll").evaluate((el) => {
        const stop = el
            .querySelector('[data-battle="5"]')!
            .getBoundingClientRect(),
          frame = el.getBoundingClientRect();
        return Math.abs(
          stop.left + stop.width / 2 - frame.left - frame.width / 2,
        );
      }),
    )
    .toBeLessThan(3);
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
  for (const table of [3, 4, 13, 5, 6, 7, 8, 14, 9, 10, 11, 12, 15]) {
    expect(
      (
        await page.request.post("/api/round", {
          data: { mode: "test", table: 16, length: 20 },
        })
      ).status(),
    ).toBe(403);
    expect((await beat(table)).size).toBe(table > 12 ? 4 : 1);
  }
  expect((await beat(16)).size).toBe(12);
  const after = (await (await page.request.get("/api/dashboard")).json()).find(
    (k: any) => k.id === kid.id,
  );
  expect(after.points).toBe(before);
  expect(
    after.certifications.some((c: any) => c.table === 16 && c.passed),
  ).toBe(true);
  await page.reload();
  await expect(page.locator(".goal-note")).toContainText(
    "👑 Adventure complete!",
  );
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  const leaderboardChild = page.getByRole("article", { name, exact: true });
  await expect(leaderboardChild.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "16",
  );
  await expect(leaderboardChild).toContainText("16 / 16 cards");
  await leaderboardChild
    .getByText("View earned cards (16)", { exact: true })
    .click();
  await expect(leaderboardChild.locator(".reward-card.earned")).toHaveCount(16);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Switch child" }).click();
  await page.getByRole("button", { name: "Parent sign in" }).click();
  await page.getByLabel("Parent password").fill("local-test-parent-only");
  await page.getByRole("button", { name: "Let’s go" }).click();
  await page
    .getByRole("button", { name: "Parent dashboard", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Child", exact: true })
    .selectOption(kid.id);

  await expect(page.locator(".parent-cards .reward-card.earned")).toHaveCount(
    16,
  );
  await expect(page.locator(".parent-cards .reward-card.unearned")).toHaveCount(
    0,
  );
  const accuracyLabels = await page
    .locator(".tricky > div > span")
    .allTextContents();
  expect(accuracyLabels.length).toBeGreaterThan(0);
  expect(accuracyLabels.every((text) => parseInt(text) < 100)).toBe(true);
  await expect(page.locator(".heatmap-section")).toHaveCount(3);
  for (const title of ["Accuracy", "Practice frequency", "Response speed"]) {
    const section = page.getByRole("region", { name: title, exact: true });
    await expect(section).toBeVisible();
    await expect(section.locator(".chart svg").last()).toBeVisible();
    // Every fact must retain its cell, including practiced but unmastered facts.
    await expect(section.locator('[aria-label="cell"] rect')).toHaveCount(144);
  }
  await page.screenshot({
    path: "test-results/parent-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
