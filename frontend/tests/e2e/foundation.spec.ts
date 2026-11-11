import { expect, test } from "@playwright/test";

test.describe("SATRIA SENTINEL — Phase 1 & Phase 2 Operational E2E", () => {
  test("Dashboard loads, connects to Backend /api/v1/health, and shows live risk & RBAC session", async ({
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

    // Verify auto-authenticated RBAC badge in top header
    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "admin",
      {
        timeout: 10000,
      }
    );
  });

  test("End-to-End Operational Flow: Synthetic Log Generation, Detection, Correlation, and Incident Lifecycle", async ({
    page,
  }) => {
    await page.goto("/security-events");
    await expect(page.getByTestId("page-heading")).toContainText(
      "Security Events"
    );
    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "admin",
      {
        timeout: 10000,
      }
    );

    // 1. Trigger Synthetic Security Log Generator from UI
    await page.getByTestId("generate-scenario-btn").click();
    await expect(page.getByTestId("security-events-table")).toContainText(
      "[SYNTHETIC SIMULATION]",
      { timeout: 10000 }
    );

    // 2. Escalate a correlated cluster to an Incident
    const escalateBtn = page
      .locator('[data-testid^="escalate-cluster-"]')
      .first();
    await expect(escalateBtn).toBeVisible({ timeout: 10000 });
    await escalateBtn.click();

    // 3. Navigate to Incidents page and inspect/update incident
    await page.getByTestId("nav-link-incidents").click();
    await expect(page.getByTestId("page-heading")).toContainText("Incidents");
    const firstIncidentCard = page
      .locator('[data-testid^="incident-card-"]')
      .first();
    await expect(firstIncidentCard).toBeVisible({ timeout: 10000 });
    await firstIncidentCard.click();

    // 4. Add investigation note and verify timeline updates
    await page
      .getByTestId("incident-note-input")
      .fill("Playwright E2E analyst verification note: logs reviewed.");
    await page.getByTestId("incident-note-submit").click();
    await expect(page.getByTestId("incident-timeline-list")).toContainText(
      "Playwright E2E analyst verification note",
      { timeout: 10000 }
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
