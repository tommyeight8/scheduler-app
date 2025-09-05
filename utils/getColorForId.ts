export default function getColorForId(id: number | string): string {
  const colors = [
    "bg-amber-200 text-amber-800",
    "bg-rose-200 text-rose-800",
    "bg-blue-200 text-blue-800",
    "bg-green-200 text-green-800",
    "bg-orange-200 text-orange-800",
    "bg-teal-200 text-teal-800",
    "bg-purple-200 text-purple-800",
    "bg-pink-200 text-pink-800",
    "bg-cyan-200 text-cyan-800",
    "bg-lime-200 text-lime-800",
    "bg-fuchsia-200 text-fuchsia-800",
    "bg-violet-200 text-violet-800",
    "bg-indigo-200 text-indigo-800",
    "bg-red-200 text-red-800",
    "bg-yellow-200 text-yellow-800",
    "bg-emerald-200 text-emerald-800",
    "bg-sky-200 text-sky-800",
  ];

  // If it's a number, just mod it
  if (typeof id === "number") {
    return colors[id % colors.length];
  }

  // If it's a string, hash it into a number
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0; // keep in 32-bit range
  }

  return colors[Math.abs(hash) % colors.length];
}
