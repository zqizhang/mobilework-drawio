param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile,

    [Parameter(Mandatory = $true)]
    [ValidateSet("png", "svg", "pdf", "jpg")]
    [string]$Format,

    [string]$OutputDirectory = "exports"
)

$ErrorActionPreference = "Stop"

$Image = "rlespinasse/drawio-export:v4.52.0"
$Workspace = (Get-Location).Path

# 解析输入文件
$InputAbsolute = (Resolve-Path $InputFile).Path

if (-not $InputAbsolute.StartsWith(
    $Workspace,
    [System.StringComparison]::OrdinalIgnoreCase
)) {
    throw "The input file must be located in the current workspace：$InputAbsolute"
}

# 创建输出目录
$OutputAbsolute = Join-Path $Workspace $OutputDirectory
New-Item -ItemType Directory -Force $OutputAbsolute | Out-Null

# 转换为容器路径
$RelativeInput = $InputAbsolute.Substring($Workspace.Length)
$RelativeInput = $RelativeInput.TrimStart("\", "/")
$RelativeInput = $RelativeInput -replace "\\", "/"

$RelativeOutput = $OutputAbsolute.Substring($Workspace.Length)
$RelativeOutput = $RelativeOutput.TrimStart("\", "/")
$RelativeOutput = $RelativeOutput -replace "\\", "/"

$ContainerInput = "/data/$RelativeInput"
$ContainerOutput = "/data/$RelativeOutput"

$BaseName = [System.IO.Path]::GetFileNameWithoutExtension($InputAbsolute)
$ExpectedOutput = Join-Path $OutputAbsolute "$BaseName.$Format"

Write-Host "[drawio-export] input=$InputAbsolute"
Write-Host "[drawio-export] format=$Format"
Write-Host "[drawio-export] expected=$ExpectedOutput"
Write-Host "[drawio-export] image=$Image"

# 删除旧文件，避免把历史结果误判为本次成功
Get-ChildItem `
    -Path $OutputAbsolute `
    -Filter "$BaseName*.$Format" `
    -File `
    -ErrorAction SilentlyContinue |
    Remove-Item -Force

docker run --rm `
    -v "${Workspace}:/data" `
    $Image `
    --format $Format `
    --output $ContainerOutput `
    $ContainerInput

$DockerExitCode = $LASTEXITCODE

# draw.io 多页面导出时，文件名可能自动附加页面名称：
# order-flow-订单流程.png
# 因此不能只检查 order-flow.png
$Candidates = Get-ChildItem `
    -Path $OutputAbsolute `
    -Filter "$BaseName*.$Format" `
    -File `
    -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

if ($Candidates.Count -gt 0) {
    $ActualOutput = $Candidates[0].FullName

    $Result = @{
        success        = $true
        method         = "Docker via tools/export-drawio.ps1"
        format         = $Format
        output         = $ActualOutput
        dockerExitCode = $DockerExitCode
    }

    Write-Output ($Result | ConvertTo-Json -Compress)
    exit 0
}

$ExistingFiles = Get-ChildItem `
    -Path $OutputAbsolute `
    -File `
    -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty FullName

throw @"
Docker export failed.
Docker exit code: $DockerExitCode
Expected file pattern: $BaseName*.$Format
Output directory: $OutputAbsolute
Existing files:
$($ExistingFiles -join "`n")
"@