import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  created_at?: string;
  category_id?: number;
  stock_quantity?: number;
};

type ProductsResponse = {
  items: Product[];
  page: number;
  limit: number;
  total: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export default function App() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const limit = 8;

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.limit));
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);

    axios
      .get<ProductsResponse>(`${API_URL}/api/products`, {
        params: { page, limit },
        withCredentials: true,
      })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e?.response?.data?.message || e.message);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-2xl font-bold">E-Commerce — Products</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {loading && (
          <div className="text-slate-600">Loading products…</div>
        )}

        {err && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">
            Failed to load products: {err}
          </div>
        )}

        {!loading && !err && data && (
          <>
            <div className="mb-4 text-sm text-slate-600">
              Showing page <span className="font-semibold">{data.page}</span> of{" "}
              <span className="font-semibold">{totalPages}</span> — total{" "}
              <span className="font-semibold">{data.total}</span> items
            </div>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.items.map((p) => (
                <li
                  key={p.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-4">
                    <h2 className="line-clamp-1 text-lg font-semibold">
                      {p.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                      {p.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-base font-bold">
                        ${p.price.toFixed(2)}
                      </span>
                      <button className="rounded-xl px-3 py-1 text-sm font-medium ring-1 ring-slate-300 hover:bg-slate-50">
                        Add
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center gap-2">
              <button
                className="rounded-xl px-3 py-1 text-sm font-medium ring-1 ring-slate-300 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                ← Prev
              </button>
              <span className="text-sm text-slate-600">
                Page {page} / {totalPages}
              </span>
              <button
                className="rounded-xl px-3 py-1 text-sm font-medium ring-1 ring-slate-300 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
