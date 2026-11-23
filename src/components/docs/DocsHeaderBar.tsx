"use client"

import Image from "next/image"
import Link from "next/link"

import { SidebarIcon } from "lucide-react"

import { buttonVariants } from "fumadocs-ui/components/ui/button"
import { useDocsLayout } from "fumadocs-ui/layouts/docs"

export function DocsHeaderBar() {
  const { slots } = useDocsLayout()
  return (
    <header className="[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex h-(--fd-header-height) items-center gap-2 bg-background/80 px-3 backdrop-blur-sm max-md:layout:[--fd-header-height:--spacing(14)] md:layout:[--fd-header-height:--spacing(12)]">
      <slots.sidebar.trigger
        className={buttonVariants({
          variant: "ghost",
          size: "icon-sm",
          className: "p-2",
        })}
      >
        <SidebarIcon className="size-5" />
      </slots.sidebar.trigger>

      <Link
        href="/"
        aria-label="Niraya POS"
        className="flex shrink-0 items-center"
      >
        <Image
          src="/Niraya.webp"
          alt="Niraya POS"
          width={92}
          height={32}
          priority
          className="h-6 w-auto"
        />
      </Link>

      {slots.searchTrigger ? (
        <slots.searchTrigger.sm
          hideIfDisabled
          className="ms-auto p-2"
        />
      ) : null}

      <Link
        href="/"
        className="hidden shrink-0 items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 sm:inline-flex"
      >
        Buka aplikasi
      </Link>
    </header>
  )
}
