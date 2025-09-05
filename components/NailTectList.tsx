// components/NailTechList.tsx
"use client";

import Skeleton from "./Skeleton";

export type NailTech = { id: number; name: string };

type Props = {
  techs: NailTech[];
  loading?: boolean;
  onView: (id: number) => void;
  className?: string;
};

export default function NailTechList({
  techs,
  loading = false,
  onView,
  className,
}: Props) {
  const skeletonCount = loading ? Math.max(techs.length, 2) : 0;

  const placeholderRows = Array.from({ length: skeletonCount }).map((_, i) => (
    <tr key={`nt-sk-${i}`} className="border-b border-gray-200">
      <td className="p-3">
        <Skeleton className="h-6 w-40 skeleton-shimmer" />
      </td>
      <td className="p-3 text-right">
        <Skeleton className="h-6 w-20 skeleton-shimmer" />
      </td>
    </tr>
  ));

  return (
    <div
      className={className ?? "bg-white rounded-xl overflow-x-auto shadow-lg/5"}
    >
      <table className="w-full text-sm">
        <thead className="bg-violet-100 border-b border-b-violet-200">
          <tr>
            <th className="text-left p-3 text-gray-700">Nail Tech</th>
            <th className="text-right p-3 text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            placeholderRows
          ) : techs.length === 0 ? (
            <tr>
              <td className="p-3" colSpan={2}>
                No nail techs yet.
              </td>
            </tr>
          ) : (
            techs.map((t) => (
              <tr key={t.id} className="border-b border-gray-200">
                <td className="p-3">{t.name}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => onView(t.id)}
                    className="text-violet-600 hover:underline"
                  >
                    View details
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
