package user_auth

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
)

type UserItem struct {
	UserSeq     string `json:"UserSeq"`
	CompanySeq  int    `json:"CompanySeq"`
	IdxNo       int    `json:"IdxNo"`
	EmpID       string `json:"EmpID"`
	EmpCode     string `json:"EmpCode"`
	EmpName     string `json:"EmpName"`
	DeptName    string `json:"DeptName"`
	ManagerName string `json:"ManagerName"`
	UserId      string `json:"UserId"`
	UserType    int    `json:"UserType"`
	UserName    string `json:"UserName"`
	Email       string `json:"Email"`
	CheckPass1  bool   `json:"CheckPass1"`
	StatusAcc   bool   `json:"StatusAcc"`
	Status      string `json:"Status"`
	Active      bool   `json:"Active"`
	LanguageSeq int    `json:"LanguageSeq"`
	CreatedBy   string `json:"CreatedBy"`
	CreatedAt   string `json:"CreatedAt"`
	UpdatedBy   string `json:"UpdatedBy"`
	UpdatedAt   string `json:"UpdatedAt"`
	Rowversion  int64  `json:"Rowversion"`
	RowVersion  int64  `json:"RowVersion"`
}

type QueryUserParams struct {
	UserId    string `json:"userId"`
	UserName  string `json:"userName"`
	StatusAcc string `json:"statusAcc"`
	Active    string `json:"active"`
	Page      int    `json:"page"`
	PageSize  int    `json:"pageSize"`
}

type QueryUserResult struct {
	Data     []UserItem `json:"data"`
	Total    int64      `json:"total"`
	TotalAll int64      `json:"totalAll"`
	Page     int        `json:"page"`
	PageSize int        `json:"pageSize"`
}

func (s *UserAuthService) QueryUsers(ctx context.Context, params QueryUserParams) (*QueryUserResult, error) {
	if params.Page <= 0 {
		params.Page = 1
	}
	if params.PageSize <= 0 || params.PageSize > 5000 {
		params.PageSize = 1500
	}

	whereClauses := []string{"1=1"}
	var args []interface{}
	argIdx := 1

	if strings.TrimSpace(params.UserId) != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("\"UserId\" ILIKE $%d", argIdx))
		args = append(args, "%"+strings.TrimSpace(params.UserId)+"%")
		argIdx++
	}

	if strings.TrimSpace(params.UserName) != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("\"UserName\" ILIKE $%d", argIdx))
		args = append(args, "%"+strings.TrimSpace(params.UserName)+"%")
		argIdx++
	}

	if params.StatusAcc != "" {
		isBlocked := params.StatusAcc == "true" || params.StatusAcc == "1"
		whereClauses = append(whereClauses, fmt.Sprintf("\"StatusAcc\" = $%d", argIdx))
		args = append(args, isBlocked)
		argIdx++
	}

	if params.Active != "" {
		isActive := params.Active == "true" || params.Active == "1"
		whereClauses = append(whereClauses, fmt.Sprintf("\"Active\" = $%d", argIdx))
		args = append(args, isActive)
		argIdx++
	}

	whereSQL := strings.Join(whereClauses, " AND ")

	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM "_ERPUsers" WHERE %s`, whereSQL)
	var total int64
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		s.logger.Error("QueryUsers count error", zap.Error(err))
		return nil, err
	}

	var totalAll int64
	_ = s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM "_ERPUsers"`).Scan(&totalAll)

	offset := (params.Page - 1) * params.PageSize
	dataQuery := fmt.Sprintf(`
		SELECT 
			COALESCE("UserSeq", ''),
			COALESCE("CompanySeq", 1),
			COALESCE("IdxNo", 1),
			COALESCE("EmpID", ''),
			COALESCE("EmpCode", ''),
			COALESCE("EmpName", ''),
			COALESCE("DeptName", ''),
			COALESCE("ManagerName", ''),
			COALESCE("UserId", ''),
			COALESCE("UserType", 1),
			COALESCE("UserName", ''),
			COALESCE("Email", ''),
			COALESCE("CheckPass1", true),
			COALESCE("StatusAcc", false),
			COALESCE("Status", 'ACTIVE'),
			COALESCE("Active", true),
			COALESCE("LanguageSeq", 6),
			COALESCE("CreatedBy", ''),
			COALESCE(TO_CHAR("CreatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("UpdatedBy", ''),
			COALESCE(TO_CHAR("UpdatedAt", 'YYYY-MM-DD HH24:MI:SS'), ''),
			COALESCE("RowVersion", 1)
		FROM "_ERPUsers"
		WHERE %s
		ORDER BY "IdxNo" ASC, "CreatedAt" DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argIdx, argIdx+1)

	args = append(args, params.PageSize, offset)

	rows, err := s.db.QueryContext(ctx, dataQuery, args...)
	if err != nil {
		s.logger.Error("QueryUsers data query error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	var list []UserItem
	for rows.Next() {
		var u UserItem
		var rv int64
		if err := rows.Scan(
			&u.UserSeq,
			&u.CompanySeq,
			&u.IdxNo,
			&u.EmpID,
			&u.EmpCode,
			&u.EmpName,
			&u.DeptName,
			&u.ManagerName,
			&u.UserId,
			&u.UserType,
			&u.UserName,
			&u.Email,
			&u.CheckPass1,
			&u.StatusAcc,
			&u.Status,
			&u.Active,
			&u.LanguageSeq,
			&u.CreatedBy,
			&u.CreatedAt,
			&u.UpdatedBy,
			&u.UpdatedAt,
			&rv,
		); err != nil {
			s.logger.Error("QueryUsers row scan error", zap.Error(err))
			continue
		}
		u.Rowversion = rv
		u.RowVersion = rv
		list = append(list, u)
	}

	if err := rows.Err(); err != nil {
		s.logger.Error("QueryUsers rows iteration error", zap.Error(err))
		return nil, err
	}

	return &QueryUserResult{
		Data:     list,
		Total:    total,
		TotalAll: totalAll,
		Page:     params.Page,
		PageSize: params.PageSize,
	}, nil
}
