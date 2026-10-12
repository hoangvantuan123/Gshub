package proof

import "context"

type contextKey struct{}
type verified struct{ key, tokenHash string }

func WithVerified(ctx context.Context, key, token string) context.Context {
	return context.WithValue(ctx, contextKey{}, verified{key, Hash(token)})
}
func VerifiedKey(ctx context.Context, token string) string {
	v, _ := ctx.Value(contextKey{}).(verified)
	if v.tokenHash == Hash(token) {
		return v.key
	}
	return ""
}
