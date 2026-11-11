"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Honest architectural metadata representing actual columns & indexes defined in
 * backend/alembic/versions/20261111_0001_initial_foundation_schema.py.
 * Does NOT fabricate security alerts or fake network traffic.
 */
const FOUNDATION_SCHEMA_METRICS = [
  { entity: "users", columns: 9, indexes: 3 },
  { entity: "assets", columns: 13, indexes: 10 },
  { entity: "security_events", columns: 16, indexes: 11 },
  { entity: "playbooks", columns: 11, indexes: 6 },
  { entity: "incidents", columns: 14, indexes: 8 },
  { entity: "incident_events", columns: 8, indexes: 2 },
  { entity: "audit_logs", columns: 10, indexes: 6 },
];

export function SchemaReadinessChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Phase 1 Database Schema Structural Profile (Actual DDL Metrics)
        </CardTitle>
        <CardDescription>
          Displays the actual column and index count per PostgreSQL table created
          by Alembic migration <code className="font-mono text-emerald-400">20261111_0001</code>. No
          synthetic threat telemetry is fabricated in Phase 1.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={FOUNDATION_SCHEMA_METRICS}
              margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="entity"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
              />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#10b981",
                  borderRadius: "0.5rem",
                  color: "#f8fafc",
                  fontSize: "12px",
                }}
              />
              <Bar
                dataKey="columns"
                name="Columns"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="indexes"
                name="Indexes"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
