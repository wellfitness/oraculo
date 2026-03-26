Add-Type -AssemblyName System.Drawing

$base = "D:\SOFTWARE\oraculo\extension\icons"
$out = "D:\SOFTWARE\oraculo\extension\store"

# Tile 440x280: 2 screenshots centradas
$tile = New-Object System.Drawing.Bitmap 440, 280
$g = [System.Drawing.Graphics]::FromImage($tile)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(255, 14, 116, 144))

$files = @("screenshot1.png", "screenshot2.png")
$imgH = 250
$imgW = [int](250 * 0.47)  # ~117px manteniendo aspecto
$gap = 20
$totalW = 2 * $imgW + $gap
$startX = [int]((440 - $totalW) / 2)
$startY = [int]((280 - $imgH) / 2)

for ($i = 0; $i -lt 2; $i++) {
    $path = Join-Path $base $files[$i]
    $src = [System.Drawing.Image]::FromFile($path)
    $x = $startX + $i * ($imgW + $gap)

    # Sombra
    $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(50, 0, 0, 0))
    $g.FillRoundedRect($sb, ($x+3), ($startY+3), $imgW, $imgH, 8)
    $g.FillRectangle($sb, ($x+3), ($startY+3), $imgW, $imgH)
    $sb.Dispose()

    # Imagen
    $g.DrawImage($src, $x, $startY, $imgW, $imgH)
    $src.Dispose()
}

$g.Dispose()
$tile.Save((Join-Path $out "tile-small.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$tile.Dispose()
Write-Output "tile-small.jpg 440x280 (2 screenshots) OK"
