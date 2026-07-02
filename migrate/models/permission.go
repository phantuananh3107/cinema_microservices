package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Permission struct {
	bun.BaseModel `bun:"table:permissions,alias:p"`

	Id          string     `bun:"id,pk" json:"id"`
	Name        string     `bun:"name,notnull" json:"name"`
	Code        string     `bun:"code,notnull,unique" json:"code"`
	Description *string    `bun:"description" json:"description,omitempty"`
	CreatedAt   time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	RolePermissions []*RolePermission `bun:"rel:has-many,join:id=permission_id" json:"role_permissions,omitempty"`
}
