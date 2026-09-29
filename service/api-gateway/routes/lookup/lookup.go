package lookup

import (
	"api-gateway/internal/grpcclient"

	lookup_auth "api-gateway/handlers/lookup/auth"
	lookup_basic "api-gateway/handlers/lookup/basic"
	lookup_codehelp "api-gateway/handlers/lookup/codehelp"
	lookup_cust "api-gateway/handlers/lookup/cust"
	lookup_hr "api-gateway/handlers/lookup/hr"
	lookup_qc "api-gateway/handlers/lookup/qc"
	lookup_upload "api-gateway/handlers/lookup/upload"
	lookup_wh "api-gateway/handlers/lookup/wh"

	"github.com/gin-gonic/gin"
)

func Register(v2 *gin.RouterGroup, pool *grpcclient.Pool) {
	v2.POST("/AuthLookQ", lookup_auth.AuthLookQ(pool))
	v2.POST("/CustLookQ", lookup_cust.CustLookQ(pool))
	v2.POST("/OtherLookQ", lookup_basic.SizeLookQ(pool))
	v2.POST("/ScanLookQ", lookup_basic.ScanGroupLookQ(pool))
	v2.POST("/HrLookQ", lookup_hr.HrLookQ(pool))
	v2.POST("/RegiQcLookQ", lookup_qc.RegiQcLookQ(pool))
	v2.POST("/UploadLookQ", lookup_upload.UploadLookQ(pool))
	v2.POST("/ItemLookQ", lookup_wh.ItemLookQ(pool))
	v2.POST("/ZoneLookQ", lookup_wh.ZoneLookQ(pool))
	v2.POST("/LocationLookQ", lookup_wh.LocationLookQ(pool))
	v2.POST("/WHLookQ", lookup_wh.WHLookQ(pool))
}

func RegisterV6(v6 *gin.RouterGroup, pool *grpcclient.Pool) {
	help := v6.Group("/help")

	// Common CodeHelp Engine & System CodeHelp (/api/v6/help)
	help.POST("/CodeHelpCmnQ", lookup_codehelp.CodeHelpCmnQ(pool))
	help.POST("/CodeHelpQ", lookup_codehelp.CodeHelpQ(pool))
	help.POST("/SysAttrGroupH", lookup_codehelp.SysAttrGroupH(pool))
	help.POST("/PermActionsH", lookup_codehelp.PermActionsH(pool))
	help.POST("/PermFieldsH", lookup_codehelp.PermFieldsH(pool))
	help.POST("/PermScopesH", lookup_codehelp.PermScopesH(pool))

	// AuthHelpController (/api/v6/help)
	help.POST("/MenuH", lookup_auth.MenuH(pool))
	help.POST("/RootMenuH", lookup_auth.RootMenuH(pool))
	help.POST("/UsersH", lookup_auth.UsersH(pool))
	help.POST("/SubMenuH", lookup_auth.SubMenuH(pool))
	help.POST("/LangDictH", lookup_auth.LangDictH(pool))
	help.POST("/LangH", lookup_auth.LangH(pool))
	help.POST("/DictVersionQ", lookup_auth.DictVersionQ(pool))




	// HelpCustController (/api/v6/help)
	help.POST("/CustTypeH", lookup_cust.CustTypeH(pool))
	help.POST("/CustH", lookup_cust.CustH(pool))
	help.POST("/PortH", lookup_cust.PortH(pool))
	help.POST("/HelpCustH", lookup_cust.CustUserItemH(pool))

	// OrgHelpDefineController (/api/v6/help)
	help.POST("/CodeHelpItemH", lookup_basic.CodeHelpItemH(pool))
	help.POST("/HelpDefineItemAppH", lookup_basic.HelpDefineItemAppH(pool))

	// HrHelpController (/api/v6/help)
	help.POST("/EmpsH", lookup_hr.HrH(pool))

	// OrgHelpController (/api/v6/help)
	help.POST("/OrgDeptH", lookup_basic.OrgDeptH(pool))
	help.POST("/OrgProdLocationH", lookup_basic.OrgProdLocationH(pool))
	help.POST("/OrgProdLocationPH", lookup_basic.OrgProdLocationH(pool)) // Mapping PH to H for now
	help.POST("/OrgProDeptH", lookup_basic.OrgProDeptH(pool))
	help.POST("/OrgEnterpriseH", lookup_basic.OrgEnterpriseH(pool))
	help.POST("/OrgWorkCenterH", lookup_basic.OrgWorkCenterH(pool))
	help.POST("/HelpDeptH", lookup_basic.HelpDeptH(pool))

	// OtherHelpController (/api/v6/help)
	help.POST("/SizeH", lookup_basic.SizeH(pool))
	help.POST("/UnitsH", lookup_basic.UnitH(pool))

	// RegiQcHelpController (/api/v6/help)
	help.POST("/QcObjectsH", lookup_qc.RegiQcH(pool))
	help.POST("/QcCategoryGroupsH", lookup_qc.RegiQcH(pool))

	// ScanHelpController (/api/v6/help)
	help.POST("/ScanGroupH", lookup_basic.ScanGroupH(pool))
	help.POST("/ScanUserH", lookup_basic.ScanUserH(pool))

	// UploadHelpController (/api/v6/help)
	help.POST("/TempFileH", lookup_upload.UploadHelp(pool))

	// ItemHelpController (/api/v6/help)
	help.POST("/ItemsH", lookup_wh.ItemH(pool))

	// LocationHelpController (/api/v6/help)
	help.POST("/LocationH", lookup_wh.LocationH(pool))

	// ZoneHelpController (/api/v6/help)
	help.POST("/ZoneH", lookup_wh.ZoneH(pool))

	// WHsHelpController (/api/v6/help)
	help.POST("/WHsH", lookup_wh.WHsH(pool))
}
