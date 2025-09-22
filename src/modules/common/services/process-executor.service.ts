import { Injectable } from '@nestjs/common';
import { fork, ChildProcess, Serializable } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import BigNumber from 'bignumber.js';

// 定义消息接口
interface WorkerMessage {
  error?: string;
  data?: any;
}

@Injectable()
export class ProcessExecutorService {
  private readonly workersDir = path.join(process.cwd(), 'src', 'workers');
  private readonly tempDir = path.join(os.tmpdir(), 'crypto-quant-workers');

  constructor() {
    // 确保工作目录存在
    this.ensureDirectoryExists(this.workersDir);
    this.ensureDirectoryExists(this.tempDir);
  }

  /**
   * 在子进程中执行代码
   * @param code 要执行的代码
   * @param data 传递给代码的数据
   * @param timeout 超时时间(毫秒)
   */
  async executeInProcess<T extends Serializable, R>(
    code: string,
    data: T,
    timeout: number = 60000
  ): Promise<R> {
    // 创建临时工作文件
    const workerId = crypto.randomBytes(8).toString('hex');
    const workerFile = path.join(this.tempDir, `worker-${workerId}.js`);
    
    // 如果worker执行器不存在，创建它
    const executorPath = path.join(this.workersDir, 'executor.js');
    console.log(executorPath, fs.existsSync(executorPath), "如果worker执行器不存在，创建它");
    if (!fs.existsSync(executorPath)) {
      this.createExecutorFile(executorPath);
    }

    // 创建临时工作文件
    fs.writeFileSync(workerFile, code);
    console.log(workerFile, code, "创建临时工作文件");
    return new Promise<R>((resolve, reject) => {
      let timeoutId: NodeJS.Timeout;
      let worker: ChildProcess;

      try {
        // 启动子进程
        worker = fork(executorPath, [workerFile]);
        
        // 设置超时
        timeoutId = setTimeout(() => {
          worker.kill();
          fs.unlinkSync(workerFile);
          reject(new Error('Execution timed out'));
        }, timeout);

        // 发送数据到子进程
        worker.send(data);

        // 处理子进程消息
        worker.on('message', (result: WorkerMessage) => {
          clearTimeout(timeoutId);
          worker.kill();
          fs.unlinkSync(workerFile);
          
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result.data as R);
          }
        });

        // 处理子进程错误
        worker.on('error', (err) => {
          clearTimeout(timeoutId);
          worker.kill();
          fs.unlinkSync(workerFile);
          reject(new Error(`Worker process error: ${err.message}`));
        });

        // 处理子进程退出
        worker.on('exit', (code) => {
          if (code !== 0 && code !== null) {
            clearTimeout(timeoutId);
            fs.unlinkSync(workerFile);
            reject(new Error(`Worker process exited with code ${code}`));
          }
        });
      } catch (error) {
        if (worker) worker.kill();
        if (fs.existsSync(workerFile)) fs.unlinkSync(workerFile);
        if (timeoutId) clearTimeout(timeoutId);
        reject(new Error(`Failed to execute in process: ${error.message}`));
      }
    });
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private createExecutorFile(filePath: string): void {
    const executorCode = `
const { VM } = require('vm2');
const path = require('path');
const BigNumber = require('bignumber.js');

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
        },
        // 添加 BigNumber 支持
        BigNumber: BigNumber,
        // 添加常用的数学工具函数
        Math: Math,
        // 添加数组和对象工具
        Array: Array,
        Object: Object,
        // 添加类型检查函数
        isNaN: isNaN,
        isFinite: isFinite,
        parseFloat: parseFloat,
        parseInt: parseInt
      },
    });

    // 打印调试信息
    console.log('Worker data:', JSON.stringify({
      priceData: !!data.priceData,
      parameters: !!data.parameters,
      parametersContent: data.parameters
    }));

    // 执行代码
    const result = vm.run(\`
      (function() {
        console.log('VM sandbox parameters:', JSON.stringify(parameters));
        \${code}
        if (typeof calculate !== 'function') {
          throw new Error('Worker code must export a calculate function');
        }
        return calculate(priceData, parameters);
      })()
    \`);

    // 发送结果回主进程
    process.send({ data: result });
  } catch (error) {
    // 发送错误回主进程
    process.send({ error: error.message });
  }
});
    `;

    this.ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, executorCode);
  }
}