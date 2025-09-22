@echo off
echo 📊 指标计算工具
echo.

if "%1"=="" (
    echo 用法: calculate-indicators.bat [calculate^|preset^|list^|info^|params^|symbol^|status] [参数]
    echo.
    echo 示例:
    echo   calculate-indicators.bat calculate                    - 使用默认配置计算指标
    echo   calculate-indicators.bat calculate example-config.json - 使用自定义配置计算
    echo   calculate-indicators.bat preset ma                    - 使用移动平均线预设
    echo   calculate-indicators.bat list                         - 列出所有指标
    echo   calculate-indicators.bat info 1                       - 获取指标1详情
    echo   calculate-indicators.bat params 1                     - 获取指标1参数
    echo   calculate-indicators.bat symbol symbol-config.json    - 使用交易对符号计算
    echo   calculate-indicators.bat status                       - 检查服务状态
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
node calculate-with-price-data.js %*

if errorlevel 1 (
    echo.
    echo ❌ 执行失败，请检查错误信息
    pause
)