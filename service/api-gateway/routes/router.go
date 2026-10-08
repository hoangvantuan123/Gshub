package routes

import (
	"api-gateway/internal/grpcclient"
	"api-gateway/routes/auth"
	"api-gateway/routes/datahub"
	"api-gateway/routes/lookup"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine, pool *grpcclient.Pool) {
	// API v2: Auth, Lang, Roles, App
	v2 := r.Group("/api/v2")
	{
		auth.Register(v2, pool)
	}

	// API v6: Help (Lookups)
	v6 := r.Group("/api/v6")
	{
		lookup.RegisterV6(v6, pool)
	}

	// DataHub & Reports (v1 & v2)
	datahub.Register(r, pool)

	// Legacy/Compat v2 groups
	v2_compat := r.Group("/api/v2")
	{
		lookup.Register(v2_compat, pool)
		lookup.RegisterV6(v2_compat, pool)
	}

	// Root help aliases
	rootHelp := r.Group("")
	{
		lookup.RegisterV6(rootHelp, pool)
	}
}
