import { FaArrowLeft } from 'react-icons/fa'

export default function PageHeader({ title, subtitle, onBack, icon: Icon, actions }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg"
          >
            <FaArrowLeft size={20} />
          </button>
        )}
        {Icon && <Icon size={32} className="text-blue-600" />}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}