"use client";

import { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const PosPageClient = dynamic(() => import("@/features/pos/pages/PosPage").then((m) => m.default), { ssr: false });

export default function Page() {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        const res = await fetch("/api/pos/feature-check", { cache: "no-store", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setAllowed(data.allowed);
        } else {
          redirect("/dashboard");
        }
      } catch {
        redirect("/dashboard");
      } finally {
        setChecked(true);
      }
    }
    checkAccess();
  }, []);

  if (!checked) {
    return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Fitur POS tidak tersedia</h2>
          <p className="text-muted-foreground mt-2">Paket Anda tidak mendukung fitur POS. Silakan upgrade ke paket Starter atau lebih tinggi.</p>
        </div>
      </div>
    );
  }

  return <PosPageClient />;
}