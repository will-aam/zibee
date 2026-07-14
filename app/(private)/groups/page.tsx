// app/(private)/groups/page.tsx
"use client";

import PaywallView from "./_components/PaywallView";
import GroupManagerView from "./_components/GroupManagerView";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export default function GroupsPage() {
  const { hasPremiumAccess } = useWorkspace();
  return (
    <div className="p-4 pt-8 pb-24 md:pb-8">
      {hasPremiumAccess ? <GroupManagerView /> : <PaywallView />}
    </div>
  );
}
