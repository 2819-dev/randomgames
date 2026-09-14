"use client";

import Image from "next/image";
import { useEffect } from "react";
import { AuthButton } from "@/components/AuthButton";

/** Quiet Apple-style holding page while Bored Box is under construction. */
export function ComingSoon() {
  useEffect(() => {
    document.body.classList.add("coming-soon-body");
    return () => document.body.classList.remove("coming-soon-body");
  }, []);

  return (
    <main className="coming-soon relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <AuthButton />
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Bored Box"
          width={88}
          height={88}
          className="mb-8 rounded-[22%] shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
          priority
        />

        <p className="mb-3 text-[13px] font-semibold tracking-[0.08em] text-black/40 uppercase">Bored Box</p>

        <h1 className="coming-soon-title text-[2.35rem] leading-[1.12] font-semibold tracking-[-0.03em] text-[#1d1d1f] sm:text-[3.1rem]">
          We’ll be back soon.
        </h1>

        <p className="mt-5 max-w-md text-[17px] leading-relaxed font-normal text-[#6e6e73] sm:text-[19px]">
          We’re making a few updates to Bored Box. Hang tight — the arcade will reopen before you know it.
        </p>

        <div className="mt-10 h-px w-16 bg-black/10" />

        <p className="mt-8 text-[13px] text-[#86868b]">Thanks for your patience.</p>
      </div>
    </main>
  );
}
