"use client";

import React from "react";
import { PageHeader } from "@/app/(portal)/(member)/layout";
import { PhotoTile } from "@/components/brand/PhotoTile";

export default function SubmitHubScreen() {
  return (
    <div>
      <PageHeader
        title="Register works"
        subtitle="Composers, authors and publishers register musical works with ZAMCOPS — song and artwork in one submission."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <PhotoTile
          href="/submit/single"
          src="/img/auth-mic.webp"
          alt="Vocalist at a microphone"
          title="Register a work"
          body="Send one song and its artwork together. Credit composers, authors, arrangers and publishers."
        />
        <PhotoTile
          href="/submit/album"
          src="/img/mpc.webp"
          alt="Studio production"
          title="Register an album"
          body="Send several tracks with front and back artwork in one submission."
        />
      </div>
    </div>
  );
}
