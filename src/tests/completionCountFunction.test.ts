import { beforeEach, describe, expect, it, vi } from "vitest";

const blobMocks = vi.hoisted(() => ({
  get: vi.fn(),
  getWithMetadata: vi.fn(),
  setJSON: vi.fn(),
}));

vi.mock("@netlify/blobs", () => ({
  getStore: () => blobMocks,
}));

import handler from "../../netlify/functions/completion-count.mjs";

const functionUrl = "https://kinkatlas.example/.netlify/functions/completion-count";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("completion-count Netlify Function", () => {
  it("returns zero before the aggregate has been initialized", async () => {
    blobMocks.get.mockResolvedValue(null);
    const response = await handler(new Request(functionUrl));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 0 });
    expect(blobMocks.get).toHaveBeenCalledWith("completed-assessments", { consistency: "strong", type: "json" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("atomically increments only the stored aggregate integer", async () => {
    blobMocks.getWithMetadata.mockResolvedValue({ data: 41, etag: "current-etag", metadata: {} });
    blobMocks.setJSON.mockResolvedValue({ modified: true, etag: "next-etag" });
    const response = await handler(
      new Request(functionUrl, {
        method: "POST",
        headers: { origin: "https://kinkatlas.example" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 42 });
    expect(blobMocks.setJSON).toHaveBeenCalledWith("completed-assessments", 42, { onlyIfMatch: "current-etag" });
  });

  it("creates the aggregate at one and retries a concurrent creation conflict", async () => {
    blobMocks.getWithMetadata.mockResolvedValueOnce(null).mockResolvedValueOnce({ data: 1, etag: "created-elsewhere", metadata: {} });
    blobMocks.setJSON.mockResolvedValueOnce({ modified: false }).mockResolvedValueOnce({ modified: true, etag: "next-etag" });

    const response = await handler(new Request(functionUrl, { method: "POST" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 2 });
    expect(blobMocks.setJSON).toHaveBeenNthCalledWith(1, "completed-assessments", 1, { onlyIfNew: true });
    expect(blobMocks.setJSON).toHaveBeenNthCalledWith(2, "completed-assessments", 2, { onlyIfMatch: "created-elsewhere" });
  });

  it("rejects cross-origin and non-empty increment requests without touching storage", async () => {
    const crossOrigin = await handler(
      new Request(functionUrl, {
        method: "POST",
        headers: { origin: "https://other.example" },
      }),
    );
    const withBody = await handler(new Request(functionUrl, { method: "POST", body: JSON.stringify({ count: 999 }) }));

    expect(crossOrigin.status).toBe(403);
    expect(withBody.status).toBe(400);
    expect(blobMocks.getWithMetadata).not.toHaveBeenCalled();
    expect(blobMocks.setJSON).not.toHaveBeenCalled();
  });

  it("returns an unavailable response when Blob storage fails", async () => {
    blobMocks.get.mockRejectedValue(new Error("unavailable"));
    const response = await handler(new Request(functionUrl));
    expect(response.status).toBe(503);
  });
});
