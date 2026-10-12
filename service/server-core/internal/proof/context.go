package proof

import "context"

type contextKey struct{}

func WithKey(ctx context.Context, key string) context.Context {
	return context.WithValue(ctx, contextKey{}, key)
}
func SessionKey(ctx context.Context) string { key, _ := ctx.Value(contextKey{}).(string); return key }
