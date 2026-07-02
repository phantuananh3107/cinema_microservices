export default function CategoryFilter({ categories, selectedCategory, onChange }) {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      {categories.map((category) => {
        const Icon = category.icon
        return (
          <button
            key={category.value}
            type="button"
            onClick={() => onChange(category.value)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
              selectedCategory === category.value
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white shadow-lg shadow-red-500/50'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <Icon />
            {category.label}
          </button>
        )
      })}
    </div>
  )
}