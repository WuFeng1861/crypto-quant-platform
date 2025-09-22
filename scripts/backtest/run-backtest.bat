@echo off
echo 📊 加密货币量化回测工具
echo.

if "%1"=="" (
    echo 用法: run-backtest.bat [run^|list^|get^|status] [参数]
    echo.
    echo 示例:
    echo   run-backtest.bat run                    - 使用默认配置执行回测
    echo   run-backtest.bat run example-config.json - 使用自定义配置执行回测
    echo   run-backtest.bat list                   - 列出所有回测记录
    echo   run-backtest.bat get abc123             - 获取特定回测结果
    echo   run-backtest.bat status                 - 检查服务状态
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"
node run-backtest.js %*

if errorlevel 1 (
    echo.
    echo ❌ 执行失败，请检查错误信息
    pause
)