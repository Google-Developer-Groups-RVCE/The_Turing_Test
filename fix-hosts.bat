@echo off
echo Removing old turing-test.local entries from hosts file...
findstr /v /i "turing-test.local" C:\Windows\System32\drivers\etc\hosts > "%temp%\hosts.tmp"
copy /Y "%temp%\hosts.tmp" C:\Windows\System32\drivers\etc\hosts > nul

echo Adding correct 127.0.0.1 turing-test.local to hosts file...
echo 127.0.0.1 turing-test.local >> C:\Windows\System32\drivers\etc\hosts

echo Done! You can now visit http://turing-test.local in your browser.
pause
