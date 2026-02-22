export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface AiStrategyData {
  name?: string;
  description?: string;
  positionType?: string;
  buyFee?: number;
  sellFee?: number;
  liquidationThreshold?: number;
  takeProfitRatio?: number | null;
  stopLossRatio?: number | null;
  indicatorNews?: AiIndicatorNews[];
  indicators?: AiStrategyIndicator[];
  conditions?: AiStrategyCondition[];
}

export interface AiIndicatorNews {
  name?: string;
  description?: string;
  code?: string;
  parameters?: AiIndicatorParameter[];
}

export interface AiIndicatorParameter {
  name?: string;
  description?: string;
  paramType?: string;
  defaultValue?: string;
}

export interface AiStrategyIndicator {
  indicatorNewsIndex?: number;
  parameters?: Array<{ name?: string; value?: string }>;
}

export interface AiStrategyCondition {
  indicatorIndex?: number;
  comparisonType?: string;
  comparedIndicatorIndex?: number;
  constantValue?: string;
  currentValuePath?: string;
  comparedValuePath?: string;
  operator?: string;
  conditionType?: string;
  action?: string;
  group?: number;
  priority?: number;
  customCode?: string;
}

export interface ValidatedStrategyData {
  name: string;
  description?: string;
  positionType: string;
  buyFee: number;
  sellFee: number;
  liquidationThreshold: number;
  takeProfitRatio: number | null;
  stopLossRatio: number | null;
  indicatorNews: Array<{
    name: string;
    description?: string;
    code: string;
    parameters: Array<{
      name: string;
      description?: string;
      paramType: string;
      defaultValue?: string;
    }>;
  }>;
  indicators: Array<{
    indicatorNewsIndex: number;
    parameters: Array<{ name: string; value: string }>;
  }>;
  conditions: Array<{
    indicatorIndex: number;
    comparisonType: string;
    comparedIndicatorIndex?: number;
    constantValue?: string;
    currentValuePath: string;
    comparedValuePath: string;
    operator: string;
    conditionType: string;
    action: string;
    group: number;
    priority: number;
    customCode: string;
  }>;
}

