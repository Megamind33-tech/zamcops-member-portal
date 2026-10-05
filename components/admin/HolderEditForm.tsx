"use client";

import React, { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "./widgets";

type Name = { id: string; name: string; firstName: string; nameType: string; ipiNameNumber: string };
type Address = { line1: string; line2: string; line3: string; city: string; province: string; postcode: string; country: string; addressType: string };
type Contact = { contactType: string; value: string; email: string; phone: string; contactName: string };
export type HolderForEdit = {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  kind: string;
  sex: string;
  birthDate: string;
  deathDate: string;
  status: string;
  region: string;
  nextOfKin: string;
  spouse: string;
  nrc: string;
  ipiNumber: string;
  ipiBaseNumber: string;
  names: Name[];
  addresses: Address[];
  contacts: Contact[];
};

const Lbl = ({ children }: { children: React.ReactNode }) => <span className="mb-1 block text-[11px] font-semibold text-zam-muted">{children}</span>;
const small = "field-input h-8 w-full";

// Edit a right-holder's record: identity, names, addresses and contacts. Saves
// in one PATCH; the page reloads the record on success.
export function HolderEditForm({ holder, onSaved, onCancel }: { holder: HolderForEdit; onSaved: () => void; onCancel: () => void }) {
  const [f, setF] = useState({
    displayName: holder.displayName,
    firstName: holder.firstName,
    lastName: holder.lastName,
    kind: holder.kind || "Person",
    sex: holder.sex,
    birthDate: holder.birthDate,
    deathDate: holder.deathDate,
    status: holder.status,
    region: holder.region,
    nextOfKin: holder.nextOfKin,
    spouse: holder.spouse,
    nrc: holder.nrc,
    ipiNumber: holder.ipiNumber,
    ipiBaseNumber: holder.ipiBaseNumber,
  });
  const [names, setNames] = useState<Name[]>(holder.names);
  const [addresses, setAddresses] = useState<Address[]>(holder.addresses);
  const [contacts, setContacts] = useState<Contact[]>(holder.contacts);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const save = async () => {
    if (!f.displayName.trim()) return toast.error("A right-holder needs a name.");
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/register/holders/${holder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, names, addresses, contacts }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error ?? "Could not save.");
      toast.success("Right-holder saved.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const text = (k: keyof typeof f, label: string, cls = "") => (
    <label className={"block " + cls}>
      <Lbl>{label}</Lbl>
      <input value={f[k]} onChange={(e) => set(k, e.target.value)} className={small} />
    </label>
  );
  const setName = (i: number, patch: Partial<Name>) => setNames(names.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setAddr = (i: number, patch: Partial<Address>) => setAddresses(addresses.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setContact = (i: number, patch: Partial<Contact>) => setContacts(contacts.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="space-y-3">
      <Panel title="Edit identity">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {text("displayName", "Name", "sm:col-span-2")}
          {text("firstName", "First name")}
          {text("lastName", "Last name")}
          <label className="block">
            <Lbl>Type</Lbl>
            <select value={f.kind} onChange={(e) => set("kind", e.target.value)} className={small + " appearance-none bg-white"}>
              <option>Person</option>
              <option>Legal entity</option>
            </select>
          </label>
          {text("sex", "Sex")}
          <label className="block">
            <Lbl>Born / founded</Lbl>
            <input type="date" value={f.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={small} />
          </label>
          <label className="block">
            <Lbl>Died</Lbl>
            <input type="date" value={f.deathDate} onChange={(e) => set("deathDate", e.target.value)} className={small} />
          </label>
          {text("status", "Status")}
          {text("region", "Region")}
          {text("nrc", "NRC / ID")}
          {text("ipiNumber", "IPI name number")}
          {text("ipiBaseNumber", "IPI base number")}
          {text("nextOfKin", "Next of kin", "sm:col-span-2")}
          {text("spouse", "Spouse", "sm:col-span-2")}
        </div>
      </Panel>

      <Panel title={`Names (${names.length})`}>
        <div className="space-y-2 p-4">
          {names.map((n, i) => (
            <div key={n.id || i} className="grid grid-cols-12 gap-2">
              <input value={n.firstName} onChange={(e) => setName(i, { firstName: e.target.value })} placeholder="First name" className={small + " col-span-3"} />
              <input value={n.name} onChange={(e) => setName(i, { name: e.target.value })} placeholder="Last / company name" className={small + " col-span-4"} />
              <input value={n.nameType} onChange={(e) => setName(i, { nameType: e.target.value })} placeholder="Type (e.g. PA, PG)" className={small + " col-span-2"} />
              <input value={n.ipiNameNumber} onChange={(e) => setName(i, { ipiNameNumber: e.target.value })} placeholder="IPI name no." className={small + " col-span-3 font-mono"} />
            </div>
          ))}
          <button type="button" onClick={() => setNames([...names, { id: "", name: "", firstName: "", nameType: "", ipiNameNumber: "" }])} className="inline-flex items-center gap-1 text-[13px] font-semibold text-zam-orange">
            <Plus size={13} /> Add a name
          </button>
          <p className="text-[11px] text-zam-muted">Names can be amended or added here. They are not removed, because works and distributions refer to them.</p>
        </div>
      </Panel>

      <Panel title={`Addresses (${addresses.length})`}>
        <div className="space-y-2 p-4">
          {addresses.map((a, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input value={a.line1} onChange={(e) => setAddr(i, { line1: e.target.value })} placeholder="Address line 1" className={small + " col-span-4"} />
              <input value={a.line2} onChange={(e) => setAddr(i, { line2: e.target.value })} placeholder="Line 2" className={small + " col-span-3"} />
              <input value={a.city} onChange={(e) => setAddr(i, { city: e.target.value })} placeholder="City / town" className={small + " col-span-2"} />
              <input value={a.province} onChange={(e) => setAddr(i, { province: e.target.value })} placeholder="Province" className={small + " col-span-2"} />
              <button type="button" onClick={() => setAddresses(addresses.filter((_, j) => j !== i))} aria-label="Remove address" className="col-span-1 grid h-8 place-items-center text-zam-muted hover:text-zam-red">
                <Trash2 size={14} />
              </button>
              <input value={a.postcode} onChange={(e) => setAddr(i, { postcode: e.target.value })} placeholder="Postcode" className={small + " col-span-2"} />
              <input value={a.country} onChange={(e) => setAddr(i, { country: e.target.value })} placeholder="Country" className={small + " col-span-3"} />
              <input value={a.addressType} onChange={(e) => setAddr(i, { addressType: e.target.value })} placeholder="Type (home, postal…)" className={small + " col-span-3"} />
            </div>
          ))}
          <button type="button" onClick={() => setAddresses([...addresses, { line1: "", line2: "", line3: "", city: "", province: "", postcode: "", country: "", addressType: "" }])} className="inline-flex items-center gap-1 text-[13px] font-semibold text-zam-orange">
            <Plus size={13} /> Add an address
          </button>
        </div>
      </Panel>

      <Panel title={`Contacts (${contacts.length})`}>
        <div className="space-y-2 p-4">
          {contacts.map((c, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input value={c.contactName} onChange={(e) => setContact(i, { contactName: e.target.value })} placeholder="Contact name" className={small + " col-span-3"} />
              <input value={c.email} onChange={(e) => setContact(i, { email: e.target.value })} placeholder="Email" className={small + " col-span-4"} />
              <input value={c.phone} onChange={(e) => setContact(i, { phone: e.target.value })} placeholder="Phone" className={small + " col-span-3"} />
              <input value={c.contactType} onChange={(e) => setContact(i, { contactType: e.target.value })} placeholder="Type" className={small + " col-span-1"} />
              <button type="button" onClick={() => setContacts(contacts.filter((_, j) => j !== i))} aria-label="Remove contact" className="col-span-1 grid h-8 place-items-center text-zam-muted hover:text-zam-red">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setContacts([...contacts, { contactType: "", value: "", email: "", phone: "", contactName: "" }])} className="inline-flex items-center gap-1 text-[13px] font-semibold text-zam-orange">
            <Plus size={13} /> Add a contact
          </button>
        </div>
      </Panel>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-zam-orange px-4 text-[13px] font-semibold text-white disabled:opacity-50">
          <Save size={13} /> {saving ? "Saving…" : "Save changes"}
        </button>
        <button onClick={onCancel} disabled={saving} className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-white px-4 text-[13px] font-semibold text-zam-ink ring-1 ring-[#bfc5ce]">
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
