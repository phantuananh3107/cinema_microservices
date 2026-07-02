import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ChatBot from './components/ChatBot'
import NotificationComponent from './components/NotificationComponent'
import AppRouter from './routes/AppRouter'
import websocketService from './services/websocketService'

function App() {
  const location = useLocation()
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken'))

  useEffect(() => {
    const onStorage = () => {
      setToken(localStorage.getItem('token'))
      setAdminToken(localStorage.getItem('adminToken'))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const handler = () => {
      setToken(localStorage.getItem('token'))
      setAdminToken(localStorage.getItem('adminToken'))
    }
    window.addEventListener('tokenChange', handler)
    return () => window.removeEventListener('tokenChange', handler)
  }, [])

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (token && user) {
      try {
        const userData = JSON.parse(user)
        if (userData.id) {
          websocketService.connect(userData.id.toString())
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    } else {
      websocketService.disconnect()
    }

    return () => {
      websocketService.disconnect()
    }
  }, [token])

  const shouldShowChatbot = !['/login', '/register', '/admin/login', '/verify'].includes(
    location.pathname
  )

  return (
    <>
      <AppRouter
        token={token}
        setToken={setToken}
        adminToken={adminToken}
        setAdminToken={setAdminToken}
      />
      {shouldShowChatbot && <ChatBot />}
      {token && <NotificationComponent />}
    </>
  )
}

export default App
