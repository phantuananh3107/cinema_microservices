class WebSocketService {
  constructor() {
    this.ws = null
    this.url = process.env.REACT_APP_WS_URL || 'ws://localhost:80/ws/v1/notifications'
    this.userId = null
    this.requestId = 1
    this.isConnecting = false
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectTimeout = null
    this.messageHandlers = new Map()
    this.notificationCallbacks = []
  }

  connect(userId) {
    if (this.isConnecting || this.isConnected) {
      return
    }

    this.userId = userId
    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        this.isConnecting = false
        this.isConnected = true
        this.reconnectAttempts = 0

        this.subscribeToNotifications(userId)
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        this.isConnected = false
        this.isConnecting = false

        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting = false
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.connect(this.userId)
    }, delay)
  }

  subscribeToNotifications(userId) {
    if (!this.isConnected || !userId) {
      return
    }

    const message = {
      id: this.requestId++,
      method: 'NOTIFICATION',
      params: {
        userId: userId,
      },
    }

    this.sendMessage(message)
  }

  sendMessage(message) {
    if (!this.isConnected || !this.ws) {
      return
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('Error sending WebSocket message:', error)
    }
  }

  handleMessage(message) {
    if (message.id && this.messageHandlers.has(message.id)) {
      const handler = this.messageHandlers.get(message.id)
      handler(message)
      this.messageHandlers.delete(message.id)
    }

    if (message.result) {
      try {
        const result =
          typeof message.result === 'string' ? JSON.parse(message.result) : message.result

        if (
          result.status === 'notification sent' ||
          result.status === 'sent' ||
          result.type === 'booking_notification' ||
          result.type === 'notification'
        ) {
          this.notificationCallbacks.forEach((callback) => {
            try {
              callback(result)
            } catch (error) {
              console.error('Error in notification callback:', error)
            }
          })
        }
      } catch (error) {
        console.error('Error processing notification message:', error)
      }
    }
  }

  onNotification(callback) {
    if (typeof callback === 'function') {
      this.notificationCallbacks.push(callback)
    }
  }

  removeNotificationListener(callback) {
    const index = this.notificationCallbacks.indexOf(callback)
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1)
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.notificationCallbacks = []
    this.messageHandlers.clear()

    if (this.ws) {
      this.ws.close(1000, 'Normal closure')
      this.ws = null
    }

    this.isConnected = false
    this.isConnecting = false
    this.userId = null
    this.reconnectAttempts = 0
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
    }
  }
}

const websocketService = new WebSocketService()

export default websocketService
