param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Phone,
  [string]$Password,
  [string]$Location = "113.332596,23.021041",
  [int]$Radius = 2000,
  [string]$Sort = "distance",
  [string]$Category = "",
  [string]$Keyword = "",
  [string]$LogPath = "scripts\\test-nearby.log"
)

if (-not $Phone -or -not $Password) {
  Write-Error "Phone and Password are required. Example: .\\scripts\\test-nearby.ps1 -Phone 13800138000 -Password 123456"
  exit 1
}

try {
  $loginUri = "$BaseUrl/api/user/login"
  $loginBody = @{ phone = $Phone; password = $Password } | ConvertTo-Json
  $loginRes = Invoke-RestMethod -Method Post -Uri $loginUri -Body $loginBody -ContentType "application/json"

  if (-not $loginRes.success -or -not $loginRes.token) {
    Write-Error ("Login failed: " + ($loginRes.message | Out-String))
    exit 1
  }

  $token = $loginRes.token
  $nearbyUri = "$BaseUrl/api/travel/nearby-restaurants?location=$Location&radius=$Radius&category=$Category&keyword=$Keyword&sort=$Sort"

  $nearbyRes = Invoke-RestMethod -Method Get -Uri $nearbyUri -Headers @{ Authorization = "Bearer $token" }
  $output = $nearbyRes | ConvertTo-Json -Depth 8

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  $header = "[$stamp] Request: $nearbyUri`r`n"
  $header | Out-File -FilePath $LogPath -Encoding UTF8 -Append
  $output | Out-File -FilePath $LogPath -Encoding UTF8 -Append

  $output
} catch {
  $err = $_ | Out-String
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$stamp] ERROR: $err" | Out-File -FilePath $LogPath -Encoding UTF8 -Append
  Write-Error $_
  exit 1
}
