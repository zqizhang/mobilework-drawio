param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile,

    [Parameter(Mandatory = $true)]
    [string]$OutputFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InputFile)) {
    throw "Input file is not existed：$InputFile"
}

$outputDirectory = Split-Path -Parent $OutputFile

if ($outputDirectory) {
    New-Item -ItemType Directory -Force $outputDirectory | Out-Null
}

$content = Get-Content $InputFile -Raw -Encoding UTF8

if (
    -not $content.Contains("<mxfile") -and
    -not $content.Contains("<mxGraphModel")
) {
    throw "Input content is invalid draw.io XML"
}

Set-Content `
    -Path $OutputFile `
    -Value $content `
    -Encoding UTF8 `
    -NoNewline

Write-Host "Saved：$OutputFile"