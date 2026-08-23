"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Work registration lives on /submit/single — song and artwork together. */
export default function WorkDeclarationRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/submit/single");
  }, [router]);
  return (
    <div className="grid h-48 place-items-center">
      <span className="h-7 w-7 animate-spin rounded-full border-2 border-zam-line border-t-zam-orange" />
    </div>
  );
}
