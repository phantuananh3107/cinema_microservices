package models

import (
	"time"

	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	Id          string     `bun:"id,pk" json:"id"`
	Name        string     `bun:"name,notnull" json:"name"`
	Email       string     `bun:"email,notnull,unique" json:"email"`
	Dob         time.Time  `bun:"dob" json:"dob,omitempty"`
	Gender      string     `bun:"gender" json:"gender,omitempty"`
	Password    string     `bun:"password,notnull" json:"-"`
	PhoneNumber *string    `bun:"phone_number" json:"phone_number,omitempty"`
	Status      string     `bun:"status,notnull" json:"status"`
	RoleId      *string    `bun:"role_id" json:"role_id,omitempty"`
	Address     *string    `bun:"address" json:"address,omitempty"`
	CreatedAt   time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   *time.Time `bun:"updated_at" json:"updated_at,omitempty"`

	Role     *Role      `bun:"rel:belongs-to,join:role_id=id" json:"role,omitempty"`
	Bookings []*Booking `bun:"rel:has-many,join:id=user_id" json:"bookings,omitempty"`
}

type StaffProfile struct {
	bun.BaseModel `bun:"table:staff_profile,alias:sp"`

	Id         string    `bun:"id,pk" json:"id"`
	UserId     string    `bun:"user_id,notnull" json:"user_id"`
	Salary     int       `bun:"salary,notnull" json:"salary"`
	Position   string    `bun:"position,notnull" json:"position"`
	Department string    `bun:"department,notnull" json:"department"`
	HireDate   time.Time `bun:"hire_date,notnull" json:"hire_date"`
	IsActive   bool      `bun:"is_active,notnull,default:true" json:"is_active"`

	User *User `bun:"rel:belongs-to,join:user_id=id" json:"user,omitempty"`
}

type CustomerProfile struct {
	bun.BaseModel `bun:"table:customer_profile,alias:cp"`

	Id                   string `bun:"id,pk" json:"id"`
	UserId               string `bun:"user_id,notnull" json:"user_id"`
	TotalPaymentAmount   int    `bun:"total_payment_amount,notnull,default:0" json:"total_payment_amount"`
	Point                int    `bun:"point,notnull,default:0" json:"point"`
	OnchainWalletAddress string `bun:"onchain_wallet_address,notnull" json:"onchain_wallet_address"`

	User *User `bun:"rel:belongs-to,join:user_id=id" json:"user,omitempty"`
}
