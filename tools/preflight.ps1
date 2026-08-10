# =============================================================================
# Country Fit — pre-deploy preflight check
#
#   .\tools\preflight.ps1
#
# Bluehost serves from a case-SENSITIVE Linux filesystem. Windows and git
# (core.ignorecase=true) are both case-INSENSITIVE, so a filename whose case
# doesn't match its reference works perfectly on this machine and 404s in
# production. That exact bug shipped nine broken carousel images.
#
# Test-Path cannot catch it — it is case-insensitive too. This compares against
# the real directory listing instead.
#
# Run this before every FTP upload.
# =============================================================================

$ErrorActionPreference = 'Stop'
$repo  = Split-Path -Parent $PSScriptRoot
$html  = Join-Path $repo 'index.html'

if (-not (Test-Path $html)) { throw "index.html not found at $html" }

$content = Get-Content $html -Raw
$problems = 0
$checked  = 0

# ---- collect local asset references -----------------------------------------
$refs = [System.Collections.Generic.HashSet[string]]::new()

# src="..." and href="..." pointing at local paths
foreach ($m in [regex]::Matches($content, '(?:src|href)\s*=\s*"([^"]+)"')) {
    $v = $m.Groups[1].Value
    if ($v -match '^(https?:|mailto:|tel:|sms:|data:|#|//)') { continue }
    $refs.Add($v.Split('?')[0].Split('#')[0]) | Out-Null
}

# srcset="path 480w, path 960w"
foreach ($m in [regex]::Matches($content, 'srcset\s*=\s*"([^"]+)"')) {
    foreach ($part in $m.Groups[1].Value.Split(',')) {
        $p = $part.Trim().Split(' ')[0]
        if ($p -and $p -notmatch '^(https?:|data:)') {
            $refs.Add($p.Split('?')[0]) | Out-Null
        }
    }
}

# url(...) inside the stylesheet, resolved relative to css/
$cssPath = Join-Path $repo 'css\styles.css'
if (Test-Path $cssPath) {
    $css = Get-Content $cssPath -Raw
    foreach ($m in [regex]::Matches($css, "url\(\s*['""]?([^'"")]+)['""]?\s*\)")) {
        $v = $m.Groups[1].Value.Trim()
        if ($v -match '^(https?:|data:)') { continue }
        # css/styles.css -> ../assets/x  =>  assets/x
        $resolved = ($v -replace '^\.\./', '')
        $refs.Add($resolved.Split('?')[0]) | Out-Null
    }
}

Write-Host ""
Write-Host "Preflight: $($refs.Count) local asset reference(s)" -ForegroundColor Cyan
Write-Host ""

foreach ($ref in ($refs | Sort-Object)) {
    $checked++
    $rel  = $ref -replace '/', '\'
    $full = Join-Path $repo $rel
    $dir  = Split-Path $full -Parent
    $leaf = Split-Path $full -Leaf

    if (-not (Test-Path $dir)) {
        Write-Host "  MISSING DIR   $ref" -ForegroundColor Red
        $problems++
        continue
    }

    # Case-exact comparison against the real listing. -ceq is case-sensitive.
    $actual = Get-ChildItem -LiteralPath $dir -File |
              Where-Object { $_.Name -ceq $leaf } |
              Select-Object -First 1

    if ($actual) {
        Write-Host "  ok            $ref" -ForegroundColor DarkGray
        continue
    }

    $insensitive = Get-ChildItem -LiteralPath $dir -File |
                   Where-Object { $_.Name -ieq $leaf } |
                   Select-Object -First 1

    if ($insensitive) {
        Write-Host "  CASE MISMATCH $ref" -ForegroundColor Red
        Write-Host "                on disk: $($insensitive.Name)  -- will 404 on Bluehost" -ForegroundColor Yellow
    } else {
        Write-Host "  MISSING FILE  $ref" -ForegroundColor Red
    }
    $problems++
}

# ---- git index case check ---------------------------------------------------
# Disk can be right while the committed name is wrong; the deploy may come from
# a clone rather than this working tree.
Push-Location $repo
try {
    $tracked = @(git ls-files 'assets/*')
    foreach ($t in $tracked) {
        $diskPath = Join-Path $repo ($t -replace '/', '\')
        $dir  = Split-Path $diskPath -Parent
        $leaf = Split-Path $diskPath -Leaf
        if (-not (Test-Path $dir)) { continue }
        $exact = Get-ChildItem -LiteralPath $dir -File |
                 Where-Object { $_.Name -ceq $leaf } | Select-Object -First 1
        if (-not $exact) {
            Write-Host "  GIT CASE      $t  (differs from disk)" -ForegroundColor Red
            $problems++
        }
    }
} finally { Pop-Location }

Write-Host ""
if ($problems -eq 0) {
    Write-Host "PASS - $checked reference(s), no case or path problems." -ForegroundColor Green
    exit 0
}
Write-Host "FAIL - $problems problem(s) found. Fix before uploading." -ForegroundColor Red
exit 1
