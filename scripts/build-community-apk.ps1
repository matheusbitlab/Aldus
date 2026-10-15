$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $projectPath
try {
    $branchName = (git branch --show-current).Trim()
    if ($branchName -ne 'integration/comunidade-literaria') { throw 'Build Community exige integration/comunidade-literaria.' }
    $commitHash = (git rev-parse HEAD).Trim()
    $shortHash = (git rev-parse --short HEAD).Trim()
    $pendingCode = git diff --name-only HEAD -- app src/community scripts/build-community-apk.ps1
    if ($pendingCode) { throw 'Commit o código da Community antes de gerar o APK identificado por hash.' }
    $buildStarted = Get-Date
    # Explicit path: this Windows environment excludes cwd from executable lookup.
    $gradleWrapper = Join-Path $projectPath 'android/gradlew.bat'
    $previousNodeEnv = $env:NODE_ENV
    Push-Location -LiteralPath (Join-Path $projectPath 'android')
    try {
        if (!$env:NODE_ENV) { $env:NODE_ENV = 'production' }
        # Native stderr may contain Gradle warnings; the exit code decides success.
        $ErrorActionPreference = 'Continue'
        & $gradleWrapper :app:assembleRelease --console=plain
        $buildExit = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = 'Stop'
        $env:NODE_ENV = $previousNodeEnv
        Pop-Location
    }
    if ($buildExit -ne 0) { throw 'Build Android falhou.' }
    if ((git rev-parse HEAD).Trim() -ne $commitHash) { throw 'HEAD mudou durante o build. Não atribuir APK ao hash anterior.' }
    $sourcePath = Join-Path $projectPath 'android/app/build/outputs/apk/release/app-release.apk'
    if (!(Test-Path -LiteralPath $sourcePath)) { throw 'APK release ausente.' }
    $outputPath = Join-Path $projectPath 'artifacts/apk'
    New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
    $apkPath = Join-Path $outputPath "Aldus-community-$shortHash.apk"
    Copy-Item -LiteralPath $sourcePath -Destination $apkPath
    if (!(git check-ignore -- $apkPath)) { throw 'APK deve estar ignorado pelo Git.' }
    $buildTools = Get-ChildItem -LiteralPath (Join-Path $env:ANDROID_HOME 'build-tools') -Directory | Sort-Object Name -Descending | Select-Object -First 1
    $signerPath = Join-Path $buildTools.FullName 'apksigner.bat'
    & $signerPath verify --verbose $apkPath
    if ($LASTEXITCODE -ne 0) { throw 'Assinatura APK inválida.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($apkPath)
    try {
        $bundle = $zip.GetEntry('assets/index.android.bundle')
        if (!$bundle) { throw 'Bundle Android ausente no APK.' }
        $stream = $bundle.Open()
        $buffer = New-Object IO.MemoryStream
        try { $stream.CopyTo($buffer); $bundleBytes = $buffer.ToArray() }
        finally { $stream.Dispose(); $buffer.Dispose() }
        $bundleText = [Text.Encoding]::UTF8.GetString($bundleBytes)
        foreach ($marker in @('@aldus/community.v1:', 'snapshot:finish:', 'BOOK_STARTED')) {
            if (!$bundleText.Contains($marker)) { throw "Bundle não contém marcador Community: $marker" }
        }
    } finally { $zip.Dispose() }
    $file = Get-Item -LiteralPath $apkPath
    $report = [ordered]@{
        branch = $branchName; commit = $commitHash; file = $file.Name; path = $file.FullName
        bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $apkPath -Algorithm SHA256).Hash
        buildStarted = $buildStarted.ToString('o'); artifactModified = $file.LastWriteTime.ToString('o')
        signature = 'PASS'; communityBundleMarkers = 'PASS'; installed = $false; physicalValidation = 'NAO TESTADO'
    }
    $jsonPath = Join-Path $outputPath "Aldus-community-$shortHash.json"
    $report | ConvertTo-Json | Set-Content -LiteralPath $jsonPath -Encoding UTF8
    $report | ConvertTo-Json
} finally { Pop-Location }
