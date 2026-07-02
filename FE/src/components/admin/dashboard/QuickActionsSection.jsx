import { useNavigate } from 'react-router-dom'

export default function QuickActionsSection() {
  const navigate = useNavigate()

  const actions = [
    {
      label: 'View All Movies',
      path: '/admin/movies',
      bgClass: 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800',
    },
    {
      label: 'Add New Movie',
      path: '/admin/movies/new',
      bgClass: 'bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800',
    },
    {
      label: 'Revenue Analytics',
      path: '/admin/revenue',
      bgClass: 'bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800',
    },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Quick Actions
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className={`${action.bgClass} text-white px-5 py-4 rounded-lg text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
