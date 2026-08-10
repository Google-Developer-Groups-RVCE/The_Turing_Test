@echo off
:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrative Privileges...
    powershell -Command "Start-Process '%~0' -Verb RunAs"
    exit /b
)

echo Adding tt.local and turing-test.local to hosts file...

findstr /v /i "tt.local" C:\Windows\System32\drivers\etc\hosts > "%temp%\hosts.tmp"
copy /Y "%temp%\hosts.tmp" C:\Windows\System32\drivers\etc\hosts > nul
echo 127.0.0.1 tt.local >> C:\Windows\System32\drivers\etc\hosts

findstr /v /i "turing-test.local" C:\Windows\System32\drivers\etc\hosts > "%temp%\hosts.tmp"
copy /Y "%temp%\hosts.tmp" C:\Windows\System32\drivers\etc\hosts > nul
echo 127.0.0.1 turing-test.local >> C:\Windows\System32\drivers\etc\hosts

echo Done! You can now visit:
echo   - http://tt.local
echo   - http://turing-test.local
pause
