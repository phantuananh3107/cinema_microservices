/**
 * @jest-environment jsdom
 */
const permissionService = require('./permissionService');

describe('permissionService', () => {
  // TC-FE-PERM-024: Kiểm tra getRolePermissions gọi đúng endpoint lấy quyền theo role
  test('TC-FE-PERM-024: getRolePermissions gọi đúng endpoint', async () => {
    // Mục tiêu: Đảm bảo gọi đúng API lấy quyền theo role
    const apiClient = { get: jest.fn().mockResolvedValue({ data: ['user.read', 'user.update'] }) };
    const service = permissionService(apiClient);
    const result = await service.getRolePermissions('r1');
    expect(apiClient.get).toHaveBeenCalledWith('/roles/r1/permissions');
    expect(result).toEqual(['user.read', 'user.update']);
  });

  // TC-FE-PERM-025: Kiểm tra refreshAdminUserInfo cập nhật lại localStorage và phát event khi lấy được quyền mới thành công
  test('TC-FE-PERM-025: refreshAdminUserInfo cập nhật localStorage và phát event', async () => {
    // Mục tiêu: Đồng bộ quyền sau khi quản trị chỉnh permission
    const apiClient = {
      get: jest.fn().mockResolvedValue({ success: true, data: { permissions: [{ code: 'user.read' }, { code: 'user.update' }] } })
    };
    const service = permissionService(apiClient);
    window.localStorage.setItem('adminToken', 'token');
    window.localStorage.setItem('adminUser', JSON.stringify({ id: 1, roleId: 'r1', permissions: [] }));
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');
    const result = await service.refreshAdminUserInfo();
    expect(result).toBe(true);
    const adminUser = JSON.parse(window.localStorage.getItem('adminUser'));
    expect(adminUser.permissions).toEqual(['user.read', 'user.update']);
    expect(dispatchEventSpy).toHaveBeenCalled();
    dispatchEventSpy.mockRestore();
  });

  // TC-FE-PERM-026: getAllRoles trả về mảng role
  test('TC-FE-PERM-026: getAllRoles trả về mảng role', async () => {
    const apiClient = { get: jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Admin' }] }) };
    const service = require('./permissionService')(apiClient);
    const result = await service.getAllRoles();
    expect(result).toEqual([{ id: 1, name: 'Admin' }]);
  });

  // TC-FE-PERM-027: getAllPermissions trả về mảng permission
  test('TC-FE-PERM-027: getAllPermissions trả về mảng permission', async () => {
    const apiClient = { get: jest.fn().mockResolvedValue({ data: [{ id: 1, code: 'user.read' }] }) };
    const service = require('./permissionService')(apiClient);
    const result = await service.getAllPermissions();
    expect(result).toEqual([{ id: 1, code: 'user.read' }]);
  });

  // TC-FE-PERM-028: updateRolePermissions trả về data đúng
  test('TC-FE-PERM-028: updateRolePermissions trả về data đúng', async () => {
    const apiClient = { put: jest.fn().mockResolvedValue({ data: 'ok' }) };
    const service = require('./permissionService')(apiClient);
    const result = await service.updateRolePermissions('r1', [1,2]);
    expect(result).toBe('ok');
  });

  // TC-FE-PERM-029: assignPermission trả về data đúng
  test('TC-FE-PERM-029: assignPermission trả về data đúng', async () => {
    const apiClient = { post: jest.fn().mockResolvedValue({ data: 'ok' }) };
    const service = require('./permissionService')(apiClient);
    const result = await service.assignPermission('r1', 1);
    expect(result).toBe('ok');
  });

  // TC-FE-PERM-030: unassignPermission trả về data đúng
  test('TC-FE-PERM-030: unassignPermission trả về data đúng', async () => {
    const apiClient = { delete: jest.fn().mockResolvedValue({ data: 'ok' }) };
    const service = require('./permissionService')(apiClient);
    const result = await service.unassignPermission('r1', 1);
    expect(result).toBe('ok');
  });

  // TC-FE-PERM-031: refreshAdminUserInfo trả về false khi không có token hoặc user
  test('TC-FE-PERM-031: refreshAdminUserInfo trả về false khi thiếu token/user', async () => {
    const apiClient = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
    const service = require('./permissionService')(apiClient);
    window.localStorage.removeItem('adminToken');
    window.localStorage.removeItem('adminUser');
    const result = await service.refreshAdminUserInfo();
    expect(result).toBe(false);
  });

  // TC-FE-PERM-032: refreshAdminUserInfo trả về false khi không có roleId
  test('TC-FE-PERM-032: refreshAdminUserInfo trả về false khi không có roleId', async () => {
    const apiClient = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
    const service = require('./permissionService')(apiClient);
    window.localStorage.setItem('adminToken', 'invalid.token.value');
    window.localStorage.setItem('adminUser', JSON.stringify({ id: 1 }));
    const result = await service.refreshAdminUserInfo();
    expect(result).toBe(false);
  });

  // TC-FE-PERM-033: refreshAdminUserInfo trả về false khi permissions rỗng
  test('TC-FE-PERM-033: refreshAdminUserInfo trả về false khi permissions rỗng', async () => {
    const apiClient = { get: jest.fn().mockResolvedValue({ data: [] }), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
    const service = require('./permissionService')(apiClient);
    window.localStorage.setItem('adminToken', 'header.eyJyb2xlSWQiOiIxIn0=.sig');
    window.localStorage.setItem('adminUser', JSON.stringify({ id: 1, roleId: '1' }));
    service.getRolePermissions = jest.fn().mockResolvedValue([]);
    const result = await service.refreshAdminUserInfo();
    expect(result).toBe(false);
  });

  // TC-FE-PERM-034: refreshAdminUserInfo trả về false khi exception
  test('TC-FE-PERM-034: refreshAdminUserInfo trả về false khi exception', async () => {
    const apiClient = { get: jest.fn().mockRejectedValue(new Error('fail')), post: jest.fn(), put: jest.fn(), delete: jest.fn() };
    const service = require('./permissionService')(apiClient);
    window.localStorage.setItem('adminToken', 'header.eyJyb2xlSWQiOiIxIn0=.sig');
    window.localStorage.setItem('adminUser', JSON.stringify({ id: 1, roleId: '1' }));
    service.getRolePermissions = jest.fn().mockRejectedValue(new Error('fail'));
    const result = await service.refreshAdminUserInfo();
    expect(result).toBe(false);
  });
});
