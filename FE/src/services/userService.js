import axios from 'axios'

const API_URL = process.env.REACT_APP_USER_API_URL || 'http://localhost:8000/api/v1'

const userApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// userApi.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token')
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error) => {
//     return Promise.reject(error)
//   },
// )

export const userService = {
  getUserById: async (id) => {
    try {
      const response = await userApi.get(`/users/${id}`)
      return response.data
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error)
      throw error
    }
  },

  updateUser: async (id, userData) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken')
      const response = await userApi.put(`/users/${id}`, userData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      return response.data
    } catch (error) {
      console.error(`Error updating user ${id}:`, error)
      throw error
    }
  },

  getAllUsers: async (page = 1, size = 10, role = '', search = '') => {
    try {
      const adminToken = localStorage.getItem('adminToken')
      const config = {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }

      let url = `/users/admin/users?page=${page}&size=${size}`
      if (role) {
        url += `&role=${encodeURIComponent(role)}`
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }

      const response = await userApi.get(url, config)
      return response.data
    } catch (error) {
      console.error('Error fetching all users:', error)
      throw error
    }
  },

  getAllStaffs: async (page = 1, size = 10, role = '', search = '') => {
    try {
      const adminToken = localStorage.getItem('adminToken')
      const config = {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      }

      let url = `/users/admin/staffs?page=${page}&size=${size}`
      if (role) {
        url += `&role=${encodeURIComponent(role)}`
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`
      }

      const response = await userApi.get(url, config)
      return response.data
    } catch (error) {
      console.error('Error fetching all staffs:', error)
      throw error
    }
  },

  // Create staff member (admin only) - via auth service
  createStaff: async (staffData) => {
    try {
      const adminToken = localStorage.getItem('adminToken')
      const response = await axios.post(
        `${API_URL}/auth/staff`,
        staffData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
      )
      return response.data
    } catch (error) {
      console.error('Error creating staff:', error)
      throw error
    }
  },

  // Delete user by ID (admin only)
  deleteUser: async (id) => {
    try {
      const adminToken = localStorage.getItem('adminToken')
      const response = await userApi.delete(`/users/${id}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      return response.data
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error)
      throw error
    }
  },

  getRoles: () => [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'customer', label: 'Khách hàng' },
    { value: 'ticket_staff', label: 'Nhân viên bán vé' },
    { value: 'manager_staff', label: 'Quản lý rạp' },
    { value: 'admin', label: 'Quản trị viên' },
  ],

  getStaffRoles: () => [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'ticket_staff', label: 'Nhân viên bán vé' },
    { value: 'manager_staff', label: 'Quản lý rạp' },
    { value: 'admin', label: 'Quản trị viên' },
  ],
}

export const { getUserById, updateUser, getAllUsers, createStaff, deleteUser } = userService

export default userService
