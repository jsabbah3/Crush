import type { CSSProperties } from "react";
import { Postmark, Rubber, Seal } from "@/components/brand";

/**
 * The landing hero's illustration: the one letter Crush sends. An envelope
 * drops in, the letter slides out of it, then the postmark and the NEW stamp
 * land. It's deliberately a letter and not a dashboard screenshot — the
 * product is the alert, and every competitor already shows a UI mock.
 *
 * Always white paper with dark ink (.paper-light), in both themes.
 */
export function HeroLetter() {
  return (
    <div className="mx-auto w-full max-w-[29rem] select-none" aria-hidden>
    <div className="paper-light relative pt-[6.75rem] text-foreground">
      {/* Envelope, behind */}
      <div
        className="airmail-frame absolute right-0 top-0 h-[19rem] w-[90%] rounded-[3px] shadow-[0_18px_40px_-18px_oklch(0.24_0.06_266/0.45)]"
        style={{ "--tilt": "4deg", animation: "drop-in 600ms var(--ease-settle) both" } as CSSProperties}
      >
        <div className="relative size-full">
          {/* Stamp + postmark, top right */}
          <div className="absolute right-3 top-3">
            <div className="stamp-lift">
              <div className="stamp flex h-[4.5rem] w-14 items-center justify-center" style={{ "--perf": "8px" } as CSSProperties}>
                <div className="flex size-full items-center justify-center border border-primary/60 bg-note">
                  <Seal className="size-8" />
                </div>
              </div>
            </div>
          </div>
          <Postmark
            top="Crush Post"
            lines={["9:04 AM", "FIRST CLASS"]}
            className="absolute right-[3.4rem] top-3 h-[4.4rem] text-foreground/60"
            style={{ "--tilt": "-9deg", animation: "thunk 380ms 950ms var(--ease-thunk) both" } as CSSProperties}
          />
          {/* Return address */}
          <div className="absolute left-4 top-4 space-y-1">
            <p className="label-caps text-[0.58rem] text-airmail">Par avion</p>
            <p className="hand text-[1.35rem] text-foreground/70">from: Crush</p>
          </div>
        </div>
      </div>

      {/* The letter, in front */}
      <div
        className="sheet ruled relative z-10 w-[86%] rounded-[2px] px-6 pb-6 pt-[1.6rem] sm:px-7"
        style={{ "--tilt": "-2.5deg", animation: "letter-out 800ms 250ms var(--ease-settle) both" } as CSSProperties}
      >
        <Rubber
          tone="red"
          tilt={8}
          className="absolute -right-4 top-[7.6rem] bg-paper text-[0.8rem] [animation-delay:1250ms]"
          animate
        >
          New match
        </Rubber>

        <p className="font-mono text-[0.72rem] leading-7 text-muted-foreground">Tuesday, 9:04 AM</p>
        <p className="font-heading text-lg italic leading-7">Dear Maya,</p>
        <p className="mt-7 text-[0.95rem] leading-7">
          <span className="font-semibold">Ramp</span> just opened
        </p>
        <p className="font-heading text-[1.7rem] font-extrabold leading-[1.03] tracking-[-0.02em] sm:text-[1.9rem]">
          Enterprise Account Executive
        </p>
        <p className="mt-[0.4rem] font-mono text-[0.72rem] leading-7 text-muted-foreground">
          New York · $180k–$240k · posted today
        </p>
        <p className="mt-7 text-[0.95rem] leading-7">You said you&apos;d leave for this one.</p>
        <div className="mt-7 flex items-end justify-between gap-4">
          <p className="hand text-[1.9rem] leading-7 text-primary">— Crush</p>
          <p className="hand max-w-[11rem] text-right text-[1.3rem] leading-[1.05] text-airmail">
            P.S. you know 3 people there
          </p>
        </div>
      </div>

    </div>
      {/* Outside the paper scope: this sits on the page, so it takes the page's ink. */}
      <p className="hand relative z-10 mt-4 pb-6 pl-6 text-[1.45rem] text-muted-foreground">
        ↑ the only kind of email we send
      </p>
    </div>
  );
}
