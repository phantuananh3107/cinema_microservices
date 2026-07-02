import { Link } from 'react-router-dom'
import { FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer className="bg-black py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Branding */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HQ</span>
              </div>
              <span className="text-white font-bold text-lg">Cinema</span>
            </div>
            <p className="text-gray-400 text-sm">
              Hệ thống rạp chiếu phim hàng đầu Việt Nam, mang đến trải nghiệm điện ảnh tuyệt vời
              nhất.
            </p>
          </div>

          {/* Phim */}
          <div>
            <h4 className="text-white font-semibold mb-4">Phim</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Phim đang chiếu
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Phim sắp chiếu
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Suất chiếu đặc biệt
                </Link>
              </li>
            </ul>
          </div>

          {/* Rạp HQ Cinema */}
          <div>
            <h4 className="text-white font-semibold mb-4">Rạp HQ Cinema</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Tất cả các rạp
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Rạp đặc biệt
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Sự kiện
                </Link>
              </li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="text-white font-semibold mb-4">Hỗ trợ</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link to="#" className="hover:text-red-400 transition-colors duration-300">
                  Chính sách
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Google Maps & Contact Section */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Liên hệ với chúng tôi</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 text-gray-400 text-sm">
                <FaMapMarkerAlt className="text-red-500 mt-1 flex-shrink-0" />
                <p>Học viện Công nghệ Bưu chính Viễn thông, Hà Đông, Hà Nội, Việt Nam</p>
              </div>
              <div className="flex items-center space-x-3 text-gray-400 text-sm">
                <FaPhone className="text-red-500 flex-shrink-0" />
                <p>0376948xxx</p>
              </div>
              <div className="flex items-center space-x-3 text-gray-400 text-sm">
                <FaEnvelope className="text-red-500 flex-shrink-0" />
                <p>quangnguyenngoc314@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Google Maps */}
          <div>
            <h4 className="text-white font-semibold mb-4">Vị trí của chúng tôi</h4>
            <div className="w-full h-64 rounded-lg overflow-hidden shadow-lg">
              <iframe
                title="HQ Cinema Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3725.2924152608275!2d105.78343258420095!3d20.980912420890213!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135accdd8a1ad71%3A0xa2f9b16036648187!2zSOG7jWMgdmnhu4duIEPDtG5nIG5naOG7hyBCxrB1IGNow61uaCB2aeG7hW4gdGjDtG5n!5e0!3m2!1svi!2sus!4v1766293728448!5m2!1svi!2sus"
                width="100%"
                height="100%"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="border-0 grayscale-[30%] contrast-[120%]"
              />
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">© 2025 HQ Cinema. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}