[CmdletBinding(SupportsShouldProcess = $true)]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$bundleRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$projectRoot = [IO.Path]::GetFullPath((Join-Path $bundleRoot '../..'))
$projectPrefix = $projectRoot.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
$manifestPath = Join-Path $bundleRoot 'manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json

function Get-SafeProjectPath([string]$RelativePath) {
    if ([IO.Path]::IsPathRooted($RelativePath)) { throw "Absolute manifest path: $RelativePath" }
    $target = [IO.Path]::GetFullPath((Join-Path $projectRoot $RelativePath))
    if (-not $target.StartsWith($projectPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path outside project: $RelativePath"
    }
    $parent = $target
    while ($parent -ne $projectRoot) {
        if (Test-Path -LiteralPath $parent) {
            $item = Get-Item -LiteralPath $parent -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw "Refusing to follow a link or junction: $parent"
            }
        }
        $parent = Split-Path -Parent $parent
    }
    return $target
}

# Validate all paths and hashes before deleting any files. Edited files stop removal.
$targets = @()
foreach ($entry in $manifest.files) {
    $target = Get-SafeProjectPath $entry.path
    if (Test-Path -LiteralPath $target) {
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw "Not a file: $target" }
        $hasher = [Security.Cryptography.SHA256]::Create()
        $stream = [IO.File]::OpenRead($target)
        try {
            $actualHash = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '')
        } finally {
            $stream.Dispose()
            $hasher.Dispose()
        }
        if ($actualHash -ne $entry.sha256) {
            throw "Modified installed file: $($entry.path). Back it up and restore the installed version before uninstalling. Nothing has been removed."
        }
        $targets += $target
    }
}

foreach ($target in $targets) {
    if ($PSCmdlet.ShouldProcess($target, 'Remove installed ECC file')) {
        Remove-Item -LiteralPath $target -Force
    }
}
if ($PSCmdlet.ShouldProcess($manifestPath, 'Remove ECC installation manifest')) {
    Remove-Item -LiteralPath $manifestPath -Force
}

# Remove only empty directories we own; unrelated files and learned skills survive.
foreach ($relativeDirectory in ($manifest.directories | Sort-Object Length -Descending)) {
    $directory = Get-SafeProjectPath $relativeDirectory
    if ((Test-Path -LiteralPath $directory -PathType Container) -and
        @(Get-ChildItem -LiteralPath $directory -Force).Count -eq 0) {
        if ($PSCmdlet.ShouldProcess($directory, 'Remove empty ECC directory')) {
            Remove-Item -LiteralPath $directory -Force
        }
    }
}
Write-Output 'ECC uninstall finished. Untracked files were preserved. With -WhatIf, no files were changed.'
