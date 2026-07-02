import { FaExternalLinkAlt } from 'react-icons/fa'

export default function NewsDetailModal({ news, onClose, formatDate }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-red-400 text-3xl z-10"
        >
          ×
        </button>

        {/* Image */}
        {news.image_url && (
          <div className="relative h-64 overflow-hidden rounded-t-lg">
            <img src={news.image_url} alt={news.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-3 py-1 rounded text-sm font-medium ${
                news.category === 'domestic'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              {news.category === 'domestic' ? 'Trong nước' : 'Quốc tế'}
            </span>
            <span className="text-gray-400 text-sm">{formatDate(news.created_at)}</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">{news.title}</h2>

          <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
            <p className="text-gray-300 text-lg leading-relaxed">{news.summary}</p>
          </div>

          {/* Sources */}
          {news.sources && news.sources.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Nguồn tin</h3>
              <div className="space-y-3">
                {news.sources.map((source) => (
                  <a
                    key={source.id}
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-800/50 p-4 rounded-lg hover:bg-gray-700/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-white font-medium mb-1 group-hover:text-red-400 transition-colors">
                          {source.title}
                        </p>
                        <p className="text-gray-400 text-sm">{source.source}</p>
                      </div>
                      <FaExternalLinkAlt className="text-gray-500 group-hover:text-red-400 transition-colors mt-1" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}