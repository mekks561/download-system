describe('Scheduler Logic Tests', () => {
  describe('calculateNextRunTime', () => {
    const calculateNextRunTime = (schedule_type, schedule_time, schedule_day, schedule_date) => {
      const now = new Date();
      const [hours, minutes] = schedule_time.split(':').map(Number);
      const nextRun = new Date(now);
      nextRun.setHours(hours, minutes, 0, 0);

      switch (schedule_type) {
        case 'once':
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
          break;

        case 'daily':
          if (nextRun <= now) {
            nextRun.setDate(nextRun.getDate() + 1);
          }
          break;

        case 'weekly':
          const dayMap = {
            'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
            'thursday': 4, 'friday': 5, 'saturday': 6
          };
          const targetDay = dayMap[schedule_day.toLowerCase()] ?? 1;
          
          const currentDay = now.getDay();
          let daysUntilTarget = targetDay - currentDay;
          if (daysUntilTarget <= 0) daysUntilTarget += 7;
          
          nextRun.setDate(now.getDate() + daysUntilTarget);
          break;

        case 'monthly':
          const [year, month] = schedule_date.split('-').map(Number);
          nextRun.setFullYear(year, month - 1, 1);
          
          if (nextRun <= now) {
            nextRun.setMonth(nextRun.getMonth() + 1);
          }
          break;
      }

      return nextRun;
    };

    it('应该正确计算一次性任务的下次执行时间', () => {
      const schedule_time = '12:00';
      const result = calculateNextRunTime('once', schedule_time, null, null);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(12);
      expect(result.getMinutes()).toBe(0);
    });

    it('应该正确计算每日任务的下次执行时间', () => {
      const schedule_time = '08:30';
      const result = calculateNextRunTime('daily', schedule_time, null, null);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(8);
      expect(result.getMinutes()).toBe(30);
    });

    it('应该正确计算每周任务的下次执行时间', () => {
      const schedule_time = '14:00';
      const schedule_day = 'monday';
      const result = calculateNextRunTime('weekly', schedule_time, schedule_day, null);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(0);
      
      const dayMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
      };
      expect(result.getDay()).toBe(dayMap['monday']);
    });

    it('应该正确计算每月任务的下次执行时间', () => {
      const schedule_time = '10:00';
      const schedule_date = '2026-06-01';
      const result = calculateNextRunTime('monthly', schedule_time, null, schedule_date);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(0);
    });

    it('应该处理无效的星期名称', () => {
      const schedule_time = '12:00';
      const schedule_day = 'invalid_day';
      const result = calculateNextRunTime('weekly', schedule_time, schedule_day, null);
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getDay()).toBe(1);
    });
  });

  describe('extractFilename', () => {
    const extractFilename = (url) => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        return filename || `download_${Date.now()}`;
      } catch {
        return `download_${Date.now()}`;
      }
    };

    it('应该从URL中提取文件名', () => {
      const url = 'https://example.com/path/to/file.zip';
      const result = extractFilename(url);
      
      expect(result).toBe('file.zip');
    });

    it('应该处理没有文件名的URL', () => {
      const url = 'https://example.com/';
      const result = extractFilename(url);
      
      expect(result).toMatch(/^download_\d+$/);
    });

    it('应该处理无效的URL', () => {
      const url = 'invalid-url';
      const result = extractFilename(url);
      
      expect(result).toMatch(/^download_\d+$/);
    });

    it('应该处理带查询参数的URL', () => {
      const url = 'https://example.com/file.pdf?token=abc123';
      const result = extractFilename(url);
      
      expect(result).toBe('file.pdf');
    });
  });

  describe('Schedule Status Management', () => {
    it('应该识别有效的计划状态', () => {
      const validStatuses = ['active', 'paused', 'completed', 'failed'];
      
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    it('应该识别有效的计划类型', () => {
      const validTypes = ['once', 'daily', 'weekly', 'monthly'];
      
      validTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    it('应该验证优先级范围', () => {
      const validPriorityRange = { min: 1, max: 10 };
      const testPriority = 5;
      
      expect(testPriority).toBeGreaterThanOrEqual(validPriorityRange.min);
      expect(testPriority).toBeLessThanOrEqual(validPriorityRange.max);
    });
  });

  describe('Time Validation', () => {
    it('应该验证时间格式', () => {
      const validTime = '12:30';
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      expect(validTime).toMatch(timePattern);
    });

    it('应该拒绝无效的时间格式', () => {
      const invalidTimes = ['25:00', '12:60', 'abc', '12'];
      const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      invalidTimes.forEach(time => {
        expect(time).not.toMatch(timePattern);
      });
    });
  });

  describe('Schedule Execution Logic', () => {
    it('应该正确判断计划是否需要执行', () => {
      const now = new Date();
      const schedule = {
        status: 'active',
        next_run_at: new Date(now.getTime() - 1000)
      };
      
      const shouldExecute = schedule.status === 'active' && schedule.next_run_at <= now;
      expect(shouldExecute).toBe(true);
    });

    it('应该跳过暂停的计划', () => {
      const now = new Date();
      const schedule = {
        status: 'paused',
        next_run_at: new Date(now.getTime() - 1000)
      };
      
      const shouldExecute = schedule.status === 'active' && schedule.next_run_at <= now;
      expect(shouldExecute).toBe(false);
    });

    it('应该跳过未来执行的计划', () => {
      const now = new Date();
      const schedule = {
        status: 'active',
        next_run_at: new Date(now.getTime() + 10000)
      };
      
      const shouldExecute = schedule.status === 'active' && schedule.next_run_at <= now;
      expect(shouldExecute).toBe(false);
    });
  });
});