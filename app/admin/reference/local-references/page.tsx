"use client";

import React from "react";
import { AdminHeader } from "@/components/admin/AdminShell";
import { Panel, Th, Td } from "@/components/admin/widgets";
import { LOCAL_REFERENCES } from "@/lib/localReferences";

// WIPO Connect Operational > Local References
export default function LocalReferencesPage() {
  return (
    <div>
      <AdminHeader title="Local References" subtitle="Lists of values used by the system" />
      <Panel title="Local References">
        <table className="w-full">
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Values</Th>
            </tr>
          </thead>
          <tbody>
            {LOCAL_REFERENCES.map((r) => (
              <tr key={r.code}>
                <Td className="font-mono text-xs">{r.code}</Td>
                <Td>{r.name}</Td>
                <Td>{r.values.join(", ")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
