import { expect, test } from "@playwright/test";

test.describe("SATRIA SENTINEL — Phase 2 Final Acceptance E2E Suite", () => {
  test("1. Dashboard Health, Metrics, Login Modal & RBAC Role Switching (Admin <-> Viewer)", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByTestId("page-heading")).toContainText(
      "Command Center Dashboard"
    );
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

    // Auto-authenticated as admin
    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "admin",
      { timeout: 10000 }
    );
    await expect(page.getByTestId("active-role-badge")).toContainText("admin");

    // Switch role to Viewer via Login Modal
    await page.getByTestId("open-login-modal-btn").click();
    await page.getByTestId("preset-viewer-btn").click();
    await page.getByTestId("login-submit-btn").click();

    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "viewer",
      { timeout: 10000 }
    );
    await expect(page.getByTestId("active-role-badge")).toContainText("viewer");

    // Verify RBAC restriction on Assets page (Add Asset button hidden for viewer)
    await page.getByTestId("nav-link-assets").click();
    await expect(page.getByTestId("page-heading")).toContainText(
      "Assets Inventory"
    );
    await expect(page.getByTestId("add-asset-btn")).toHaveCount(0);

    // Switch back to Admin
    await page.getByTestId("open-login-modal-btn").click();
    await page.getByTestId("preset-admin-btn").click();
    await page.getByTestId("login-submit-btn").click();
    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "admin",
      { timeout: 10000 }
    );
    await expect(page.getByTestId("add-asset-btn")).toBeVisible();
  });

  test("2. Synthetic Generator, CSV/JSON Ingestion, Detections, Correlations, Escalation & Incident Investigation", async ({
    page,
  }) => {
    await page.goto("/security-events");
    await expect(page.getByTestId("page-heading")).toContainText(
      "Security Events"
    );
    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "admin",
      { timeout: 10000 }
    );

    // A. Trigger Synthetic Security Log Generator
    await page.getByTestId("generate-scenario-btn").click();
    await expect(page.getByTestId("security-events-table")).toContainText(
      "[SYNTHETIC SIMULATION]",
      { timeout: 10000 }
    );

    // B. Test JSON Log Ingestion via UI
    const uniqueRun = Date.now();
    const sampleJson = JSON.stringify([
      {
        asset_tag: "AST-IAM-001",
        event_type: "auth_failure",
        source: "e2e_playwright_sensor",
        severity: "high",
        title: `[SYNTHETIC SIMULATION] E2E JSON Brute Force ${uniqueRun}`,
        source_ip: "198.51.100.250",
        occurred_at: new Date().toISOString(),
        raw_payload: { failed_attempts: 9 },
      },
    ]);
    await page.getByTestId("import-format-select").selectOption("json");
    await page.getByTestId("import-content-textarea").fill(sampleJson);
    await page.getByTestId("import-logs-submit-btn").click();
    await expect(page.getByTestId("import-summary-box")).toContainText(
      "Ingestion Summary (JSON): Received 1 • Imported 1",
      { timeout: 10000 }
    );

    // C. Escalate a Correlated Cluster to an Incident
    const escalateBtn = page
      .locator('[data-testid^="escalate-cluster-"]')
      .first();
    await expect(escalateBtn).toBeVisible({ timeout: 10000 });
    await escalateBtn.click();

    // D. Investigate, Transition Status, Add Note, and Resolve Incident on /incidents
    await page.getByTestId("nav-link-incidents").click();
    await expect(page.getByTestId("page-heading")).toContainText("Incidents");
    const firstIncidentCard = page
      .locator('[data-testid^="incident-card-"]')
      .first();
    await expect(firstIncidentCard).toBeVisible({ timeout: 10000 });
    await firstIncidentCard.click();

    // Transition status to containment
    await page.getByTestId("incident-status-btn-containment").click();
    await expect(page.getByTestId("incident-timeline-list")).toContainText(
      "containment",
      { timeout: 10000 }
    );

    // Add investigation note
    await page
      .getByTestId("incident-note-input")
      .fill("Playwright E2E analyst verification note: logs reviewed.");
    await page.getByTestId("incident-note-submit").click();
    await expect(page.getByTestId("incident-timeline-list")).toContainText(
      "Playwright E2E analyst verification note",
      { timeout: 10000 }
    );

    // Resolve incident with root cause notes
    await page
      .getByTestId("incident-resolve-input")
      .fill(
        "Root cause verified as synthetic simulation test; advisory playbook applied."
      );
    await page.getByTestId("incident-resolve-submit").click();
    await expect(page.getByTestId("incident-timeline-list")).toContainText(
      "Root cause verified as synthetic simulation test",
      { timeout: 10000 }
    );
  });

  test("3. Playbooks Advisory Matcher, Immutable Audit Logs, and 7-Page Navigation", async ({
    page,
  }) => {
    await page.goto("/playbooks");
    await expect(page.getByTestId("page-heading")).toContainText(
      "Response Playbooks"
    );
    await expect(page.getByTestId("active-user-indicator")).toContainText(
      "admin",
      { timeout: 10000 }
    );

    // Recommend playbook for brute_force
    await page
      .getByTestId("playbook-recommend-select")
      .selectOption("brute_force");
    await page.getByTestId("playbook-recommend-btn").click();
    await expect(page.getByTestId("playbook-steps-list")).toBeVisible({
      timeout: 10000,
    });

    // Verify Audit Logs page shows recorded operational actions
    await page.getByTestId("nav-link-audit-logs").click();
    await expect(page.getByTestId("page-heading")).toContainText("Audit Logs");
    await expect(page.getByTestId("audit-logs-table")).toContainText(
      "auth.login_success",
      { timeout: 10000 }
    );

    // Navigate cleanly across all 7 main pages
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
