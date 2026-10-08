package bravo

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// RequestOptions holds execution parameters for a Bravo ERP request
type RequestOptions struct {
	BaseURL            string
	Endpoint           string
	Token              string
	BranchCode         string
	FiscalYear         string
	Referer            string
	ClientIP           string
	UserAgent          string
	InsecureSkipVerify bool
	Timeout            time.Duration
}

// Client executes low-level HTTP communication with Bravo ERP
type Client struct {
	defaultTimeout time.Duration
}

// NewClient creates a new Bravo HTTP client
func NewClient(defaultTimeout time.Duration) *Client {
	if defaultTimeout <= 0 {
		defaultTimeout = 35 * time.Second
	}
	return &Client{
		defaultTimeout: defaultTimeout,
	}
}

// DoPost sends an authenticated JSON POST payload to the Bravo ERP endpoint
func (c *Client) DoPost(ctx context.Context, opts RequestOptions, payload interface{}) ([]byte, error) {
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = c.defaultTimeout
	}

	httpClient := &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: opts.InsecureSkipVerify,
			},
		},
		Timeout: timeout,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("bravo payload serialization error: %w", err)
	}

	targetURL := fmt.Sprintf("%s/%s", strings.TrimRight(opts.BaseURL, "/"), strings.TrimLeft(opts.Endpoint, "/"))

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("bravo request creation error: %w", err)
	}

	// 1. Headers: Auth & Protocol
	httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", opts.Token))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json, text/plain, */*")
	httpReq.Header.Set("Lang", "0")
	if opts.FiscalYear != "" {
		httpReq.Header.Set("FiscalYear", opts.FiscalYear)
	}
	if opts.BranchCode != "" && opts.BranchCode != "ALL" {
		httpReq.Header.Set("BranchCode", opts.BranchCode)
	}

	// 2. ClientInfo
	wsName := opts.ClientIP
	if wsName == "" || wsName == "::1" || wsName == "127.0.0.1" {
		wsName = "10.10.9.66"
	}
	httpReq.Header.Set("clientinfo", fmt.Sprintf("AppName=Bravo Web 10.9.5.1;WsName=%s", wsName))

	// 3. User-Agent
	ua := opts.UserAgent
	if ua == "" {
		ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36"
	}
	httpReq.Header.Set("User-Agent", ua)

	// 4. Referer
	if opts.Referer != "" {
		httpReq.Header.Set("Referer", opts.Referer)
	}

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("bravo ERP HTTP request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("bravo ERP read response failed: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return respBytes, fmt.Errorf("bravo ERP returned HTTP status %d: %s", resp.StatusCode, string(respBytes))
	}

	return respBytes, nil
}
