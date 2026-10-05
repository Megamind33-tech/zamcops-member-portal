// A distribution run stops accepting changes once it is Published (members can
// see it) or Closed (Done). Returns the reason to show staff, or "" if open.
export function lockReason(d: { status: string; closedAt?: Date | string | null }): string {
  if (d.status === "Published") return "This distribution is published. Unpublish it before changing allocations.";
  if (d.closedAt) return "This distribution is closed (Done). Reopen it before changing allocations.";
  return "";
}
