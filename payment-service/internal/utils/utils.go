package utils

func CheckUserPermission(requiredPermission string, permissions []string) bool {
	for _, permission := range permissions {
		if requiredPermission == permission {
			return true
		}
	}
	return false
}
