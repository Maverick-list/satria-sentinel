"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, RefreshCw, Search, Server, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { formatTimestamp } from "@/lib/utils";
import {
  createAssetApi,
  deleteAssetApi,
  listAssetsApi,
  updateAssetApi,
} from "@/services/operational-service";
import type { AssetItem } from "@/types/operational";

export default function AssetsPage() {
  const { user, isLoading: authLoading, showToast } = useAuth();
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [criticality, setCriticality] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);

  // Form states
  const [formTag, setFormTag] = useState("");
  const [formName, setFormName] = useState("");
  const [formHostname, setFormHostname] = useState("");
  const [formIp, setFormIp] = useState("");
  const [formType, setFormType] = useState("server");
  const [formEnv, setFormEnv] = useState("production");
  const [formCrit, setFormCrit] = useState("high");
  const [formStatus, setFormStatus] = useState("active");
  const [formOs, setFormOs] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = user?.role === "admin";

  const fetchAssets = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const resp = await listAssetsApi({
        page,
        pageSize: 10,
        search: search || undefined,
        criticality: criticality || undefined,
        status: statusFilter || undefined,
      });
      setAssets(resp.items);
      setTotal(resp.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setIsLoading(false);
    }
  }, [user, page, search, criticality, statusFilter]);

  useEffect(() => {
    if (!authLoading) {
      void fetchAssets();
    }
  }, [authLoading, fetchAssets]);

  function openCreateModal() {
    setEditingAsset(null);
    setFormTag("AST-SRV-101");
    setFormName("");
    setFormHostname("");
    setFormIp("");
    setFormType("server");
    setFormEnv("production");
    setFormCrit("high");
    setFormStatus("active");
    setFormOs("Ubuntu 24.04 LTS");
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(asset: AssetItem) {
    setEditingAsset(asset);
    setFormTag(asset.asset_tag);
    setFormName(asset.name);
    setFormHostname(asset.hostname ?? "");
    setFormIp(asset.ip_address ?? "");
    setFormType(asset.asset_type);
    setFormEnv(asset.environment);
    setFormCrit(asset.criticality);
    setFormStatus(asset.status);
    setFormOs(asset.operating_system ?? "");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!formTag.trim() || !formName.trim()) {
      setFormError("Asset Tag and Asset Name are required.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingAsset) {
        const updated = await updateAssetApi(editingAsset.id, {
          name: formName.trim(),
          hostname: formHostname.trim() || null,
          ip_address: formIp.trim() || null,
          asset_type: formType,
          environment: formEnv,
          criticality: formCrit,
          status: formStatus,
          operating_system: formOs.trim() || null,
        });
        showToast(`Asset ${updated.asset_tag} updated.`, "success");
        if (selectedAsset?.id === updated.id) {
          setSelectedAsset(updated);
        }
      } else {
        const created = await createAssetApi({
          asset_tag: formTag.trim().toUpperCase(),
          name: formName.trim(),
          hostname: formHostname.trim() || null,
          ip_address: formIp.trim() || null,
          asset_type: formType,
          environment: formEnv,
          criticality: formCrit,
          status: formStatus,
          operating_system: formOs.trim() || null,
        });
        showToast(`Asset ${created.asset_tag} created.`, "success");
      }
      setModalOpen(false);
      await fetchAssets();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save asset."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAsset(asset: AssetItem) {
    try {
      await deleteAssetApi(asset.id);
      showToast(`Asset ${asset.asset_tag} deleted.`, "info");
      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }
      await fetchAssets();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete asset",
        "error"
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
            <Server className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1
              data-testid="page-heading"
              className="text-2xl font-bold tracking-tight text-slate-100"
            >
              Assets Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Digital asset registration, criticality profiling, environment
              classification, and ownership mapping.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button
              size="sm"
              onClick={openCreateModal}
              data-testid="add-asset-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Asset</span>
            </Button>
          ) : (
            <Badge variant="secondary">
              Read-Only (Admin Role Required to Modify Assets)
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchAssets()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by tag, name, hostname, or IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                data-testid="asset-search-input"
                className="w-full rounded-md border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={criticality}
              onChange={(e) => {
                setCriticality(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Criticality"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Criticalities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by Status"
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="isolated">Isolated</option>
              <option value="decommissioned">Decommissioned</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monitored Assets ({total})</CardTitle>
            <CardDescription>
              Select an asset row to inspect full metadata or modify posture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Loading asset inventory...
              </p>
            ) : assets.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                No assets match the current filter criteria.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table
                  data-testid="assets-table"
                  className="w-full text-left text-xs"
                >
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2.5 pr-3">Tag</th>
                      <th className="pb-2.5 pr-3">Asset Name</th>
                      <th className="pb-2.5 pr-3">IP / Host</th>
                      <th className="pb-2.5 pr-3">Criticality</th>
                      <th className="pb-2.5 pr-3">Status</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {assets.map((asset) => (
                      <tr
                        key={asset.id}
                        onClick={() => setSelectedAsset(asset)}
                        className="cursor-pointer hover:bg-slate-900/60"
                      >
                        <td className="py-2.5 pr-3 font-mono font-semibold text-emerald-400">
                          {asset.asset_tag}
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-slate-100">
                          {asset.name}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">
                          {asset.ip_address ?? asset.hostname ?? "—"}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            variant={
                              asset.criticality === "critical"
                                ? "destructive"
                                : asset.criticality === "high"
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {asset.criticality.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 uppercase text-slate-300">
                          {asset.status}
                        </td>
                        <td
                          className="py-2.5 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isAdmin ? (
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`edit-asset-${asset.asset_tag}`}
                                onClick={() => openEditModal(asset)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`delete-asset-${asset.asset_tag}`}
                                onClick={() => void handleDeleteAsset(asset)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              View
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400">
              <span>
                Page {page} • Total {total} asset(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 10 >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Detail Inspector */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Detail Inspector</CardTitle>
            <CardDescription>
              Technical configuration & risk weighting context.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs">
            {selectedAsset ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <p className="font-mono text-sm font-bold text-emerald-400">
                    {selectedAsset.asset_tag}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-100">
                    {selectedAsset.name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
                    <span className="text-slate-400">Hostname</span>
                    <p className="mt-1 font-mono text-slate-200">
                      {selectedAsset.hostname ?? "—"}
                    </p>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
                    <span className="text-slate-400">IP Address</span>
                    <p className="mt-1 font-mono text-slate-200">
                      {selectedAsset.ip_address ?? "—"}
                    </p>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
                    <span className="text-slate-400">Type / Env</span>
                    <p className="mt-1 text-slate-200">
                      {selectedAsset.asset_type} ({selectedAsset.environment})
                    </p>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
                    <span className="text-slate-400">Operating System</span>
                    <p className="mt-1 text-slate-200">
                      {selectedAsset.operating_system ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="rounded border border-slate-800 bg-slate-950/50 p-2.5">
                  <span className="text-slate-400">Updated At</span>
                  <p className="mt-1 text-slate-300">
                    {formatTimestamp(selectedAsset.updated_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-slate-400">
                Click any asset row in the table to view its full telemetry
                profile.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit Asset Modal */}
      {modalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100">
                {editingAsset
                  ? `Edit Asset ${editingAsset.asset_tag}`
                  : "Register New Monitored Asset"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300">
                    Asset Tag *
                  </label>
                  <input
                    data-testid="asset-form-tag"
                    type="text"
                    disabled={Boolean(editingAsset)}
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 disabled:opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300">
                    Asset Name *
                  </label>
                  <input
                    data-testid="asset-form-name"
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300">
                    Hostname
                  </label>
                  <input
                    data-testid="asset-form-hostname"
                    type="text"
                    value={formHostname}
                    onChange={(e) => setFormHostname(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300">
                    IP Address
                  </label>
                  <input
                    data-testid="asset-form-ip"
                    type="text"
                    value={formIp}
                    onChange={(e) => setFormIp(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300">
                    Asset Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                  >
                    <option value="server">server</option>
                    <option value="database">database</option>
                    <option value="container">container</option>
                    <option value="workstation">workstation</option>
                    <option value="network_device">network_device</option>
                    <option value="cloud_service">cloud_service</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300">
                    Criticality
                  </label>
                  <select
                    data-testid="asset-form-criticality"
                    value={formCrit}
                    onChange={(e) => setFormCrit(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                  >
                    <option value="critical">critical</option>
                    <option value="high">high</option>
                    <option value="medium">medium</option>
                    <option value="low">low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300">
                    Status
                  </label>
                  <select
                    data-testid="asset-form-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                  >
                    <option value="active">active</option>
                    <option value="maintenance">maintenance</option>
                    <option value="isolated">isolated</option>
                    <option value="decommissioned">decommissioned</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300">
                  Operating System
                </label>
                <input
                  type="text"
                  value={formOs}
                  onChange={(e) => setFormOs(e.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                />
              </div>

              {formError ? (
                <p className="rounded border border-rose-500/40 bg-rose-950/40 p-2 text-rose-200">
                  {formError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  data-testid="asset-form-submit"
                >
                  {isSaving ? "Saving..." : "Save Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
