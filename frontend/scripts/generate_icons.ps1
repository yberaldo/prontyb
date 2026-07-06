$iconsPath = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $iconsPath | Out-Null

try {
    Add-Type -AssemblyName System.Drawing
} catch {
    Write-Host "Aviso: System.Drawing não pôde ser carregado. Tentando continuar..."
}

function New-Icon($filePath, $size, $bgR, $bgG, $bgB, $text) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $bg = [System.Drawing.Color]::FromArgb($bgR, $bgG, $bgB)
    $g.Clear($bg)

    $fontName = 'Arial'
    $fontSize = [int]($size * 0.5)
    $font = New-Object System.Drawing.Font($fontName, $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0,0,$size,$size)
    $g.DrawString($text,$font,$brush,$rect,$sf)

    $bmp.Save($filePath,[System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

# Cores baseadas em theme_color #0f766e (15,118,110)
$R=15; $G=118; $B=110

New-Icon (Join-Path $iconsPath 'icon-192.png') 192 $R $G $B 'P'
New-Icon (Join-Path $iconsPath 'icon-512.png') 512 $R $G $B 'P'
New-Icon (Join-Path $iconsPath 'maskable-192.png') 192 $R $G $B 'P'
New-Icon (Join-Path $iconsPath 'maskable-512.png') 512 $R $G $B 'P'

Write-Host 'Ícones gerados em' $iconsPath
