package response

import (
	"strings"
	"testing"
)

func TestInfrastructureFailuresHaveActionableMessages(t *testing.T) {
	if message := NormalizeCode("5002", false); !strings.Contains(message, "Không thể kết nối") {
		t.Fatalf("unexpected message: %s", message)
	}
	if message := NormalizeCode("5003", false); !strings.Contains(message, "quá thời gian chờ") {
		t.Fatalf("unexpected message: %s", message)
	}
}
