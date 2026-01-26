param(
  [string]$Message = "update"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name"
  }
}

Require-Command git

Push-Location -LiteralPath (Resolve-Path "$PSScriptRoot\..")
try {
  $remote = git remote get-url origin 2>$null
  if (-not $remote) {
    throw "Remote 'origin' not found. Run: git remote add origin https://github.com/Focusmee/TasteMap.git"
  }

  $branch = (git rev-parse --abbrev-ref HEAD).Trim()
  if (-not $branch -or $branch -eq "HEAD") {
    throw "No active branch. Create one with: git checkout -b main"
  }

  git status -sb

  git add -A

  $hasChanges = -not (git diff --cached --quiet)
  if ($hasChanges) {
    git commit -m $Message
  } else {
    Write-Host "No staged changes to commit."
  }

  $hasUpstream = git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null
  if (-not $hasUpstream) {
    git push -u origin $branch
  } else {
    git push
  }
} finally {
  Pop-Location
}
