"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api-client";

// ดึงข้อมูลจาก API ของเรา พร้อม loading / error / reload
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!url);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      setData(await api.get<T>(url));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
