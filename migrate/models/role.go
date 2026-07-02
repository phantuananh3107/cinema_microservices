package models

import (
	"time"

	"github.com/uptrace/bun"
)

type Role struct {
	bun.BaseModel `bun:"table:roles,alias:r"`

	Id          string     `bun:"id,pk" json:"id"`
	Name        string     `bun:"name,notnull" json:"name"`
	Description *string    `bun:"description" json:"description,omitempty"`
	CreatedAt   time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	Users           []*User           `bun:"rel:has-many,join:id=role_id" json:"users,omitempty"`
	RolePermissions []*RolePermission `bun:"rel:has-many,join:id=role_id" json:"role_permissions,omitempty"`
}
