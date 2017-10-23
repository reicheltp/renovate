const dockerfile = require('../../../lib/workers/dep-type/dockerfile');

describe('workers/dep-type/dockerfile', () => {
  describe('.extractDependencies(dockerfile)', () => {
    it('returns the right dependencies', () => {
      const extractedDependencies = dockerfile.extractDependencies(
        `
          # from vendor/image:tag as multistage
          
          from image:tag as build
          
          from vendor/image as release
          
          FROM vendor/image@digest
        `
      );

      console.log(JSON.stringify(extractedDependencies, null, ' '))

      extractedDependencies.should.be.instanceof(Array);
      extractedDependencies.should.have.length(3);
      extractedDependencies.should.deep.equal([{
        depType: 'Dockerfile',
        depName: 'image',
        currentTag: 'tag',
      },{
        depType: 'Dockerfile',
        depName: 'vendor/image',
        currentTag: 'latest',
      },{
        depType: 'Dockerfile',
        depName: 'vendor/image',
        currentDigest: 'digest',
      }])
    });
  });
});
