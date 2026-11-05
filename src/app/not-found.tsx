import { linkButtonClass } from "@/lib/button-styles";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo size={40} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-text-muted">That page doesn’t exist, or you don’t have access to that server.</p>
      </div>
      <Link href="/servers" className={linkButtonClass("primary")}>Back to your servers</Link>
    </main>
  );
}
