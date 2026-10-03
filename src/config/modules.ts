import type { DestinationModule } from '../types';

export interface DestinationModuleDef {
  id: DestinationModule;
  label: string;
  emoji: string;
  description: string;
}

export const MODULE_REGISTRY: Record<DestinationModule, DestinationModuleDef> = {
  swiss: {
    id: 'swiss',
    label: '瑞士特色特輯',
    emoji: '🇨🇭',
    description: '啟用馬特洪峰黃金日出指南、Swiss Travel Pass (STP) 省錢看板、德國 Jestetten 跨境退稅試算',
  },
};

/** 檢查旅程是否啟用指定特色模組 */
export function hasModule(modules: string[] | undefined, moduleId: DestinationModule): boolean {
  return Array.isArray(modules) && modules.includes(moduleId);
}
