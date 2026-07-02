package models

import (
	"time"

	"github.com/uptrace/bun"
)

type RolePermission struct {
	bun.BaseModel `bun:"table:role_permissions,alias:rp"`

	Id           string    `bun:"id,pk" json:"id"`
	RoleId       string    `bun:"role_id" json:"role_id"`
	PermissionId string    `bun:"permission_id" json:"permission_id"`
	CreatedAt    time.Time `bun:"created_at,notnull,default:current_timestamp" json:"created_at"`

	Role       *Role       `bun:"rel:belongs-to,join:role_id=id" json:"role,omitempty"`
	Permission *Permission `bun:"rel:belongs-to,join:permission_id=id" json:"permission,omitempty"`
}
