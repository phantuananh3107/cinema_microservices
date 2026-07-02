import { useEffect, useState } from 'react'
import { FaSave, FaUndo } from 'react-icons/fa'
import AdminLayout from '../../components/admin/AdminLayout'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { permissionService, refreshAdminUserInfo } from '../../services/permissionService'

const PermissionManagementPage = () => {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState({}) // { roleId: [permissionIds] }
  const [originalPermissions, setOriginalPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const [rolesRes, permissionsRes] = await Promise.all([
        permissionService.getAllRoles(),
        permissionService.getAllPermissions()
      ])

      if (!rolesRes.success || !permissionsRes.success) {
        setError('Failed to load data')
        return
      }

      setRoles(rolesRes.data || [])
      setPermissions(permissionsRes.data || [])

      // Fetch permissions for each role
      const rolePermsMap = {}
      for (const role of rolesRes.data || []) {
        const rolePermsRes = await permissionService.getRolePermissions(role.id)
        if (rolePermsRes.success && rolePermsRes.data) {
          rolePermsMap[role.id] = (rolePermsRes.data.permissions || []).map(p => p.id)
        }
      }

      setRolePermissions(rolePermsMap)
      setOriginalPermissions(JSON.parse(JSON.stringify(rolePermsMap)))
    } catch (err) {
      setError('Error loading data: ' + err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (roleId, permissionId) => {
    setRolePermissions(prev => {
      const current = prev[roleId] || []
      const hasPermission = current.includes(permissionId)

      return {
        ...prev,
        [roleId]: hasPermission
          ? current.filter(id => id !== permissionId)
          : [...current, permissionId]
      }
    })
  }

  const hasChanges = () => {
    return JSON.stringify(rolePermissions) !== JSON.stringify(originalPermissions)
  }

  const handleSave = async () => {
    if (!hasChanges()) {
      setSuccessMessage('No changes to save')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccessMessage('')

      // Update permissions for each role that changed
      for (const roleId in rolePermissions) {
        const original = originalPermissions[roleId] || []
        const current = rolePermissions[roleId] || []

        if (JSON.stringify(original.sort()) !== JSON.stringify(current.sort())) {
          await permissionService.updateRolePermissions(roleId, current)
        }
      }

      setSuccessMessage('Permissions updated successfully! Refreshing user info...')
      setOriginalPermissions(JSON.parse(JSON.stringify(rolePermissions)))

      // Refresh admin user info in localStorage with latest permissions
      const refreshed = await refreshAdminUserInfo()
      if (refreshed) {
        setSuccessMessage('Permissions updated successfully! User info refreshed.')
        // Reload page to reflect changes in menu
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setSuccessMessage('Permissions updated successfully! Please refresh the page to see changes.')
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      setError('Error saving permissions: ' + (err.response?.data?.message || err.message))
      console.error('Error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setRolePermissions(JSON.parse(JSON.stringify(originalPermissions)))
    setError('')
    setSuccessMessage('')
  }

  const getRoleName = (roleName) => {
    const roleMap = {
      'admin': 'Admin',
      'manager_staff': 'Manager Staff',
      'ticket_staff': 'Ticket Staff',
      'customer': 'Customer'
    }
    return roleMap[roleName] || roleName
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quản lý phân quyền</h1>
            <p className="mt-2 text-gray-600">
              Gán và bỏ gán quyền cho từng vai trò
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={!hasChanges() || saving}
            >
              <FaUndo className="mr-2" />
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges() || saving}
            >
              <FaSave className="mr-2" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Permission Matrix */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Vai trò
                  </th>
                  {permissions.map(permission => (
                    <th
                      key={permission.id}
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={{ minWidth: '140px' }}
                    >
                      <div className="flex flex-col items-center">
                        <span>{permission.name}</span>
                        <span className="text-xs text-gray-400 font-normal normal-case mt-1">
                          {permission.code}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {getRoleName(role.name)}
                        </span>
                        <span className="text-xs text-gray-500">{role.description}</span>
                      </div>
                    </td>
                    {permissions.map(permission => {
                      const hasPermission = (rolePermissions[role.id] || []).includes(permission.id)
                      return (
                        <td key={permission.id} className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={hasPermission}
                            onChange={() => togglePermission(role.id, permission.id)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Legend */}
        <Card>
          <h3 className="text-lg font-semibold mb-3">Hướng dẫn</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
            <li>Tích chọn ô để gán quyền cho vai trò</li>
            <li>Bỏ tích để gỡ quyền khỏi vai trò</li>
            <li>Nhấn "Lưu thay đổi" để áp dụng các thay đổi</li>
            <li>Trang sẽ tự động reload sau khi lưu để cập nhật menu</li>
          </ul>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default PermissionManagementPage
