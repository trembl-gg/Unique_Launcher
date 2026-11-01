param(
  [Parameter(Mandatory=$true)][string]$Source,
  [Parameter(Mandatory=$true)][string]$Destination
)
# Format conversion only: retain PNG alpha in standard multi-resolution 32-bit ICO frames.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$image = [Drawing.Image]::FromFile([IO.Path]::GetFullPath($Source))
$sizes = @(16, 24, 32, 48, 64, 128, 256)
$frames = [Collections.Generic.List[byte[]]]::new()
try {
  foreach ($size in $sizes) {
    $bitmap = [Drawing.Bitmap]::new($size, $size, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($image, [Drawing.Rectangle]::new(0, 0, $size, $size))
    $graphics.Dispose()
    $memory = [IO.MemoryStream]::new()
    $writer = [IO.BinaryWriter]::new($memory)
    $maskStride = [int]([Math]::Ceiling($size / 32.0) * 4)
    $writer.Write([int]40); $writer.Write([int]$size); $writer.Write([int]($size * 2))
    $writer.Write([int16]1); $writer.Write([int16]32); $writer.Write([int]0)
    $writer.Write([int]($size * $size * 4 + $maskStride * $size))
    1..4 | ForEach-Object { $writer.Write([int]0) }
    for ($y = $size - 1; $y -ge 0; $y--) {
      for ($x = 0; $x -lt $size; $x++) {
        $color = $bitmap.GetPixel($x, $y)
        $writer.Write([byte]$color.B); $writer.Write([byte]$color.G)
        $writer.Write([byte]$color.R); $writer.Write([byte]$color.A)
      }
    }
    for ($y = $size - 1; $y -ge 0; $y--) {
      $mask = [byte[]]::new($maskStride)
      for ($x = 0; $x -lt $size; $x++) {
        if ($bitmap.GetPixel($x, $y).A -eq 0) {
          $index = [int][Math]::Floor($x / 8.0)
          $mask[$index] = $mask[$index] -bor (128 -shr ($x % 8))
        }
      }
      $writer.Write($mask)
    }
    $frames.Add($memory.ToArray())
    $writer.Dispose(); $memory.Dispose(); $bitmap.Dispose()
  }
  $file = [IO.File]::Create([IO.Path]::GetFullPath($Destination))
  $writer = [IO.BinaryWriter]::new($file)
  try {
    $writer.Write([int16]0); $writer.Write([int16]1); $writer.Write([int16]$sizes.Count)
    $offset = 6 + 16 * $sizes.Count
    for ($i = 0; $i -lt $sizes.Count; $i++) {
      $dimension = [byte]($sizes[$i] % 256)
      $writer.Write($dimension); $writer.Write($dimension); $writer.Write([int16]0)
      $writer.Write([int16]1); $writer.Write([int16]32)
      $writer.Write([int]$frames[$i].Length); $writer.Write([int]$offset)
      $offset += $frames[$i].Length
    }
    foreach ($frame in $frames) { $writer.Write($frame) }
  } finally { $writer.Dispose(); $file.Dispose() }
} finally { $image.Dispose() }
