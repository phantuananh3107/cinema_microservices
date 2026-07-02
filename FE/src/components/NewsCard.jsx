import { FaNewspaper } from 'react-icons/fa'

export default function NewsCard({ item, onClick, formatDate }) {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      role="button"
      tabIndex={0}
      className="bg-gray-800/50 backdrop-blur-sm rounded-lg overflow-hidden hover:shadow-xl hover:shadow-red-500/20 transition-all duration-300 cursor-pointer group"
    >
      {/* Image */}
      {item.image_url ? (
        <div className="relative h-48 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-br from-red-900/30 to-purple-900/30 flex items-center justify-center">
          <FaNewspaper className="text-gray-600 text-5xl" />
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              item.category === 'domestic'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-purple-500/20 text-purple-400'
            }`}
          >
            {item.category === 'domestic' ? 'Trong nước' : 'Quốc tế'}
          </span>
          <span className="text-gray-500 text-xs">{formatDate(item.created_at)}</span>
        </div>

        <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
          {item.title}
        </h3>

        <p className="text-gray-400 text-sm line-clamp-3">{item.summary}</p>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.tags.slice(0, 3).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}