@echo off
setlocal enabledelayedexpansion

rem Usage: test-nearby.cmd PHONE PASSWORD [BASE_URL] [LOCATION] [RADIUS] [SORT] [CATEGORY] [KEYWORD] [LOG_PATH]
set "PHONE=%~1"
set "PASSWORD=%~2"
set "BASE_URL=%~3"
set "LOCATION=%~4"
set "RADIUS=%~5"
set "SORT=%~6"
set "CATEGORY=%~7"
set "KEYWORD=%~8"
set "LOG_PATH=%~9"

if "%PHONE%"=="" goto :usage
if "%PASSWORD%"=="" goto :usage
if "%BASE_URL%"=="" set "BASE_URL=https://localhost:3000"
if "%LOCATION%"=="" set "LOCATION=113.332596,23.021041"
if "%RADIUS%"=="" set "RADIUS=2000"
if "%SORT%"=="" set "SORT=distance"
if "%CATEGORY%"=="" set "CATEGORY="
if "%KEYWORD%"=="" set "KEYWORD="
if "%LOG_PATH%"=="" set "LOG_PATH=scripts\\test-nearby.log"

set "LOGIN_URL=%BASE_URL%/api/user/login"
set "NEARBY_URL=%BASE_URL%/api/travel/nearby-restaurants?location=%LOCATION%&radius=%RADIUS%&category=%CATEGORY%&keyword=%KEYWORD%&sort=%SORT%"

for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "$body = @{ phone = '%PHONE%'; password = '%PASSWORD%' } | ConvertTo-Json; $res = Invoke-RestMethod -Method Post -Uri '%LOGIN_URL%' -Body $body -ContentType 'application/json'; $res.token"`) do (
  set "TOKEN=%%T"
)

if "%TOKEN%"=="" (
  echo Login failed. Check phone/password.>>"%LOG_PATH%"
  exit /b 1
)

for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set "STAMP=%%S"

(
  echo [%STAMP%] Request: %NEARBY_URL%
) >>"%LOG_PATH%"

echo.
echo Request: %NEARBY_URL%
echo.

curl -s -H "Authorization: Bearer %TOKEN%" "%NEARBY_URL%" >>"%LOG_PATH%"

(
  echo.
  echo ----
) >>"%LOG_PATH%"

exit /b 0

:usage
echo Usage:
echo   scripts\test-nearby.cmd PHONE PASSWORD [BASE_URL] [LOCATION] [RADIUS] [SORT] [CATEGORY] [KEYWORD] [LOG_PATH]
echo Example:
echo   scripts\test-nearby.cmd 13800138000 123456
exit /b 1
