import { getRepo } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { setUserRole, grantSubscription } from "@/app/actions/admin";
import { DashTitle } from "@/components/dashboard/page-title";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const me = await requireAdmin();
  const repo = getRepo();
  const [profiles, subs, plans] = await Promise.all([repo.listProfiles(), repo.listSubscriptions(), repo.listPlans()]);
  const activeByUser = new Map(subs.filter((s) => s.status === "active" && new Date(s.currentPeriodEnd) > new Date()).map((s) => [s.userId, s]));
  return (
    <>
      <DashTitle eyebrow="Members" title="Users" subtitle="Roles, access and complimentary grants." />
      {error === "self" && <p className="mb-4 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">You can&rsquo;t change your own role.</p>}
      <Table>
        <THead><TR><TH>User</TH><TH>Role</TH><TH>Subscription</TH><TH>Joined</TH><TH>Grant access</TH></TR></THead>
        <TBody>
          {profiles.map((p) => {
            const sub = activeByUser.get(p.id);
            return (
              <TR key={p.id}>
                <TD><div className="font-semibold">{p.displayName}</div><div className="text-xs text-muted">{p.email}</div></TD>
                <TD>
                  {p.id === me.id ? <Badge variant="brand">admin (you)</Badge> : (
                    <form action={setUserRole} className="flex items-center gap-1"><input type="hidden" name="userId" value={p.id} /><Select name="role" defaultValue={p.role} className="h-8 w-auto py-0 text-xs"><option value="member">member</option><option value="admin">admin</option></Select><Button size="sm" variant="ghost" type="submit">Save</Button></form>
                  )}
                </TD>
                <TD>{sub ? <Badge variant="win">{plans.find((x) => x.key === sub.planKey)?.name ?? sub.planKey} · to {formatDate(sub.currentPeriodEnd)}</Badge> : <Badge>none</Badge>}</TD>
                <TD className="text-xs text-muted">{formatDate(p.createdAt)}</TD>
                <TD>
                  <form action={grantSubscription} className="flex flex-wrap items-center gap-1"><input type="hidden" name="userId" value={p.id} /><Select name="planKey" className="h-8 w-auto py-0 text-xs">{plans.map((x) => <option key={x.key} value={x.key}>{x.name}</option>)}</Select><Select name="days" className="h-8 w-auto py-0 text-xs" defaultValue="30"><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></Select><Button size="sm" variant="outline" type="submit">Grant</Button></form>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </>
  );
}
