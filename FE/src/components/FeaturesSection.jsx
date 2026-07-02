import { FaTicketAlt, FaMapMarkerAlt, FaStar } from 'react-icons/fa'

export default function FeaturesSection() {
  const features = [
    {
      icon: FaTicketAlt,
      title: 'Đặt vé dễ dàng',
      description: 'Đặt vé online nhanh chóng, tiện lợi với nhiều phương thức thanh toán',
    },
    {
      icon: FaMapMarkerAlt,
      title: 'Hệ thống rạp rộng khắp',
      description: 'Hơn 100 rạp chiếu phim trên toàn quốc với trang thiết bị hiện đại',
    },
    {
      icon: FaStar,
      title: 'Chất lượng cao cấp',
      description: 'Âm thanh Dolby Atmos, hình ảnh 4DX mang đến trải nghiệm điện ảnh tuyệt vời',
    },
  ]

  return (
    <section className="py-16 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Tại sao chọn HQ Cinema?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="text-white text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}