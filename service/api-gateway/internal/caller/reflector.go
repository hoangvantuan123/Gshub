package caller

import (
	"api-gateway/config"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/jhump/protoreflect/desc"
	"github.com/jhump/protoreflect/desc/protoparse"
	"github.com/jhump/protoreflect/dynamic"
	"go.uber.org/zap"
)

// Reflector manages dynamic proto descriptors for gRPC methods.
type Reflector struct {
	protoDir string
	methods  map[string]*desc.MethodDescriptor
	mu       sync.RWMutex
}

var (
	instance *Reflector
	once     sync.Once
	Log      = zap.NewNop()
)

// SetLogger sets the logger for this package.
func SetLogger(l *zap.Logger) {
	Log = l
}

// GetReflector returns the singleton instance of Reflector.
func GetReflector() *Reflector {
	once.Do(func() {
		// Use ProtoDir from config
		abs, _ := filepath.Abs(config.Cfg.ProtoDir)
		instance = &Reflector{
			protoDir: abs,
			methods:  make(map[string]*desc.MethodDescriptor),
		}
		instance.reload()
	})
	return instance
}

func (r *Reflector) reload() {
	var files []string
	importDirs := map[string]bool{r.protoDir: true}

	err := filepath.Walk(r.protoDir, func(path string, info os.FileInfo, err error) error {
		if err == nil {
			if info.IsDir() {
				importDirs[path] = true
			} else if strings.HasSuffix(info.Name(), ".proto") {
				importDirs[filepath.Dir(path)] = true
				rel, _ := filepath.Rel(r.protoDir, path)
				files = append(files, filepath.ToSlash(rel))
			}
		}
		return nil
	})

	if err != nil {
		Log.Error("Error walking proto dir", zap.Error(err), zap.String("dir", r.protoDir))
		return
	}

	var importPaths []string
	for dir := range importDirs {
		importPaths = append(importPaths, dir)
	}

	parser := protoparse.Parser{
		ImportPaths: importPaths,
	}

	newMethods := make(map[string]*desc.MethodDescriptor)

	for _, file := range files {
		fds, err := parser.ParseFiles(file)
		if err != nil {
			// Log error but continue with other files
			Log.Error("Error parsing proto file", zap.String("file", file), zap.Error(err))
			continue
		}

		for _, fd := range fds {
			for _, sd := range fd.GetServices() {
				for _, md := range sd.GetMethods() {
					path := fmt.Sprintf("/%s.%s/%s", sd.GetFile().GetPackage(), sd.GetName(), md.GetName())
					
					// Optional: Log warning if duplicate path detected
					if _, exists := newMethods[path]; exists {
						Log.Warn("Duplicate gRPC method path detected", 
							zap.String("path", path), 
							zap.String("file", file))
					}
					
					newMethods[path] = md
				}
			}
		}
	}

	r.mu.Lock()
	r.methods = newMethods
	r.mu.Unlock()

	Log.Info("Proto files reloaded", zap.Int("total_methods", len(newMethods)))
}

func (r *Reflector) GetMethod(path string) *desc.MethodDescriptor {
	if config.Cfg.NodeEnv == "dev" {
		r.reload()
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.methods[path]
}

func (r *Reflector) NewMessage(md *desc.MethodDescriptor) *dynamic.Message {
	return dynamic.NewMessage(md.GetInputType())
}
