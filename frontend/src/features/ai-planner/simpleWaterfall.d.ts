import type { AiScheduleResponse } from '../../api/models'
export function planSimpleWaterfall(input: AiScheduleResponse['scheduleData'], context?: { projectStartDate?: string; deadline?: string }): { schedule: AiScheduleResponse['scheduleData']; planned: boolean }