export class StrategyDataValidator {
  static validateStrategy(data: AiStrategyData): ValidationResult {
    const errors: string[] = [];

    if (!data.name || data.name.trim() === '') {
      errors.push('策略名称(name)不能为空');
    }

    if (!Array.isArray(data.indicatorNews) || data.indicatorNews.length === 0) {
      errors.push('指标定义(indicatorNews)不能为空');
    }

    if (!Array.isArray(data.indicators) || data.indicators.length === 0) {
      errors.push('指标配置(indicators)不能为空');
    }

    if (!Array.isArray(data.conditions) || data.conditions.length === 0) {
      errors.push('交易条件(conditions)不能为空');
    }

    if (data.indicatorNews) {
      data.indicatorNews.forEach((indicator, index) => {
        const indicatorErrors = this.validateIndicatorNews(indicator, index);
        errors.push(...indicatorErrors);
      });
    }

    if (data.indicators) {
      data.indicators.forEach((indicator, index) => {
        const indicatorErrors = this.validateStrategyIndicator(indicator, index);
        errors.push(...indicatorErrors);
      });
    }

    if (data.conditions) {
      data.conditions.forEach((condition, index) => {
        const conditionErrors = this.validateCondition(condition, index);
        errors.push(...conditionErrors);
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateIndicatorNews(indicator: AiIndicatorNews, index: number): string[] {
    const errors: string[] = [];

    if (!indicator.name || indicator.name.trim() === '') {
      errors.push(`指标定义[${index}].name 不能为空`);
    }

    if (!indicator.code || indicator.code.trim() === '') {
      errors.push(`指标定义[${index}].code 不能为空`);
    }

    if (!Array.isArray(indicator.parameters)) {
      errors.push(`指标定义[${index}].parameters 必须是数组`);
    } else {
      indicator.parameters.forEach((param, paramIndex) => {
        if (!param.name || param.name.trim() === '') {
          errors.push(`指标定义[${index}].parameters[${paramIndex}].name 不能为空`);
        }
        if (!param.paramType || !['number', 'string', 'boolean'].includes(param.paramType)) {
          errors.push(`指标定义[${index}].parameters[${paramIndex}].paramType 必须是 number, string 或 boolean`);
        }
      });
    }

    return errors;
  }

  private static validateStrategyIndicator(indicator: AiStrategyIndicator, index: number): string[] {
    const errors: string[] = [];

    if (indicator.indicatorNewsIndex === undefined || indicator.indicatorNewsIndex === null) {
      errors.push(`指标配置[${index}].indicatorNewsIndex 不能为空`);
    }

    if (!Array.isArray(indicator.parameters)) {
      errors.push(`指标配置[${index}].parameters 必须是数组`);
    } else {
      indicator.parameters.forEach((param, paramIndex) => {
        if (!param.name || param.name.trim() === '') {
          errors.push(`指标配置[${index}].parameters[${paramIndex}].name 不能为空`);
        }
        if (param.value === undefined || param.value === null) {
          errors.push(`指标配置[${index}].parameters[${paramIndex}].value 不能为空`);
        }
      });
    }

    return errors;
  }

  private static validateCondition(condition: AiStrategyCondition, index: number): string[] {
    const errors: string[] = [];

    if (condition.indicatorIndex === undefined || condition.indicatorIndex === null) {
      errors.push(`条件[${index}].indicatorIndex 不能为空`);
    }

    if (!condition.comparisonType || !['indicator', 'constant'].includes(condition.comparisonType)) {
      errors.push(`条件[${index}].comparisonType 必须是 indicator 或 constant`);
    }

    if (!condition.operator || !['>', '>=', '==', '!=', '<', '<='].includes(condition.operator)) {
      errors.push(`条件[${index}].operator 必须是 >, >=, ==, !=, < 或 <=`);
    }

    if (!condition.conditionType || !['value', 'crossover'].includes(condition.conditionType)) {
      errors.push(`条件[${index}].conditionType 必须是 value 或 crossover`);
    }

    if (!condition.action || !['buy', 'sell', 'none'].includes(condition.action)) {
      errors.push(`条件[${index}].action 必须是 buy, sell 或 none`);
    }

    if (condition.comparisonType === 'indicator') {
      if (condition.comparedIndicatorIndex === undefined || condition.comparedIndicatorIndex === null) {
        errors.push(`条件[${index}].comparedIndicatorIndex 在 comparisonType='indicator' 时不能为空`);
      }
    }

    if (condition.comparisonType === 'constant') {
      if (condition.constantValue === undefined || condition.constantValue === null) {
        errors.push(`条件[${index}].constantValue 在 comparisonType='constant' 时不能为空`);
      }
    }

    return errors;
  }

  static applyDefaults(data: AiStrategyData): ValidatedStrategyData {
    return {
      name: data.name!,
      description: data.description,
      positionType: data.positionType || 'both',
      buyFee: data.buyFee ?? 0.001,
      sellFee: data.sellFee ?? 0.001,
      liquidationThreshold: data.liquidationThreshold ?? 90,
      takeProfitRatio: data.takeProfitRatio ?? null,
      stopLossRatio: data.stopLossRatio ?? null,
      indicatorNews: data.indicatorNews?.map(indicator => ({
        name: indicator.name!,
        description: indicator.description,
        code: indicator.code!,
        parameters: indicator.parameters?.map(param => ({
          name: param.name!,
          description: param.description,
          paramType: param.paramType!,
          defaultValue: param.defaultValue,
        })) || [],
      })) || [],
      indicators: data.indicators?.map(indicator => ({
        indicatorNewsIndex: indicator.indicatorNewsIndex!,
        parameters: indicator.parameters?.map(param => ({
          name: param.name!,
          value: param.value!,
        })) || [],
      })) || [],
      conditions: data.conditions?.map(condition => ({
        indicatorIndex: condition.indicatorIndex!,
        comparisonType: condition.comparisonType!,
        comparedIndicatorIndex: condition.comparedIndicatorIndex,
        constantValue: condition.constantValue,
        currentValuePath: condition.currentValuePath ?? '',
        comparedValuePath: condition.comparedValuePath ?? '',
        operator: condition.operator!,
        conditionType: condition.conditionType!,
        action: condition.action!,
        group: condition.group ?? 1,
        priority: condition.priority ?? 0,
        customCode: condition.customCode ?? '',
      })) || [],
    };
  }
}
