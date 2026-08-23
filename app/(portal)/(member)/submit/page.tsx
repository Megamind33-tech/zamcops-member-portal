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
          body="Song, instrumental or arrangement — with artwork, studio receipt, and every creator listed once."
        />
        <PhotoTile
          href="/submit/album"
          src="/img/mpc.webp"
          alt="Studio production"
          title="Register an album"
          body="Tracks, artwork, and the studio letter or receipt. Creators are listed once per track."
        />
      </div>
    </div>
  );
}
