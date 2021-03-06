const { tryBranchAutomerge } = require('../../../lib/workers/branch/automerge');
const defaultConfig = require('../../../lib/config/defaults').getConfig();
const logger = require('../../_fixtures/logger');

describe('workers/branch/automerge', () => {
  describe('tryBranchAutomerge', () => {
    let config;
    beforeEach(() => {
      config = {
        ...defaultConfig,
        api: {
          getBranchPr: jest.fn(),
          getBranchStatus: jest.fn(),
          mergeBranch: jest.fn(),
        },
        logger,
      };
    });
    it('returns false if not configured for automerge', async () => {
      config.automerge = false;
      expect(await tryBranchAutomerge(config)).toBe('no automerge');
    });
    it('returns false if automergType is pr', async () => {
      config.automerge = true;
      config.automergeType = 'pr';
      expect(await tryBranchAutomerge(config)).toBe('no automerge');
    });
    it('returns false if branch status is not success', async () => {
      config.automerge = true;
      config.automergeType = 'branch-push';
      config.api.getBranchStatus.mockReturnValueOnce('pending');
      expect(await tryBranchAutomerge(config)).toBe('no automerge');
    });
    it('returns false if PR exists', async () => {
      config.api.getBranchPr.mockReturnValueOnce({});
      config.automerge = true;
      config.automergeType = 'branch-push';
      config.api.getBranchStatus.mockReturnValueOnce('success');
      expect(await tryBranchAutomerge(config)).toBe(
        'automerge aborted - PR exists'
      );
    });
    it('returns false if automerge fails', async () => {
      config.automerge = true;
      config.automergeType = 'branch-push';
      config.api.getBranchStatus.mockReturnValueOnce('success');
      config.api.mergeBranch.mockImplementationOnce(() => {
        throw new Error('merge error');
      });
      expect(await tryBranchAutomerge(config)).toBe('failed');
    });
    it('returns true if automerge succeeds', async () => {
      config.automerge = true;
      config.automergeType = 'branch-push';
      config.api.getBranchStatus.mockReturnValueOnce('success');
      expect(await tryBranchAutomerge(config)).toBe('automerged');
    });
  });
});
