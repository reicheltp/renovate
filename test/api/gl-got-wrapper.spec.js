const get = require('../../lib/api/gl-got-wrapper');
const glGot = require('gl-got');

jest.mock('gl-got');

describe('api/gl-got-wrapper', () => {
  const body = ['a', 'b'];
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it('paginates', async () => {
    glGot.mockReturnValueOnce({
      headers: {
        link:
          '<https://api.gitlab.com/search/code?q=addClass+user%3Amozilla&page=2>; rel="next", <https://api.gitlab.com/search/code?q=addClass+user%3Amozilla&page=34>; rel="last"',
      },
      body: ['a'],
    });
    glGot.mockReturnValueOnce({
      headers: {
        link:
          '<https://api.gitlab.com/search/code?q=addClass+user%3Amozilla&page=3>; rel="next", <https://api.gitlab.com/search/code?q=addClass+user%3Amozilla&page=34>; rel="last"',
      },
      body: ['b', 'c'],
    });
    glGot.mockReturnValueOnce({
      headers: {},
      body: ['d'],
    });
    const res = await get('some-url', { paginate: true });
    expect(res.body).toHaveLength(4);
    expect(glGot.mock.calls).toHaveLength(3);
  });
  it('attempts to paginate', async () => {
    glGot.mockReturnValueOnce({
      headers: {
        link:
          '<https://api.gitlab.com/search/code?q=addClass+user%3Amozilla&page=34>; rel="last"',
      },
      body: ['a'],
    });
    glGot.mockReturnValueOnce({
      headers: {},
      body: ['b'],
    });
    const res = await get('some-url', { paginate: true });
    expect(res.body).toHaveLength(1);
    expect(glGot.mock.calls).toHaveLength(1);
  });
  it('posts', async () => {
    glGot.mockImplementationOnce(() => ({
      body,
    }));
    const res = await get.post('some-url');
    expect(res.body).toEqual(body);
  });
});
