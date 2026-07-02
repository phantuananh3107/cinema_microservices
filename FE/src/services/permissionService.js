// Helper function to decode JWT token
function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      Buffer.from(base64, 'base64')
        .toString('binary')
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

// Factory function: returns service object with injected apiClient
function permissionService(apiClient) {
  const service = {
    // Get all roles with their permissions
    getAllRoles: async () => {
      const response = await apiClient.get('/roles');
      return response.data;
    },

    // Get all available permissions
    getAllPermissions: async () => {
      const response = await apiClient.get('/permissions');
      return response.data;
    },

    // Get permissions for a specific role
    getRolePermissions: async (roleId) => {
      const response = await apiClient.get(`/roles/${roleId}/permissions`);
      return response.data;
    },

    // Update permissions for a role (bulk)
    updateRolePermissions: async (roleId, permissionIds) => {
      const response = await apiClient.put(`/roles/${roleId}/permissions`, {
        permission_ids: permissionIds
      });
      return response.data;
    },

    // Assign single permission to role
    assignPermission: async (roleId, permissionId) => {
      const response = await apiClient.post(`/roles/${roleId}/permissions`, {
        permission_id: permissionId
      });
      return response.data;
    },

    // Unassign permission from role
    unassignPermission: async (roleId, permissionId) => {
      const response = await apiClient.delete(`/roles/${roleId}/permissions/${permissionId}`);
      return response.data;
    },

    // Refresh admin user info with latest permissions from database
    refreshAdminUserInfo: async () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

        if (!adminToken || !adminUser.id) {
          console.error('No admin token or user info found');
          return false;
        }

        // Lấy roleId từ adminUser trước, nếu không có mới decode token
        let roleId = adminUser.roleId;
        if (!roleId) {
          const decoded = decodeToken(adminToken);
          roleId = decoded?.roleId;
        }

        if (!roleId) {
          console.error('No roleId found in token or user info');
          return false;
        }

        // Fetch latest permissions for the role
        const rolePermsRes = await service.getRolePermissions(roleId);
        // Kiểm tra cấu trúc trả về từ API (hỗ trợ cả mảng phẳng và mảng object)
        let permissions = [];
        if (Array.isArray(rolePermsRes)) {
          permissions = rolePermsRes;
        } else if (rolePermsRes && rolePermsRes.permissions && Array.isArray(rolePermsRes.permissions)) {
          // Nếu data là object chứa key permissions (như trong test case mock)
          permissions = rolePermsRes.permissions.map(p => typeof p === 'string' ? p : p.code);
        }

        if (permissions.length > 0) {
          // Update adminUser with new permissions
          const updatedAdminUser = {
            ...adminUser,
            permissions: permissions
          };

          // Save to localStorage
          localStorage.setItem('adminUser', JSON.stringify(updatedAdminUser));
          // Dispatch event to notify components
          window.dispatchEvent(new Event('adminUserUpdated'));
          return true;
        }
        return false;
      } catch (error) {
        console.error('Error refreshing admin user info:', error);
        return false;
      }
    }
  };
  return service;
}

module.exports = permissionService;