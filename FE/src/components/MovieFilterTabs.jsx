export default function MovieFilterTabs({ filters, selectedFilter, onChange }) {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      {filters.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
            selectedFilter === f.value
              ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-500/50'
              : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}