const stats = [
  { value: "500+", label: "Graduates" },
  { value: "5", label: "Expert Instructors" },
  { value: "6 Weeks", label: "Intensive Bootcamp" },
  { value: "92%", label: "Employment Rate" },
];

export function StatsBar() {
  return (
    <div className="grid gap-5 rounded-[28px] bg-white p-8 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="font-display text-3xl font-bold text-deep-blue">{stat.value}</p>
          <p className="mt-2 text-sm uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
