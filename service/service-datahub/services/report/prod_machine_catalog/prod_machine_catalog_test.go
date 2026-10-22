package prod_machine_catalog

import (
	"context"
	"errors"
	"sync"
	"testing"

	"gorm.io/gorm/schema"
	models "service-datahub/models/report"
)

func TestInvalidRequestsDoNotReachDatabase(t *testing.T) {
	s := NewProdMachineCatalogService(nil)
	for _, tc := range []struct{ op, body string }{
		{"A", `[]`}, {"A", `{"items":[{"MachineCode":"A"}]}`},
		{"A", `[{"MachineCode":"a","MachineName":"A"},{"MachineCode":" A ","MachineName":"B"}]`},
		{"A", `[{"IdSeq":"550e8400-e29b-41d4-a716-446655440000","MachineCode":"A","MachineName":"A"}]`},
		{"U", `[{"MachineCode":"A","MachineName":"A"}]`},
		{"D", `[]`}, {"D", `{"idSeqs":["bad-id"]}`},
		{"Q", `{"pageSize":1001}`}, {"Q", `{"page":0}`},
		{"Q", `{"IsActive":"wrong"}`}, {"Q", `{"keyword":{}}`},
		{"A", `invalid`},
	} {
		t.Run(tc.op+tc.body, func(t *testing.T) {
			_, err := s.Execute(context.Background(), tc.op, []byte(tc.body), "user")
			var apiErr *APIError
			if !errors.As(err, &apiErr) || apiErr.Status != 400 {
				t.Fatalf("expected validation error, got %v", err)
			}
		})
	}
}

func TestCatalogModelHasNoKeysOrUniqueConstraints(t *testing.T) {
	s, err := schema.Parse(&models.ERPProdMachineCatalog{}, &sync.Map{}, schema.NamingStrategy{})
	if err != nil {
		t.Fatal(err)
	}
	if len(s.PrimaryFields) != 0 || len(s.Relationships.Relations) != 0 {
		t.Fatal("catalog must not have PK/FK")
	}
	for _, field := range s.Fields {
		if field.Unique || field.UniqueIndex != "" {
			t.Fatal("unexpected unique constraint")
		}
	}
}
