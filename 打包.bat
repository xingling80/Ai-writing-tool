@echo off
chcp 65001 >nul
echo ========================================
echo   AI写作工具 - 打包发布脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 设置环境变量...
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_CACHE=%USERPROFILE%\.electron-cache
set PATH=C:\Windows\System32\WindowsPowerShell\v1.0;%PATH%

echo.
echo 选择操作:
echo   1. 仅打包（本地测试用）
echo   2. 打包并发布到GitHub（需要GitHub Token）
echo.
set /p choice="请输入选项 (1/2): "

if "%choice%"=="1" (
    echo.
    echo [2/4] 开始打包...
    call npx electron-builder --win
    goto :check_result
)

if "%choice%"=="2" (
    echo.
    set /p token="请输入GitHub Token (ghp_xxx): "
    set GH_TOKEN=%token%
    echo.
    echo [2/4] 开始打包并发布...
    call npx electron-builder --win --publish always
    goto :check_result
)

echo 无效选项
pause
exit /b 1

:check_result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [3/4] 打包成功！
    echo 安装包位置: dist\AI写作工具 Setup %npm_package_version%.exe
    echo 免安装版位置: dist\win-unpacked\AI写作工具.exe
    echo.
    if "%choice%"=="2" (
        echo [4/4] 已发布到GitHub Releases！
        echo 用户启动应用时会自动检测到新版本并提示更新。
    ) else (
        echo [4/4] 提醒: 修改 package.json 中的 version 字段可更新版本号
    )
    echo.
) else (
    echo.
    echo [错误] 打包失败，请检查错误信息。
)

echo.
pause
