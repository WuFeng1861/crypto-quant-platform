@echo off
echo ========================================
echo   Crypto Quant Platform Test Scripts
echo ========================================
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未找到 Node.js
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查是否安装了依赖
if not exist node_modules (
    echo 📦 安装依赖...
    npm install
    echo.
)

REM 显示菜单
:menu
echo 请选择测试模式:
echo 1. 快速测试 (推荐)
echo 2. 单个测试
echo 3. 多场景测试
echo 4. 性能测试
echo 5. 运行所有测试
echo 6. 退出
echo.
set /p choice=请输入选择 (1-6): 

if "%choice%"=="1" (
    echo.
    echo 🚀 运行快速测试...
    node quick-test.js
    goto end
)

if "%choice%"=="2" (
    echo.
    echo 🔍 运行单个测试...
    node test-calculate-with-price-data.js single
    goto end
)

if "%choice%"=="3" (
    echo.
    echo 🎯 运行多场景测试...
    node test-calculate-with-price-data.js multiple
    goto end
)

if "%choice%"=="4" (
    echo.
    echo ⚡ 运行性能测试...
    node test-calculate-with-price-data.js performance
    goto end
)

if "%choice%"=="5" (
    echo.
    echo 🎪 运行所有测试...
    node test-calculate-with-price-data.js all
    goto end
)

if "%choice%"=="6" (
    echo 👋 再见!
    exit /b 0
)

echo ❌ 无效选择，请重新输入
echo.
goto menu

:end
echo.
echo ✅ 测试完成!
pause