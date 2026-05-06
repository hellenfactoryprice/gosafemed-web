$in = Join-Path $PSScriptRoot "..\public\insights\images\covers\post2.png"

Add-Type -AssemblyName System.Drawing

$path = (Resolve-Path $in).Path
$bmp = [System.Drawing.Bitmap]::new($path)
$w = $bmp.Width
$h = $bmp.Height

$refX = [Math]::Min(10, $w - 1)
$refY = [Math]::Min(10, $h - 1)
$sampleW = [Math]::Min(30, $w - $refX)
$sampleH = [Math]::Min(30, $h - $refY)

$r = 0
$g = 0
$b = 0
$n = 0

for ($y = $refY; $y -lt ($refY + $sampleH); $y++) {
  for ($x = $refX; $x -lt ($refX + $sampleW); $x++) {
    $c = $bmp.GetPixel($x, $y)
    $r += $c.R
    $g += $c.G
    $b += $c.B
    $n++
  }
}

$r = [int]($r / $n)
$g = [int]($g / $n)
$b = [int]($b / $n)
$bg = [System.Drawing.Color]::FromArgb($r, $g, $b)

$searchW = [int]([Math]::Floor($w * 0.45))
$searchH = [int]([Math]::Floor($h * 0.35))

$minX = $searchW
$minY = $searchH
$maxX = 0
$maxY = 0
$thr = 65

for ($y = 0; $y -lt $searchH; $y++) {
  for ($x = 0; $x -lt $searchW; $x++) {
    $c = $bmp.GetPixel($x, $y)
    $dr = $c.R - $bg.R
    $dg = $c.G - $bg.G
    $db = $c.B - $bg.B
    $dist = [Math]::Sqrt($dr * $dr + $dg * $dg + $db * $db)
    if ($dist -gt $thr) {
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

if (($maxX -le $minX) -or ($maxY -le $minY)) {
  $bmp.Dispose()
  throw "Could not detect text region; no changes made."
}

$bboxW = $maxX - $minX + 1
$cutX = $minX + [int]([Math]::Floor($bboxW * 0.30))

$minX2 = $cutX
$minY2 = $searchH
$maxX2 = 0
$maxY2 = 0

for ($y = $minY; $y -le $maxY; $y++) {
  for ($x = $minX; $x -le $cutX; $x++) {
    $c = $bmp.GetPixel($x, $y)
    $dr = $c.R - $bg.R
    $dg = $c.G - $bg.G
    $db = $c.B - $bg.B
    $dist = [Math]::Sqrt($dr * $dr + $dg * $dg + $db * $db)
    if ($dist -gt $thr) {
      if ($x -lt $minX2) { $minX2 = $x }
      if ($y -lt $minY2) { $minY2 = $y }
      if ($x -gt $maxX2) { $maxX2 = $x }
      if ($y -gt $maxY2) { $maxY2 = $y }
    }
  }
}

if (($maxX2 -le $minX2) -or ($maxY2 -le $minY2)) {
  $minX2 = $minX
  $minY2 = $minY
  $maxX2 = $cutX
  $maxY2 = $maxY
}

$pad = 6
$rx = [Math]::Max(0, $minX2 - $pad)
$ry = [Math]::Max(0, $minY2 - $pad)
$rw = [Math]::Min($w - $rx, ($maxX2 - $minX2 + 1) + $pad * 2)
$rh = [Math]::Min($h - $ry, ($maxY2 - $minY2 + 1) + $pad * 2)

$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$brush = [System.Drawing.SolidBrush]::new($bg)
$gfx.FillRectangle($brush, $rx, $ry, $rw, $rh)
$gfx.Dispose()
$brush.Dispose()


$tmpPath = [System.IO.Path]::ChangeExtension($path, ".tmp.png")
$bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Move-Item -Path $tmpPath -Destination $path -Force

Write-Output "Patched $in rectangle x=$rx y=$ry w=$rw h=$rh bg=($($bg.R),$($bg.G),$($bg.B))"
