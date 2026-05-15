$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$public = Join-Path $repoRoot 'public'

$filesToScan = @(
  (Join-Path $public 'index.html'),
  (Join-Path $public 'insights\insight.html'),
  (Join-Path $public 'sitemap.xml')
)

foreach ($p in $filesToScan) {
  if (-not (Test-Path $p)) {
    throw "Missing file: $p"
  }
}

$allContent = ($filesToScan | ForEach-Object { Get-Content -Raw $_ }) -join "`n"

if ($allContent -match '\.html') {
  Write-Error "Found '.html' in scanned files (expected none)."
}

$hrefs = @()
foreach ($p in $filesToScan) {
  $c = Get-Content -Raw $p
  $hrefs += ([regex]::Matches($c, 'href\s*=\s*"([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
}

$targets = $hrefs |
  Where-Object { $_ -match '^/(insights/(post\d+|insight)|products/(products|immobilization))$' } |
  Sort-Object -Unique

$missing = New-Object System.Collections.Generic.List[string]
foreach ($t in $targets) {
  if ($t -match '^/insights/post(\d+)$') {
    $id = $Matches[1]
    $path = Join-Path $public ("insights\\post{0}.html" -f $id)
    if (-not (Test-Path $path)) { $missing.Add("$t => $path") }
    continue
  }

  if ($t -eq '/insights/insight') {
    $path = Join-Path $public 'insights\\insight.html'
    if (-not (Test-Path $path)) { $missing.Add("$t => $path") }
    continue
  }

  if ($t -eq '/products/products') {
    $path = Join-Path $public 'products\\products.html'
    if (-not (Test-Path $path)) { $missing.Add("$t => $path") }
    continue
  }

  if ($t -eq '/products/immobilization') {
    $path = Join-Path $public 'products\\immobilization.html'
    if (-not (Test-Path $path)) { $missing.Add("$t => $path") }
    continue
  }
}

if ($missing.Count -gt 0) {
  Write-Host 'Missing target files for clean URLs:'
  $missing | ForEach-Object { Write-Host "- $_" }
  exit 1
}

Write-Host 'OK: Clean URLs in key pages map to existing .html files and no .html appears in those pages.'
Write-Host ('Checked targets: ' + ($targets -join ', '))

