package middleware

import (
	"compress/gzip"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type gzipResponseWriter struct {
	gin.ResponseWriter
	compressor *gzip.Writer
}

func (w *gzipResponseWriter) Write(data []byte) (int, error) {
	return w.compressor.Write(data)
}

func (w *gzipResponseWriter) WriteString(value string) (int, error) {
	return w.compressor.Write([]byte(value))
}

func (w *gzipResponseWriter) Flush() {
	if err := w.compressor.Flush(); err == nil {
		w.ResponseWriter.Flush()
	}
}

// GzipReports compresses report responses only when the client accepts gzip.
// BestSpeed keeps CPU cost low for concurrent report requests while greatly
// reducing the wire size of large JSON responses.
func GzipReports() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Vary", "Accept-Encoding")
		if !acceptsGzip(c.GetHeader("Accept-Encoding")) || c.Request.Method == http.MethodHead {
			c.Next()
			return
		}

		compressor, err := gzip.NewWriterLevel(c.Writer, gzip.BestSpeed)
		if err != nil {
			c.Next()
			return
		}
		defer compressor.Close()

		c.Header("Content-Encoding", "gzip")
		c.Writer.Header().Del("Content-Length")
		c.Writer = &gzipResponseWriter{ResponseWriter: c.Writer, compressor: compressor}
		c.Next()
	}
}

func acceptsGzip(header string) bool {
	for _, encoding := range strings.Split(header, ",") {
		parts := strings.Split(strings.TrimSpace(encoding), ";")
		if !strings.EqualFold(strings.TrimSpace(parts[0]), "gzip") {
			continue
		}
		for _, parameter := range parts[1:] {
			name, value, found := strings.Cut(strings.TrimSpace(parameter), "=")
			if !found || !strings.EqualFold(strings.TrimSpace(name), "q") {
				continue
			}
			quality, err := strconv.ParseFloat(strings.TrimSpace(value), 64)
			return err == nil && quality > 0
		}
		return true
	}
	return false
}
