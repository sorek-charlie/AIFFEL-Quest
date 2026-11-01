// SolarWar.exe: serves the embedded single-file game on localhost and opens the default browser.
// Build: copy ../../Quest2_release/index.html here, then `go build -ldflags "-s -w" -o SolarWar.exe`.
package main

import (
	_ "embed"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
)

//go:embed index.html
var page []byte

func main() {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		fmt.Println("서버를 시작할 수 없습니다:", err)
		fmt.Scanln()
		return
	}
	url := fmt.Sprintf("http://%s/", ln.Addr())
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(page)
	})
	fmt.Println("SOLAR WAR — 3D 우주 전쟁")
	fmt.Println("브라우저에서 게임이 열립니다:", url)
	fmt.Println("이 창을 닫으면 게임 서버가 종료됩니다.")
	if os.Getenv("SOLARWAR_NO_BROWSER") == "" {
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	}
	http.Serve(ln, nil)
}
