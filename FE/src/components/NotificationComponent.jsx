import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import websocketService from '../services/websocketService'
import Toast from './Toast'

const NotificationComponent = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, setToast] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState(websocketService.getConnectionStatus())

  useEffect(() => {
    // Update connection status periodically
    const statusInterval = setInterval(() => {
      setConnectionStatus(websocketService.getConnectionStatus())
    }, 1000)

    // Listen for notifications
    const handleNotification = (notification) => {
      console.log('=== RECEIVED NOTIFICATION ===')
      console.log('Full notification object:', JSON.stringify(notification, null, 2))
      console.log('notification.type:', notification.type)
      console.log('notification.data:', notification.data)
      console.log('Current pathname:', location.pathname)

      // Extract data from notification
      let title = 'New Notification'
      let message = 'You have a new notification'
      let type = notification.type || 'notification'

      if (notification.type === 'booking_notification' && notification.data) {
        console.log('✓ This is a booking_notification')
        const nestedData = notification.data.Data || notification.data
        console.log('notification.data.Data?.status:', nestedData.status)
        console.log('notification.data.Data?.booking_id:', nestedData.booking_id)

        title = nestedData.title || 'Booking Update'
        message = nestedData.message || 'Your booking has been updated'

        const isCompleted = nestedData.status === 'COMPLETED'
        const hasBookingId = !!nestedData.booking_id
        const isOnPaymentPage = location.pathname.includes('/payment')

        console.log('Redirect check:')
        console.log('  - isCompleted:', isCompleted)
        console.log('  - hasBookingId:', hasBookingId)
        console.log('  - isOnPaymentPage:', isOnPaymentPage)

        if (isCompleted && hasBookingId && isOnPaymentPage) {
          console.log('✓✓✓ ALL CONDITIONS MET - REDIRECTING TO SUCCESS PAGE')
          setToast({
            message: 'Payment successful! Redirecting to success page...',
            type: 'success'
          })

          setTimeout(() => {
            console.log('Navigating to:', `/booking-success?bookingId=${nestedData.booking_id}`)
            navigate(`/booking-success?bookingId=${nestedData.booking_id}`)
          }, 2000)
          return
        }
      }

      setToast({
        message: message,
        type: notification.type === 'booking_notification' ? 'success' : 'info'
      })
    }

    websocketService.onNotification(handleNotification)

    return () => {
      clearInterval(statusInterval)
      websocketService.removeNotificationListener(handleNotification)
    }
  }, [location.pathname, navigate])

  const closeToast = () => {
    setToast(null)
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </>
  )
}

export default NotificationComponent
