package help

import (
	"context"
	"fmt"
	"strings"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

type CodeHelpService struct {
	db     *gorm.DB
	logger *zap.Logger
}

func NewCodeHelpService(db *gorm.DB, logger *zap.Logger) *CodeHelpService {
	return &CodeHelpService{
		db:     db,
		logger: logger,
	}
}

type CodeHelpParams struct {
	CodeHelpName string   `json:"CodeHelpName"`
	TableName    string   `json:"TableName"`
	KeyType      string   `json:"KeyType"`
	KeyValue     string   `json:"KeyValue"`
	Search       string   `json:"search"`
	KeyItem1     string   `json:"KeyItem1"`
	KeyItem2     string   `json:"KeyItem2"`
	KeyItem3     string   `json:"KeyItem3"`
	Keywords     []string `json:"Keywords"`
	Page         string   `json:"page"`
	Limit        string   `json:"limit"`
}

// QueryCodeHelp xử lý tra cứu động danh mục cho toàn hệ thống (Users, Roles, Menus, Factories, etc.)
func (s *CodeHelpService) QueryCodeHelp(ctx context.Context, p CodeHelpParams) ([]map[string]interface{}, error) {
	name := strings.ToUpper(strings.TrimSpace(p.CodeHelpName))
	if name == "" {
		name = strings.ToUpper(strings.TrimSpace(p.TableName))
	}

	searchKeyword := strings.TrimSpace(p.KeyValue)
	if searchKeyword == "" {
		searchKeyword = strings.TrimSpace(p.Search)
	}
	if searchKeyword == "" {
		searchKeyword = strings.TrimSpace(p.KeyItem1)
	}

	var results []map[string]interface{}

	switch {
	case strings.Contains(name, "USER"):
		query := s.db.WithContext(ctx).Table(`"_ERPUsers"`).
			Select(`"UserSeq", "UserId", "UserName", "EmpName", "DeptName", "Email", "Active"`).
			Where(`"Active" = true`)

		if searchKeyword != "" {
			kw := "%" + strings.ToLower(searchKeyword) + "%"
			query = query.Where(`LOWER("UserId") LIKE ? OR LOWER("UserName") LIKE ? OR LOWER("EmpName") LIKE ? OR LOWER("DeptName") LIKE ?`, kw, kw, kw, kw)
		}
		rows, err := query.Limit(100).Rows()
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			item := make(map[string]interface{})
			_ = s.db.ScanRows(rows, &item)
			item["Key"] = item["UserId"]
			item["Label"] = fmt.Sprintf("%v - %v (%v)", item["UserId"], item["UserName"], item["DeptName"])
			results = append(results, item)
		}

	case strings.Contains(name, "ROLE") || strings.Contains(name, "GROUP"):
		query := s.db.WithContext(ctx).Table(`"_ERPGroups"`).
			Select(`"Id", "Name", "Comment", "CreatedBy"`)

		if searchKeyword != "" {
			kw := "%" + strings.ToLower(searchKeyword) + "%"
			query = query.Where(`LOWER("Name") LIKE ? OR LOWER("Comment") LIKE ?`, kw, kw)
		}
		rows, err := query.Order(`"IdxNo" ASC, "Id" ASC`).Limit(100).Rows()
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			item := make(map[string]interface{})
			_ = s.db.ScanRows(rows, &item)
			item["Key"] = fmt.Sprintf("%v", item["Id"])
			item["Label"] = item["Name"]
			item["CreatedByName"] = item["CreatedBy"]
			results = append(results, item)
		}

	case strings.Contains(name, "ROOT"):
		query := s.db.WithContext(ctx).Table(`"_ERPRootMenus"`).
			Select(`"Id", "Key", "Label", "Icon", "Link"`)

		if searchKeyword != "" {
			kw := "%" + strings.ToLower(searchKeyword) + "%"
			query = query.Where(`LOWER("Key") LIKE ? OR LOWER("Label") LIKE ?`, kw, kw)
		}
		rows, err := query.Order(`"IdxNo" ASC, "Id" ASC`).Limit(100).Rows()
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			item := make(map[string]interface{})
			_ = s.db.ScanRows(rows, &item)
			results = append(results, item)
		}

	case strings.Contains(name, "MENU") || strings.Contains(name, "SUBMENU"):
		query := s.db.WithContext(ctx).Table(`"_ERPMenus"`).
			Select(`"Id", "Key", "Label", "Type", "Link", "MenuRootId", "MenuSubRootId"`)

		if strings.Contains(name, "SUBMENU") {
			query = query.Where(`LOWER("Type") = 'submenu'`)
		}
		if searchKeyword != "" {
			kw := "%" + strings.ToLower(searchKeyword) + "%"
			query = query.Where(`LOWER("Key") LIKE ? OR LOWER("Label") LIKE ?`, kw, kw)
		}
		rows, err := query.Order(`"OrderSeq" ASC, "Id" ASC`).Limit(100).Rows()
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			item := make(map[string]interface{})
			_ = s.db.ScanRows(rows, &item)
			results = append(results, item)
		}

	default:
		// Fallback chung: Trả danh sách rỗng an toàn không lỗi
		results = []map[string]interface{}{}
	}

	if results == nil {
		results = []map[string]interface{}{}
	}
	return results, nil
}
