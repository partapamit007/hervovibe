"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const rankColors: Record<string, string> = {
  DISTRIBUTOR:  "bg-gray-100 text-gray-600 border-gray-300",
  BRONZE:       "bg-amber-100 text-amber-700 border-amber-300",
  SILVER:       "bg-slate-100 text-slate-700 border-slate-300",
  GOLDEN:       "bg-yellow-100 text-yellow-700 border-yellow-300",
  DIAMOND:      "bg-blue-100 text-blue-700 border-blue-300",
  SUPER_DIAMOND:"bg-blue-200 text-blue-800 border-blue-400",
  PLATINUM:     "bg-purple-100 text-purple-700 border-purple-300",
  CENTENNIAL:   "bg-green-100 text-green-700 border-green-300",
};

function TreeNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children?.length > 0;

  return (
    <div className={`${depth > 0 ? "ml-6 border-l-2 border-gray-200 pl-4" : ""} mt-2`}>
      <div className="flex items-center gap-2 group">
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-xs text-gray-600 shrink-0"
          >
            {expanded ? "−" : "+"}
          </button>
        )}
        {!hasChildren && <div className="w-5 shrink-0" />}

        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${rankColors[node.rank]} flex-1 min-w-0`}>
          <div className="w-7 h-7 rounded-full bg-white bg-opacity-60 flex items-center justify-center font-bold text-xs shrink-0">
            {node.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{node.name}</p>
            <p className="text-xs opacity-70">{node.memberId}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={`text-xs ${rankColors[node.rank]}`}>{node.rank.replace(/_/g, " ")}</Badge>
            {node.status !== "ACTIVE" && (
              <Badge className="text-xs bg-red-100 text-red-600">INACTIVE</Badge>
            )}
            <div className="flex gap-0.5" title={`${node.children?.length || 0} direct members (min 5 required)`}>
              {[0,1,2,3,4].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full border ${i < (node.children?.length || 0) ? "bg-current border-current opacity-70" : "border-current opacity-25"}`} />
              ))}
              {(node.children?.length || 0) > 5 && (
                <div className="w-2 h-2 rounded-full bg-blue-400 border border-blue-400" title="Extra beyond 5 minimum" />
              )}
            </div>
          </div>
          <Link
            href={`/admin/members/${node.id}`}
            className="text-xs text-blue-600 hover:text-blue-800 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            View →
          </Link>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreePage() {
  const [trees, setTrees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/members/tree")
      .then(r => r.json())
      .then(d => { setTrees(d); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading tree...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">MLM Tree</h1>
        <p className="text-gray-500 text-sm">Click + / − to expand or collapse branches. Hover a member to view details.</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 text-xs">
        {Object.entries(rankColors).map(([rank, cls]) => (
          <span key={rank} className={`px-2 py-1 rounded border ${cls}`}>{rank.replace(/_/g, " ")}</span>
        ))}
      </div>

      {trees.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No members in tree yet</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
          {trees.map((tree: any) => (
            <TreeNode key={tree.id} node={tree} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
