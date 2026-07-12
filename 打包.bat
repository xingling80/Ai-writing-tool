@echo off
chcp 65001 >nul
echo ========================================
echo   AI写作工具 - 打包发布脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 设置环境变量...
:: 使用项目内的缓存目录，避免权限问题
set ELECTRON_CACHE=%~dp0.electron-cache
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
set PATH=C:\Windows\System32\WindowsPowerShell\v1.0;%PATH%

:: 从 .env 文件读取 GitHub Token
if exist "%~dp0.env" (
    for /f "tokens=1,2 delims==" %%a in (%~dp0.env) do (
        if "%%a"=="GH_TOKEN" set GH_TOKEN=%%b
    )
    echo GitHub Token: 已从 .env 文件读取
) else (
    echo GitHub Token: 未找到 .env 文件
)

echo.
echo 选择操作:
echo   1. 仅打包（本地测试用）
echo   2. 打包并发布到GitHub（自动更新推送）
echo.
set /p choice="请输入选项 (1/2): "

if "%choice%"=="1" (
    echo.
    echo [2/5] 清理旧的构建产物...
    if exist "%~dp0dist" rmdir /s /q "%~dp0dist" 2>nul
    echo [3/5] 开始打包...
    call npx electron-builder --win
    goto :check_result
)

if "%choice%"=="2" (
    if "%GH_TOKEN%"=="" (
        echo.
        echo [错误] 未配置 GitHub Token！
        echo 请在项目根目录创建 .env 文件，内容为:
        echo   GH_TOKEN=ghp_你的token
        echo.
        pause
        exit /b 1
    )
    echo.
    echo [2/5] 清理旧的构建产物...
    if exist "%~dp0dist" rmdir /s /q "%~dp0dist" 2>nul
    echo [3/5] 开始打包并发布到 GitHub...
    call npx electron-builder --win --publish always
    goto :check_result
)

echo 无效选项
pause
exit /b 1

:check_result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [4/5] 打包成功！
    echo 安装包位置: dist\AI写作工具 Setup *.exe
    echo 免安装版位置: dist\win-unpacked\AI写作工具.exe
    echo.
    if "%choice%"=="2" (
        echo [5/5] 已发布到 GitHub Releases！
        echo 用户启动应用时会自动检测到新版本并提示更新。
        echo.
        echo 查看发布: https://github.com/xingling80/Ai-writing-tool/releases
    ) else (
        echo [5/5] 提醒: 发布前需修改 package.json 中的 version 字段
    )
    echo.
) else (
    echo.
    echo [错误] 打包失败，请检查错误信息。
    echo.
    echo 常见问题:
    echo   1. 网络超时 - 确保能访问 github.com 或使用代理
    echo   2. 文件被占用 - 关闭正在运行的 AI写作工具
    echo   3. Token 无效 - 检查 .env 中的 GH_TOKEN 是否正确
)

echo.
pause
