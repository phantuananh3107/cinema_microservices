export default function StatusBadge({ status, colorMap = {} }) {
  const defaultColorMap = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-600/20 text-green-400',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-green-100 text-green-800',
  }

  const colors = { ...defaultColorMap, ...colorMap }
  const statusColor = colors[status] || 'bg-gray-100 text-gray-800'

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}