const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getScheduleLogs
} = require('../src/controllers/scheduleController');

jest.mock('../src/config/mysql', () => ({
  getPool: jest.fn()
}));

const { getPool } = require('../src/config/mysql');

describe('ScheduleController', () => {
  let mockPool;
  let mockExecute;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockExecute = jest.fn();
    mockPool = { execute: mockExecute };
    getPool.mockResolvedValue(mockPool);

    mockReq = {
      user: { id: 1 },
      params: {},
      body: {},
      query: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('getSchedules', () => {
    it('应该成功获取用户的下载计划列表', async () => {
      const mockSchedules = [
        { id: 1, url: 'https://example.com/file1.zip', status: 'active' },
        { id: 2, url: 'https://example.com/file2.zip', status: 'paused' }
      ];

      mockExecute.mockResolvedValue([mockSchedules]);

      await getSchedules(mockReq, mockRes);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM download_schedules'),
        [1]
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockSchedules
      });
    });

    it('应该处理获取计划列表时的错误', async () => {
      mockExecute.mockRejectedValue(new Error('数据库错误'));

      await getSchedules(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '获取下载计划失败'
      });
    });
  });

  describe('createSchedule', () => {
    it('应该成功创建下载计划', async () => {
      mockReq.body = {
        url: 'https://example.com/file.zip',
        filename: 'file.zip',
        schedule_type: 'daily',
        schedule_time: '12:00',
        priority: 5
      };

      const mockSchedule = { id: 1, url: 'https://example.com/file.zip' };
      mockExecute
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[mockSchedule]]);

      await createSchedule(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '下载计划创建成功',
        data: mockSchedule
      });
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      mockReq.body = {
        filename: 'file.zip'
      };

      await createSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '缺少必填字段'
      });
    });

    it('应该处理创建计划时的错误', async () => {
      mockReq.body = {
        url: 'https://example.com/file.zip',
        schedule_type: 'daily',
        schedule_time: '12:00'
      };

      mockExecute.mockRejectedValue(new Error('数据库错误'));

      await createSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '创建下载计划失败'
      });
    });
  });

  describe('updateSchedule', () => {
    it('应该成功更新下载计划', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = {
        url: 'https://example.com/newfile.zip',
        status: 'paused'
      };

      const existingSchedule = { 
        id: 1, 
        user_id: 1, 
        url: 'https://example.com/file.zip',
        schedule_type: 'daily',
        schedule_time: '12:00',
        next_run_at: new Date()
      };
      
      const updatedSchedule = { 
        id: 1, 
        url: 'https://example.com/newfile.zip', 
        status: 'paused' 
      };

      mockExecute
        .mockResolvedValueOnce([[existingSchedule]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[updatedSchedule]]);

      await updateSchedule(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '下载计划更新成功',
        data: updatedSchedule
      });
    });

    it('应该拒绝更新不存在的计划', async () => {
      mockReq.params = { id: '999' };
      mockReq.body = { status: 'paused' };

      mockExecute.mockResolvedValueOnce([[]]);

      await updateSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '下载计划不存在'
      });
    });
  });

  describe('deleteSchedule', () => {
    it('应该成功删除下载计划', async () => {
      mockReq.params = { id: '1' };

      mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      await deleteSchedule(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '下载计划删除成功'
      });
    });

    it('应该拒绝删除不存在的计划', async () => {
      mockReq.params = { id: '999' };

      mockExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      await deleteSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '下载计划不存在'
      });
    });
  });

  describe('toggleSchedule', () => {
    it('应该成功暂停下载计划', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { action: 'pause' };

      const existingSchedule = { id: 1, user_id: 1, status: 'active' };
      const pausedSchedule = { id: 1, status: 'paused' };

      mockExecute
        .mockResolvedValueOnce([[existingSchedule]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[pausedSchedule]]);

      await toggleSchedule(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '下载计划暂停成功',
        data: pausedSchedule
      });
    });

    it('应该成功启用下载计划', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { action: 'resume' };

      const existingSchedule = { id: 1, user_id: 1, status: 'paused' };
      const activeSchedule = { id: 1, status: 'active' };

      mockExecute
        .mockResolvedValueOnce([[existingSchedule]])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([[activeSchedule]]);

      await toggleSchedule(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '下载计划启用成功',
        data: activeSchedule
      });
    });

    it('应该拒绝无效的操作', async () => {
      mockReq.params = { id: '1' };
      mockReq.body = { action: 'invalid' };

      mockExecute.mockResolvedValueOnce([[{ id: 1, user_id: 1 }]]);

      await toggleSchedule(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '无效的操作'
      });
    });
  });

  describe('getScheduleLogs', () => {
    it('应该成功获取执行日志', async () => {
      mockReq.params = { schedule_id: '1' };
      mockReq.query = { limit: '50' };

      const mockLogs = [
        { id: 1, schedule_id: 1, status: 'success', executed_at: '2026-05-31' },
        { id: 2, schedule_id: 1, status: 'failed', executed_at: '2026-05-30' }
      ];

      mockExecute.mockResolvedValue([mockLogs]);

      await getScheduleLogs(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockLogs
      });
    });

    it('应该在没有schedule_id时获取所有日志', async () => {
      mockReq.params = {};
      mockReq.query = { limit: '100' };

      const mockLogs = [
        { id: 1, status: 'success' },
        { id: 2, status: 'failed' }
      ];

      mockExecute.mockResolvedValue([mockLogs]);

      await getScheduleLogs(mockReq, mockRes);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = ?'),
        expect.arrayContaining([1])
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockLogs
      });
    });
  });
});