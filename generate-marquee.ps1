Add-Type -AssemblyName System.Drawing

$base = "D:\SOFTWARE\oraculo\extension\icons"
$out = "D:\SOFTWARE\oraculo\extension\store"

# Marquee 1400x560: 5 screenshots en fila
$marquee = New-Object System.Drawing.Bitmap 1400, 560
$g = [System.Drawing.Graphics]::FromImage($marquee)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(255, 14, 116, 144))

$files = @("screenshot1.png", "screenshot2.png", "screenshot3.png", "screenshot4.png", "screenshot5.png")
$imgW = 220
$imgH = 480
$gap = 20
$totalW = 5 * $imgW + 4 * $gap
$startX = [int]((1400 - $totalW) / 2)
$startY = [int]((560 - $imgH) / 2)

for ($i = 0; $i -lt 5; $i++) {
    $path = Join-Path $base $files[$i]
    $src = [System.Drawing.Image]::FromFile($path)
    $x = $startX + $i * ($imgW + $gap)

    # Sombra
    $sb = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 0, 0, 0))
    $g.FillRectangle($sb, ($x+4), ($startY+4), $imgW, $imgH)
    $sb.Dispose()

    # Imagen
    $g.DrawImage($src, $x, $startY, $imgW, $imgH)
    $src.Dispose()
}

$g.Dispose()

# Guardar como PNG (sin alfa - dibujamos sobre fondo opaco)
$marquee.Save((Join-Path $out "marquee.png"), [System.Drawing.Imaging.ImageFormat]::Png)
# También JPEG por si acaso
$marquee.Save((Join-Path $out "marquee.jpg"), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$marquee.Dispose()

Write-Output "marquee.png + marquee.jpg 1400x560 OK"
