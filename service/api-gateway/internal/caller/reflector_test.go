package caller

import (
	"api-gateway/config"
	"testing"
)

func TestLookupMethodsLoaded(t *testing.T) {
	config.Cfg = &config.Config{
		ProtoDir: "../../../proto",
	}

	reflector := GetReflector()
	expectedMethods := []string{
		"/lookup.auth.help_auth.LookupAuthService/RootMenuH",
		"/lookup.auth.help_auth.LookupAuthService/SubMenuH",
		"/lookup.auth.help_auth.LookupAuthService/MenuH",
		"/lookup.auth.help_auth.LookupAuthService/UsersH",
		"/lookup.auth.help_lang.LookupLangDictService/LangDictH",
		"/lookup.wh.help_item.HelpItemService/ItemsH",
	}

	for _, m := range expectedMethods {
		md := reflector.GetMethod(m)
		if md == nil {
			t.Errorf("Expected method %s to be loaded, but got nil", m)
		} else {
			t.Logf("Found method: %s", m)
		}
	}
}
