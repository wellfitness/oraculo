Add-Type -AssemblyName System.Drawing

$base = "D:\SOFTWARE\oraculo\extension\icons"
$out = "D:\SOFTWARE\oraculo\extension\store"

# Tile 440x280: 3 screenshots lado a lado
$tile = New-Object System.Drawing.Bitmap 440, 280
$g = [System.Drawing.Graphics]::FromImage($tile)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::FromArgb(255, 14, 116, 144))

$tileFiles = @("screenshot1.png", "screenshot2.png", "screenshot4.png")
$tileX = @(40, 160, 280)
for ($i = 0; $i -lt 3; $i++) {
    $path = Join-Path $base $tileFiles[$i]
    $src = [System.Drawing.Image]::FromFile($path)
    $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 0, 0, 0))
    $g.FillRectangle($sb, ($tileX[$i]+3), 23, 120, 240)
    $sb.Dispose()
    $g.DrawImage($src, $tileX[$i], 20, 120, 240)
    $src.Dispose()
}
$g.Dispose()
$tile.Save((Join-Path $out "tile-small.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$tile.Dispose()
Write-Output "tile-small.jpg 440x280 OK"

# Marquee 1400x560: 5 screenshots en fila
$marquee = New-Object System.Drawing.Bitmap 1400, 560
$gm = [System.Drawing.Graphics]::FromImage($marquee)
$gm.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gm.Clear([System.Drawing.Color]::FromArgb(255, 14, 116, 144))

$allFiles = @("screenshot1.png", "screenshot2.png", "screenshot3.png", "screenshot4.png", "screenshot5.png")
$imgW = 220
$imgH = 480
$gap = 20
$totalW = 5 * $imgW + 4 * $gap
$startX = [int]((1400 - $totalW) / 2)
$startY = [int]((560 - $imgH) / 2)

for ($i = 0; $i -lt 5; $i++) {
    $path = Join-Path $base $allFiles[$i]
    $src = [System.Drawing.Image]::FromFile($path)
    $x = $startX + $i * ($imgW + $gap)
    $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 0, 0))
    $gm.FillRectangle($sb, ($x+4), ($startY+4), $imgW, $imgH)
    $sb.Dispose()
    $gm.DrawImage($src, $x, $startY, $imgW, $imgH)
    $src.Dispose()
}
$gm.Dispose()
$marquee.Save((Join-Path $out "marquee.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$marquee.Dispose()
Write-Output "marquee.jpg 1400x560 OK"
