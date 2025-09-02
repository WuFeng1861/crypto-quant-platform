import { StrategyIndicator } from '../entities/strategy-indicator.entity';
import { StrategyIndicatorParam } from '../entities/strategy-indicator-param.entity';

export interface StrategyIndicatorWithParams extends StrategyIndicator {
  parameters: StrategyIndicatorParam[];
}