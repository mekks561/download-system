$iconTemplate = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ec4899"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect rx="24" width="128" height="128" fill="url(#bg)"/>
  <text x="64" y="76" font-size="56" text-anchor="middle" fill="white" font-weight="bold">📥</text>
</svg>
'@

$iconTemplate | Out-File -FilePath "icon128.svg" -Encoding utf8

try {
    Add-Type -AssemblyName System.Drawing
} catch {
    Write-Host "System.Drawing assembly not available, using SVG files only"
    exit 0
}

function Convert-SvgToPng {
    param(
        [string]$SvgPath,
        [int]$Size
    )
    
    $pngPath = "icon$Size.png"
    Write-Host "Generating $pngPath..."
    
    try {
        $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::Transparent)
        
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            (New-Object System.Drawing.Point(0, 0)),
            (New-Object System.Drawing.Point($Size, $Size)),
            [System.Drawing.Color]::FromArgb(236, 72, 153),
            [System.Drawing.Color]::FromArgb(139, 92, 246)
        )
        
        $radius = $Size * 0.1875
        $graphics.FillRoundedRectangle($brush, 0, 0, $Size, $Size, $radius)
        
        $font = New-Object System.Drawing.Font("Segoe UI Emoji", $Size * 0.45)
        $format = [System.Drawing.StringFormat]::GenericDefault
        $format.Alignment = [System.Drawing.StringAlignment]::Center
        $format.LineAlignment = [System.Drawing.StringAlignment]::Center
        
        $graphics.DrawString("📥", $font, [System.Drawing.Brushes]::White, 
            (New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)), $format)
        
        $bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $graphics.Dispose()
        $bitmap.Dispose()
        $brush.Dispose()
        $font.Dispose()
        
        Write-Host "✅ Created $pngPath"
    } catch {
        Write-Host "❌ Failed to create $pngPath : $_"
    }
}

Convert-SvgToPng -SvgPath "icon128.svg" -Size 16
Convert-SvgToPng -SvgPath "icon128.svg" -Size 32
Convert-SvgToPng -SvgPath "icon128.svg" -Size 48
Convert-SvgToPng -SvgPath "icon128.svg" -Size 128

Write-Host "`n🎉 Icon generation complete!"
