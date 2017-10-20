

async function extractDependencies(){
  logger.debug(`Resolving packageFile ${JSON.stringify(packageFile)}`);

  const strippedComment = packageFile.content.replace(/^(#.*?\n)+/, '');
  const fromMatch = strippedComment.match(/^FROM (.*)\n/);
  if (!fromMatch) {
    logger.debug(
      { content: packageFile.content, strippedComment },
      'No FROM found'
    );
    continue; // eslint-disable-line
  }
  [, packageFile.currentFrom] = fromMatch;
  logger.debug('Adding Dockerfile');
}
