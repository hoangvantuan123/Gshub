package auth

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/jmoiron/sqlx"
)

const (
	SecretKeyMain = "0123456789abcdef0123456789abcdef"
	SecretKeySub  = "abcdef0123456789abcdef0123456789"
)

type LogLoginService struct {
	db *sqlx.DB
}

func NewLogLoginService(db *sqlx.DB) *LogLoginService {
	return &LogLoginService{db: db}
}

// decryptAESGCM helper giải mã chuỗi Base64 Data và IV
func decryptAESGCM(dataBase64, ivBase64, secretKey string) ([]byte, error) {
	if dataBase64 == "" || ivBase64 == "" {
		return nil, fmt.Errorf("empty payload or iv")
	}

	cipherData, err := base64.StdEncoding.DecodeString(dataBase64)
	if err != nil {
		return nil, err
	}

	iv, err := base64.StdEncoding.DecodeString(ivBase64)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher([]byte(secretKey))
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	plainText, err := gcm.Open(nil, iv, cipherData, nil)
	if err != nil {
		return nil, err
	}

	return plainText, nil
}

// decryptDeviceInfoHelper giải mã thông tin thiết bị và bóc tách cả DeviceIdToken 2 lớp
func decryptDeviceInfoHelper(dataStr, ivStr string) map[string]interface{} {
	if dataStr == "" || ivStr == "" {
		return nil
	}

	plainBytes, err := decryptAESGCM(dataStr, ivStr, SecretKeyMain)
	if err != nil {
		return nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal(plainBytes, &result); err != nil {
		return nil
	}

	// Giải mã tiếp DeviceIdToken lồng nhau nếu có
	if tokenVal, ok := result["DeviceIdToken"].(string); ok && tokenVal != "" {
		var secondLayer struct {
			Data string `json:"data"`
			Iv   string `json:"iv"`
		}
		if err := json.Unmarshal([]byte(tokenVal), &secondLayer); err == nil {
			firstLayerBytes, err := decryptAESGCM(secondLayer.Data, secondLayer.Iv, SecretKeySub)
			if err == nil {
				var firstLayer struct {
					Data string `json:"data"`
					Iv   string `json:"iv"`
				}
				if err := json.Unmarshal(firstLayerBytes, &firstLayer); err == nil {
					rawDeviceBytes, _ := decryptAESGCM(firstLayer.Data, firstLayer.Iv, SecretKeyMain)
					var rawToken map[string]interface{}
					if err := json.Unmarshal(rawDeviceBytes, &rawToken); err == nil {
						result["DeviceIdTokenDecrypted"] = rawToken
						if deviceId, ok := rawToken["deviceId"].(string); ok {
							result["deviceId"] = deviceId
						}
					}
				}
			}
		}
	}

	return result
}

// LogLoginQ queries and decrypts login logs
func (s *LogLoginService) LogLoginQ(ctx context.Context, filters map[string]string) (any, any, error) {
	page := 1
	pageSize := 50

	if p, ok := filters["Page"]; ok {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	} else if p, ok := filters["page"]; ok {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	if ps, ok := filters["PageSize"]; ok {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	} else if ps, ok := filters["pageSize"]; ok {
		if val, err := strconv.Atoi(ps); err == nil && val > 0 {
			pageSize = val
		}
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if login, ok := filters["Login"]; ok && login != "" {
		conditions = append(conditions, fmt.Sprintf(`"Login" ILIKE $%d`, argIdx))
		args = append(args, "%"+login+"%")
		argIdx++
	} else if login, ok := filters["login"]; ok && login != "" {
		conditions = append(conditions, fmt.Sprintf(`"Login" ILIKE $%d`, argIdx))
		args = append(args, "%"+login+"%")
		argIdx++
	}

	if userSeq, ok := filters["UserSeq"]; ok && userSeq != "" {
		conditions = append(conditions, fmt.Sprintf(`"UserSeq" = $%d`, argIdx))
		args = append(args, userSeq)
		argIdx++
	}

	if status, ok := filters["StatusLogs"]; ok && status != "" {
		conditions = append(conditions, fmt.Sprintf(`"StatusLogs" = $%d`, argIdx))
		args = append(args, status)
		argIdx++
	}

	if platform, ok := filters["PlatformStatus"]; ok && platform != "" {
		conditions = append(conditions, fmt.Sprintf(`"PlatformStatus" = $%d`, argIdx))
		args = append(args, platform)
		argIdx++
	}

	if dateFrom, ok := filters["DateFrom"]; ok && dateFrom != "" {
		conditions = append(conditions, fmt.Sprintf(`"CreatedAt" >= $%d`, argIdx))
		args = append(args, dateFrom)
		argIdx++
	}

	if dateTo, ok := filters["DateTo"]; ok && dateTo != "" {
		conditions = append(conditions, fmt.Sprintf(`"CreatedAt" <= $%d`, argIdx))
		args = append(args, dateTo)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Đếm tổng số bản ghi
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM "_ERPLoginFullLogs" %s`, whereClause)
	var totalRecords int
	if err := s.db.GetContext(ctx, &totalRecords, countQuery, args...); err != nil {
		totalRecords = 0
	}

	// Query phân trang
	offset := (page - 1) * pageSize
	dataQuery := fmt.Sprintf(`
		SELECT 
			"IdSeq", "UserSeq", "Login", "IdxNo", "DeviceId", "StatusLogs",
			"DeviceInfoWeb", "DeviceInfoSoft", "DeviceInfoApp",
			"DeviceInfoWebIV", "DeviceInfoSoftIV", "DeviceInfoAppIV",
			"PlatformStatus", "CreatedAt"
		FROM "_ERPLoginFullLogs"
		%s
		ORDER BY "CreatedAt" DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIdx, argIdx+1)

	argsWithLimit := append(args, pageSize, offset)

	rows, err := s.db.QueryxContext(ctx, dataQuery, argsWithLimit...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		row := make(map[string]interface{})
		if err := rows.MapScan(row); err == nil {
			// Xử lý giải mã thông tin thiết bị cho từng nền tảng
			var decryptedInfo map[string]interface{}

			softData, _ := row["DeviceInfoSoft"].(string)
			softIV, _ := row["DeviceInfoSoftIV"].(string)
			if softData != "" && softIV != "" {
				decryptedInfo = decryptDeviceInfoHelper(softData, softIV)
			}

			webData, _ := row["DeviceInfoWeb"].(string)
			webIV, _ := row["DeviceInfoWebIV"].(string)
			if decryptedInfo == nil && webData != "" && webIV != "" {
				decryptedInfo = decryptDeviceInfoHelper(webData, webIV)
			}

			appData, _ := row["DeviceInfoApp"].(string)
			appIV, _ := row["DeviceInfoAppIV"].(string)
			if decryptedInfo == nil && appData != "" && appIV != "" {
				decryptedInfo = decryptDeviceInfoHelper(appData, appIV)
			}

			row["DeviceInfoDecrypted"] = decryptedInfo

			// Định dạng thời gian hiển thị thân thiện
			if t, ok := row["CreatedAt"].(time.Time); ok {
				row["CreatedAtFormatted"] = t.Format("2006-01-02 15:04:05")
			}

			result = append(result, row)
		}
	}

	pageInfo := map[string]interface{}{
		"page":         page,
		"pageSize":     pageSize,
		"totalRecords": totalRecords,
		"totalPages":   (totalRecords + pageSize - 1) / pageSize,
	}

	return result, pageInfo, nil
}

// LogLoginD deletes login logs by IDs
func (s *LogLoginService) LogLoginD(ctx context.Context, ids []string) (any, error) {
	if len(ids) == 0 {
		return nil, fmt.Errorf("no ids provided")
	}

	_, err := s.db.ExecContext(ctx, `DELETE FROM "_ERPLoginFullLogs" WHERE "IdSeq" = ANY($1)`, ids)
	return nil, err
}
