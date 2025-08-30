const { VM } = require('vm2');
const path = require('path');

// 获取工作文件路径
const workerFile = process.argv[2];

// 监听主进程消息
process.on('message', (data) => {
  try {
    // 加载工作文件代码
    const code = require('fs').readFileSync(workerFile, 'utf8');
    
    // 创建安全的VM环境
    const vm = new VM({
      timeout: 10*60*1000,
      sandbox: {
        priceData: data.priceData,
        parameters: data.parameters,
        console: {
          log: () => {}, // 禁用控制台输出
        },
        require,
        process: {
          env: process.env
        }
      },
    });

    // 打印调试信息
    console.log('Worker data:', JSON.stringify({
      priceData: !!data.priceData,
      parameters: !!data.parameters,
      parametersContent: data.parameters
    }));

    // 执行代码
    const result = vm.run(`
      (function() {
        console.log('VM sandbox parameters:', JSON.stringify(parameters));
        ${code}
        if (typeof calculate !== 'function') {
          throw new Error('Worker code must export a calculate function');
        }
        return calculate(priceData, parameters);
      })()
    `);

    // 发送结果回主进程
    process.send({ data: result });
  } catch (error) {
    // 发送错误回主进程
    process.send({ error: error.message });
  }
});