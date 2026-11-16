"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { motion, useMotionValueEvent, useScroll } from "motion/react"

import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Button } from "@/components/ui/button"

import { NAV_LINKS } from "./content"

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]

export function LandingHeader() {
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0
    if (latest > previous && latest > 60) setHidden(true)
    else if (latest < previous) setHidden(false)
  })

  return (
    <motion.header
      initial={false}
      animate={hidden ? "hidden" : "visible"}
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: "-140%", opacity: 0 },
      }}
      transition={{ duration: 0.3, ease: EASE }}
      className="fixed inset-x-0 top-0 z-[70] px-3 pt-3"
    >
      <div className="mx-auto flex h-12 w-full max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full border bg-background/80 p-1.5 shadow-lg shadow-foreground/5 backdrop-blur-md sm:w-fit sm:gap-2 sm:pe-1.5 sm:ps-4">
        <Link href="/" aria-label="Niraya POS" className="flex items-center">
          <Image
            src="/Niraya.webp"
            alt="Niraya POS"
            width={92}
            height={32}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <div className="hidden items-center gap-1 sm:flex sm:gap-1">
          <nav className="mr-1 hidden items-center sm:flex sm:mr-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.url}
                href={link.url}
                className="inline-flex h-8 items-center rounded-full px-2 text-sm text-neutral-700 transition-colors hover:text-black dark:text-neutral-200 dark:hover:text-white"
              >
                {link.title}
              </Link>
            ))}
          </nav>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden h-8 rounded-full px-3 sm:inline-flex"
          >
            <Link href="/login">Masuk</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="h-8 rounded-full bg-blue-600 px-4 text-white hover:bg-blue-600/90"
          >
            <Link href="/register">Daftar</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  )
}