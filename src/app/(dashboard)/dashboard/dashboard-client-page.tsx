"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { DashboardPage } from "@/features/dashboard/dashboard-page";

function DashboardSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex gap-1">
          <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.2s" }} />
          <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.1s" }} />
          <span className="size-2 animate-bounce rounded-full bg-primary" />
        </div>
        <span>Memuat dashboard...</span>
      </div>
    </div>
  );
}

export function DashboardClientPage() {
  return <DashboardPage />;
}