package auth

import (
	"context"
	"encoding/json"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"net/url"
	"os"
	"path/filepath"
	"server-core/internal/middleware"
	"testing"
	"time"
)

// Opt-in, read-only verification against the project's configured database.
func TestConfiguredPermissionSnapshot(t *testing.T) {
	userID := os.Getenv("GSHUB_PERMISSION_TEST_USER")
	if userID == "" {
		t.Skip("set GSHUB_PERMISSION_TEST_USER to run the read-only database check")
	}
	env, err := godotenv.Read(filepath.Join("..", "..", "..", ".env"))
	if err != nil {
		t.Fatal(err)
	}
	get := func(key, fallback string) string {
		if value := env[key]; value != "" {
			return value
		}
		return fallback
	}
	dsn := url.URL{Scheme: "postgres", Host: get("POSTGRES_HOST", "localhost") + ":" + get("POSTGRES_PORT", "5432"), Path: "/" + get("POSTGRES_DB", "ERPSYS"), User: url.UserPassword(get("POSTGRES_USER", "postgres"), get("POSTGRES_PASSWORD", ""))}
	options := dsn.Query()
	options.Set("sslmode", "disable")
	options.Set("connect_timeout", "5")
	dsn.RawQuery = options.Encode()
	db, err := sqlx.Open("postgres", dsn.String())
	if err != nil {
		t.Fatal("cannot initialize database connection")
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if _, err := db.ExecContext(ctx, "SET default_transaction_read_only = on"); err != nil {
		t.Fatal(err)
	}
	var userSeq string
	if err := db.GetContext(ctx, &userSeq, `SELECT "UserSeq" FROM "_ERPUsers" WHERE "UserId"=$1`, userID); err != nil {
		t.Fatal(err)
	}
	s := &authService{db: db}
	sections, _, err := s.getDataRolesUserRaw(ctx, userID, userSeq)
	if err != nil {
		t.Fatal(err)
	}
	if len(sections) != 5 {
		t.Fatalf("incomplete permission snapshot: %d sections", len(sections))
	}
	menus := sections[0]["menu"].([]map[string]interface{})
	visible, containers, actions := 0, 0, 0
	for _, menu := range menus {
		if s.asBool(menu["NavigationOnly"]) {
			containers++
			continue
		}
		if s.asBool(menu["View"]) {
			visible++
		}
		actions += len(menu["actions"].(map[string]bool))
	}
	if len(menus) == 0 || visible == 0 {
		t.Fatal("account with configured menu grants has an empty snapshot")
	}
	t.Logf("database snapshot: %d menus with View, %d navigation containers, %d action entries, %d root modules", visible, containers, actions, len(sections[1]["rootMenu"].([]map[string]interface{})))
	if output := os.Getenv("GSHUB_PERMISSION_EXPORT_PATH"); output != "" {
		data, err := json.Marshal(sections)
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(output, data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	// Exercise the actual authorization SQL, not only the menu merge helper.
	if userID == "superadmin" {
		requestContext := context.WithValue(ctx, "user_seq", userSeq)
		for _, method := range []string{"/users.roles.role.RoleService/RoleQ", "/roles.menu.MenuService/MenuQ", "/roles.root_menu.RootMenuService/RootMenuQ"} {
			called := false
			_, err := middleware.PermissionInterceptor(db)(requestContext, nil, &grpc.UnaryServerInfo{FullMethod: method}, func(context.Context, interface{}) (interface{}, error) { called = true; return nil, nil })
			if err != nil || !called {
				t.Fatalf("configured menu permission rejected by middleware: %s: %v", method, err)
			}
		}
		forgedContext := context.WithValue(ctx, "user_seq", "not-an-assigned-user")
		_, err := middleware.PermissionInterceptor(db)(forgedContext, nil, &grpc.UnaryServerInfo{FullMethod: "/users.roles.role.RoleService/RoleU"}, func(context.Context, interface{}) (interface{}, error) {
			t.Fatal("unassigned user reached mutation")
			return nil, nil
		})
		if status.Code(err) != codes.PermissionDenied {
			t.Fatalf("unassigned identity was not denied: %v", err)
		}
	}
	// A supplied username must not override a different verified UserSeq.
	other, _, err := s.getDataRolesUserRaw(ctx, userID, "not-an-assigned-user")
	if err != nil {
		t.Fatal(err)
	}
	if len(other[0]["menu"].([]map[string]interface{})) != 0 {
		t.Fatal("username granted another identity's permissions")
	}
}
