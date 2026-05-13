"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/components/EmptyState";
import ErrorState from "@/components/ErrorState";
import LoadingState from "@/components/LoadingState";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import Sidebar from "@/components/Sidebar";
import { api, getErrorMessage, isUnauthorizedError } from "@/lib/api";
import { clearAccessToken, isLoggedIn } from "@/lib/auth";
import type {
  WebpanelTestingDeviceLookupResponse,
  WebpanelTestingDeviceResponse,
} from "@/lib/types";
import { useRouter } from "next/navigation";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

function normalizeDeviceId(value: string): string {
  return value.trim();
}

function compactId(value: string, keepStart = 10, keepEnd = 8): string {
  if (value.length <= keepStart + keepEnd + 1) {
    return value;
  }

  return `${value.slice(0, keepStart)}...${value.slice(-keepEnd)}`;
}

export default function TestingDevicesPage() {
  const router = useRouter();

  const [devices, setDevices] = useState<WebpanelTestingDeviceResponse[]>([]);
  const [query, setQuery] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [lookupDeviceId, setLookupDeviceId] = useState("");
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [lookupResult, setLookupResult] = useState<WebpanelTestingDeviceLookupResponse | null>(null);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    clearAccessToken({ sessionExpired: true });
    router.replace("/login");
  }, [router]);

  const loadDevices = useCallback(async () => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await api.getTestingDevices();
      setDevices(response ?? []);
    } catch (loadError) {
      if (isUnauthorizedError(loadError)) {
        handleUnauthorized();
        return;
      }

      setError(getErrorMessage(loadError, "Failed to load testing devices."));
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, router]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const filteredDevices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return devices;
    }

    return devices.filter((device) => device.deviceId.toLowerCase().includes(normalizedQuery));
  }, [devices, query]);

  const validateUuidOrSetError = useCallback((value: string, setter: (message: string) => void) => {
    const normalized = normalizeDeviceId(value);
    if (!normalized) {
      setter("Device ID is required.");
      return null;
    }

    if (!isValidUuid(normalized)) {
      setter("Device ID must be a valid UUID.");
      return null;
    }

    setter("");
    return normalized;
  }, []);

  const handleCreate = useCallback(async () => {
    const normalized = validateUuidOrSetError(newDeviceId, setFormError);
    if (!normalized) return;

    setIsCreating(true);

    try {
      const created = await api.createTestingDevice(normalized);
      setDevices((current) => {
        const next = current.filter((item) => item.deviceId !== created.deviceId);
        return [created, ...next];
      });
      setNewDeviceId("");
      setFormError("");
    } catch (createError) {
      if (isUnauthorizedError(createError)) {
        handleUnauthorized();
        return;
      }

      setFormError(getErrorMessage(createError, "Failed to save testing device."));
    } finally {
      setIsCreating(false);
    }
  }, [handleUnauthorized, newDeviceId, validateUuidOrSetError]);

  const handleLookup = useCallback(async () => {
    const normalized = validateUuidOrSetError(lookupDeviceId, setLookupError);
    if (!normalized) return;

    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const result = await api.lookupTestingDevice(normalized);
      setLookupResult(result);
      setLookupError("");
    } catch (lookupRequestError) {
      if (isUnauthorizedError(lookupRequestError)) {
        handleUnauthorized();
        return;
      }

      setLookupError(getErrorMessage(lookupRequestError, "Failed to lookup testing device."));
    } finally {
      setIsLookingUp(false);
    }
  }, [handleUnauthorized, lookupDeviceId, validateUuidOrSetError]);

  const startEditing = useCallback((deviceId: string) => {
    setEditingDeviceId(deviceId);
    setEditingValue(deviceId);
    setFormError("");
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingDeviceId(null);
    setEditingValue("");
    setFormError("");
  }, []);

  const handleUpdate = useCallback(async (currentDeviceId: string) => {
    const normalized = validateUuidOrSetError(editingValue, setFormError);
    if (!normalized) return;

    setBusyDeviceId(currentDeviceId);

    try {
      const updated = await api.updateTestingDevice(currentDeviceId, normalized);
      setDevices((current) =>
        current.map((item) => (item.deviceId === currentDeviceId ? updated : item)),
      );
      if (lookupResult?.deviceId === currentDeviceId || lookupResult?.deviceId === normalized) {
        setLookupResult({
          deviceId: updated.deviceId,
          isTestingDevice: true,
        });
      }
      cancelEditing();
    } catch (updateError) {
      if (isUnauthorizedError(updateError)) {
        handleUnauthorized();
        return;
      }

      setFormError(getErrorMessage(updateError, "Failed to update testing device."));
    } finally {
      setBusyDeviceId(null);
    }
  }, [cancelEditing, editingValue, handleUnauthorized, lookupResult, validateUuidOrSetError]);

  const handleDelete = useCallback(async (deviceId: string) => {
    setBusyDeviceId(deviceId);
    setFormError("");

    try {
      await api.deleteTestingDevice(deviceId);
      setDevices((current) => current.filter((item) => item.deviceId !== deviceId));
      if (editingDeviceId === deviceId) {
        cancelEditing();
      }
      if (lookupResult?.deviceId === deviceId) {
        setLookupResult({
          deviceId,
          isTestingDevice: false,
        });
      }
    } catch (deleteError) {
      if (isUnauthorizedError(deleteError)) {
        handleUnauthorized();
        return;
      }

      setFormError(getErrorMessage(deleteError, "Failed to delete testing device."));
    } finally {
      setBusyDeviceId(null);
    }
  }, [cancelEditing, editingDeviceId, handleUnauthorized, lookupResult]);

  return (
    <main className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar title="Testing Devices" />
        <section className="content-wrap">
          <div className="testing-devices-grid">
            <section className="section-card">
              <div className="section-header">
                <h2>Add Testing Device</h2>
              </div>
              <div className="testing-device-form">
                <label className="filter-control">
                  <span>Device UUID</span>
                  <input
                    className="input"
                    type="text"
                    value={newDeviceId}
                    onChange={(event) => setNewDeviceId(event.target.value)}
                    placeholder="123e4567-e89b-12d3-a456-426614174000"
                  />
                </label>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void handleCreate()}
                  disabled={isCreating}
                >
                  {isCreating ? "Saving..." : "Save Device"}
                </button>
              </div>
              {formError ? <p className="error-text">{formError}</p> : null}
            </section>

            <section className="section-card">
              <div className="section-header">
                <h2>Lookup Device</h2>
              </div>
              <div className="testing-device-form">
                <label className="filter-control">
                  <span>Device UUID</span>
                  <input
                    className="input"
                    type="text"
                    value={lookupDeviceId}
                    onChange={(event) => setLookupDeviceId(event.target.value)}
                    placeholder="Check if a device is registered"
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => void handleLookup()}
                  disabled={isLookingUp}
                >
                  {isLookingUp ? "Looking up..." : "Lookup"}
                </button>
              </div>
              {lookupError ? <p className="error-text">{lookupError}</p> : null}
              {lookupResult ? (
                <div className={`testing-device-lookup-card ${lookupResult.isTestingDevice ? "testing-device-lookup-card-success" : ""}`}>
                  <p className="testing-device-lookup-label">Device ID</p>
                  <p className="testing-device-lookup-value">{lookupResult.deviceId}</p>
                  <p className="testing-device-lookup-status">
                    {lookupResult.isTestingDevice ? "Registered testing device" : "Not registered"}
                  </p>
                </div>
              ) : null}
            </section>
          </div>

          <SearchBar
            value={query}
            onChange={setQuery}
            label="Search Testing Devices"
            placeholder="Search by device UUID"
          />

          {isLoading ? <LoadingState message="Loading testing devices..." /> : null}
          {!isLoading && error ? <ErrorState message={error} onRetry={loadDevices} /> : null}
          {!isLoading && !error && devices.length === 0 ? (
            <EmptyState message="No testing devices found." />
          ) : null}

          {!isLoading && !error && devices.length > 0 ? (
            filteredDevices.length > 0 ? (
              <section className="section-card">
                <div className="users-toolbar">
                  <p className="results-meta">
                    Showing {filteredDevices.length} of {devices.length} testing devices
                  </p>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Device ID</th>
                        <th>Short View</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDevices.map((device) => {
                        const isEditing = editingDeviceId === device.deviceId;
                        const isBusy = busyDeviceId === device.deviceId;

                        return (
                          <tr key={device.deviceId}>
                            <td>
                              {isEditing ? (
                                <input
                                  className="input"
                                  type="text"
                                  value={editingValue}
                                  onChange={(event) => setEditingValue(event.target.value)}
                                />
                              ) : (
                                <span title={device.deviceId}>{device.deviceId}</span>
                              )}
                            </td>
                            <td title={device.deviceId}>{compactId(device.deviceId)}</td>
                            <td>
                              <span className="testing-device-status-badge">Registered</span>
                            </td>
                            <td>
                              <div className="testing-device-actions">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn"
                                      onClick={() => void handleUpdate(device.deviceId)}
                                      disabled={isBusy}
                                    >
                                      {isBusy ? "Saving..." : "Update"}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline"
                                      onClick={cancelEditing}
                                      disabled={isBusy}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn btn-outline"
                                      onClick={() => startEditing(device.deviceId)}
                                      disabled={Boolean(busyDeviceId)}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline testing-device-delete-btn"
                                      onClick={() => void handleDelete(device.deviceId)}
                                      disabled={Boolean(busyDeviceId)}
                                    >
                                      {isBusy ? "Deleting..." : "Delete"}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <EmptyState message="No testing devices match your search." />
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
