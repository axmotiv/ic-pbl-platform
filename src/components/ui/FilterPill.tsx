interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] ${
        active
          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
          : "glass text-gray-600 hover:bg-white/80 hover:shadow-sm"
      }`}
    >
      {label}
    </button>
  );
}

interface FilterRowProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}

export function FilterRow({ label, options, value, onChange }: FilterRowProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-500 shrink-0 w-10">
        {label}
      </span>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {options.map((opt) => (
          <FilterPill
            key={opt.value}
            label={opt.label}
            active={value === opt.value}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </div>
    </div>
  );
}
