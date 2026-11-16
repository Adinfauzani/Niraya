"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { HERO_POINTS, ROTATING_WORDS } from "./content"

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]

function rise(index: number, done: boolean) {
  return {
    initial: { opacity: 0, y: 20, filter: "blur(10px)" },
    animate: done
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : { opacity: 0, y: 20, filter: "blur(10px)" },
    transition: { duration: 0.7, ease: EASE, delay: index * 0.09 },
  }
}

function RotatingWord({ word, done }: { word: string; done: boolean }) {
  return (
    <span className="relative inline-grid overflow-clip align-bottom">
      <span className="invisible col-start-1 row-start-1" aria-hidden="true">
        penjualan
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
          animate={
            done
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 24, filter: "blur(12px)" }
          }
          exit={{ opacity: 0, y: -24, filter: "blur(12px)" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="col-start-1 row-start-1 text-blue-600 dark:text-blue-400"
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function LandingHero() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_WORDS.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [reduce])

  const done = mounted && !reduce

  return (
    <section className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pt-32 pb-4 md:pt-40 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      <div>
        <motion.h1
          {...rise(0, done)}
          className="font-fredoka text-4xl tracking-tight md:text-5xl lg:text-6xl"
        >
          Kelola <RotatingWord word={ROTATING_WORDS[index]} done={done} />
          <br />
          dalam satu aplikasi
        </motion.h1>

        <motion.p
          {...rise(3, done)}
          className="mt-5 max-w-[520px] text-lg text-balance text-muted-foreground"
        >
          Niraya POS membantu UMKM Indonesia mencatat transaksi, mengatur stok,
          dan membaca performa usaha dalam satu aplikasi.
        </motion.p>

        <motion.div
          {...rise(4, done)}
          className="mt-8 flex w-full max-w-[30rem] flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          <Button
            asChild
            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-600/90"
          >
            <Link href="/register">Mulai gratis</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="h-10 rounded-lg px-5 text-sm font-medium"
          >
            <Link href="/#fitur">Lihat fitur</Link>
          </Button>
        </motion.div>

        <motion.ul
          {...rise(5, done)}
          className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          {HERO_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </motion.ul>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
        animate={
          done
            ? { opacity: 1, y: 0, filter: "blur(0px)" }
            : { opacity: 0, y: 24, filter: "blur(10px)" }
        }
        transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
        className="relative mx-auto w-full max-w-[24rem] lg:max-w-[30rem]"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-x-6 -bottom-6 top-10 -z-10 rounded-[2rem] bg-accent/60 blur-2xl"
        />
        <Image
          src="/hero.webp"
          alt="Pratinjau Niraya POS"
          width={425}
          height={353}
          priority
          className="h-auto w-full drop-shadow-sm"
        />
      </motion.div>
    </section>
  )
}