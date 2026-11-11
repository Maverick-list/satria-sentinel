import { expect, test } from "@playwright/test";

test.describe("SATRIA SENTINEL — Phase 1 Foundation E2E", () => {
  test("Dashboard loads, connects to Backend /api/v1/health, and shows healthy PostgreSQL status", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("page-heading")).toContainText(
      "Command Center Dashboard"
    );

    const healthPanel = page.getByTestId("system-health-panel");
    await expect(healthPanel).toBeVisible();

    await expect(page.getByTestId("health-status-badge")).toContainText(
      "Operational (Healthy)",
      { timeout: 10000 }
    );
    await expect(page.getByTestId("health-db-status")).toContainText(
      "Connected"
    );
    await expect(page.getByTestId("health-migration-status")).toContainText(
      "7 / 7 Tables Verified"
    );
  });

  test("Sidebar navigation transitions cleanly across all 7 main pages", async ({
    page,
  }) => {
    await page.goto("/");

    const routes = [
      { testId: "nav-link-assets", heading: "Assets Inventory", url: "/assets" },
      {
        testId: "nav-link-security-events",
        heading: "Security Events",
        url: "/security-events",
      },
      { testId: "nav-link-incidents", heading: "Incidents", url: "/incidents" },
      {
        testId: "nav-link-response-playbooks",
        heading: "Response Playbooks",
        url: "/playbooks",
      },
      {
        testId: "nav-link-audit-logs",
        heading: "Audit Logs",
        url: "/audit-logs",
      },
      {
        testId: "nav-link-settings",
        heading: "Platform Settings & Security Baseline",
        url: "/settings",
      },
      {
        testId: "nav-link-dashboard",
        heading: "Command Center Dashboard",
        url: "/",
      },
    ];

    for (const route of routes) {
      await page.getByTestId(route.testId).click();
      await expect(page).toHaveURL(new RegExp(`${route.url}$`));
      await expect(page.getByTestId("page-heading")).toContainText(
        route.heading
      );
    }
  });
});
